import { createHash, randomBytes } from 'node:crypto';
import { insertSession, findActiveSession, touchSession, deleteSession } from './auth/queries.js';

const COOKIE_NAME = 'session';
const IDLE_DAYS = 30;
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: IDLE_DAYS * 24 * 60 * 60 * 1000,
};

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readSessionToken(req) {
  const cookieHeader = req.headers.cookie ?? '';
  for (const pair of cookieHeader.split(';')) {
    const [name, value] = pair.trim().split('=');
    if (name === COOKIE_NAME) return value;
  }
  return null;
}

export async function startSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  await insertSession(userId, hashToken(token));
  res.cookie(COOKIE_NAME, token, cookieOptions);
}

export async function endSession(req, res) {
  await deleteSession(req.sessionId);
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

export async function requireAuth(req, res, next) {
  const token = readSessionToken(req);
  const session = token ? await findActiveSession(hashToken(token), IDLE_DAYS) : null;
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  // The cookie is re-sent with the touch so it expires in step with the session.
  if (session.needs_touch) {
    await touchSession(session.session_id);
    res.cookie(COOKIE_NAME, token, cookieOptions);
  }

  req.sessionId = session.session_id;
  req.user = { id: session.user_id, email: session.email, displayName: session.display_name };
  next();
}
