const RP_NAME = 'HisabKitab';

function getRpId() {
  return window.location.hostname;
}

export function isBiometricSupported() {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

export async function isBiometricAvailable() {
  if (!isBiometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(userId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: getRpId() },
      user: {
        id: new TextEncoder().encode(userId || 'hisabkitab-user'),
        name: 'HisabKitab User',
        displayName: 'HisabKitab',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  });
  // Return credential ID as a plain array so it can be stored in Zustand persist
  return Array.from(new Uint8Array(cred.rawId));
}

export async function verifyBiometric(credIdArray) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        { type: 'public-key', id: new Uint8Array(credIdArray) },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  // If we reach here the platform authenticator confirmed user presence
  return true;
}
