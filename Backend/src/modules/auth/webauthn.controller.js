const jwt = require('jsonwebtoken');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const prisma = require('../../lib/prisma');
const admin = require('../../config/firebase');

const RP_NAME   = 'HisabKitab';
const RP_ID     = process.env.WEBAUTHN_RP_ID  || 'localhost';
const ORIGIN    = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

// In-memory challenge store with 5-min TTL (use Redis in production)
const challengeStore = new Map();
function storeChallenge(userId, challenge) {
  challengeStore.set(userId, { challenge, exp: Date.now() + 5 * 60 * 1000 });
}
function popChallenge(userId) {
  const entry = challengeStore.get(userId);
  if (!entry) return null;
  challengeStore.delete(userId);
  if (Date.now() > entry.exp) return null;
  return entry.challenge;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challengeStore) if (now > v.exp) challengeStore.delete(k);
}, 60_000);

function issueActionToken(userId) {
  return jwt.sign(
    { userId, scope: 'sensitive-action' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' },
  );
}

// ─── Registration ─────────────────────────────────────────────────────────────

const registrationOptions = async (req, res) => {
  const userId = req.user.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, webauthnCredentials: { select: { credentialId: true, transports: true } } },
  });

  const excludeCredentials = user.webauthnCredentials.map((c) => ({
    id: c.credentialId,
    transports: c.transports,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(userId),
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
    supportedAlgorithmIDs: [-7, -257],
  });

  storeChallenge(userId, options.challenge);
  res.json(options);
};

const registrationVerify = async (req, res) => {
  const userId = req.user.userId;
  const { response, deviceName } = req.body;

  const challenge = popChallenge(userId);
  if (!challenge) return res.status(400).json({ error: 'Challenge expired — please try again' });

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'Biometric verification failed' });
  }

  const { credential } = verification.registrationInfo;

  await prisma.webAuthnCredential.upsert({
    where: { credentialId: credential.id },
    create: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: BigInt(credential.counter),
      transports: response.response?.transports || [],
      deviceName: deviceName || null,
    },
    update: {
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: BigInt(credential.counter),
      deviceName: deviceName || null,
    },
  });

  res.json({ ok: true });
};

// ─── Authentication (returns action token) ────────────────────────────────────

const authOptions = async (req, res) => {
  const userId = req.user.userId;
  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  if (!credentials.length) return res.status(404).json({ error: 'No biometric registered', notRegistered: true });

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: credentials.map((c) => ({ id: c.credentialId, transports: c.transports })),
  });

  storeChallenge(userId, options.challenge);
  res.json(options);
};

const authVerify = async (req, res) => {
  const userId = req.user.userId;
  const { response } = req.body;

  const challenge = popChallenge(userId);
  if (!challenge) return res.status(400).json({ error: 'Challenge expired — please try again' });

  const cred = await prisma.webAuthnCredential.findUnique({ where: { credentialId: response.id } });
  if (!cred || cred.userId !== userId) return res.status(403).json({ error: 'Credential not found' });

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
    credential: {
      id: cred.credentialId,
      publicKey: new Uint8Array(Buffer.from(cred.publicKey, 'base64')),
      counter: Number(cred.counter),
      transports: cred.transports,
    },
  });

  if (!verification.verified) return res.status(401).json({ error: 'Biometric verification failed' });

  await prisma.webAuthnCredential.update({
    where: { credentialId: cred.credentialId },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });

  res.json({ actionToken: issueActionToken(userId), expiresAt: Date.now() + 5 * 60 * 1000 });
};

// ─── Firebase re-auth → action token ─────────────────────────────────────────

const firebaseActionToken = async (req, res) => {
  const { firebaseToken } = req.body;
  if (!firebaseToken) return res.status(400).json({ error: 'Firebase token required' });

  try {
    const decoded = await admin.auth().verifyIdToken(firebaseToken, true); // checkRevoked=true
    const ageSeconds = Math.floor(Date.now() / 1000) - decoded.auth_time;
    if (ageSeconds > 300) {
      return res.status(401).json({ error: 'Token too old — please re-authenticate' });
    }
    if (decoded.uid !== req.user.firebaseUid) {
      return res.status(403).json({ error: 'Token does not match current user' });
    }
    res.json({ actionToken: issueActionToken(req.user.userId), expiresAt: Date.now() + 5 * 60 * 1000 });
  } catch {
    res.status(401).json({ error: 'Firebase token invalid or expired' });
  }
};

// ─── List registered biometrics ───────────────────────────────────────────────

const listCredentials = async (req, res) => {
  const creds = await prisma.webAuthnCredential.findMany({
    where: { userId: req.user.userId },
    select: { id: true, deviceName: true, createdAt: true, transports: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(creds);
};

const removeCredential = async (req, res) => {
  const cred = await prisma.webAuthnCredential.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!cred) return res.status(404).json({ error: 'Not found' });
  await prisma.webAuthnCredential.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

module.exports = {
  registrationOptions, registrationVerify,
  authOptions, authVerify,
  firebaseActionToken,
  listCredentials, removeCredential,
};
