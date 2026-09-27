import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  insertUser,
  findUserByEmail,
  findPasswordHash,
  updatePasswordAndEndOtherSessions,
} from './queries.js';
import { startSession, endSession } from '../session.js';

const scryptAsync = promisify(scrypt);
const SCRYPT_COST = { N: 32768, r: 8, p: 1 };
const KEY_LENGTH = 64;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_FAILED_PASSWORD_CHECKS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const TOO_MANY_ATTEMPTS = 'Too many attempts. Try again in 15 minutes';

// Login and change-password share this counter, so a thief holding an
// unlocked phone cannot guess the password on the change-password screen.
// "email|ip" → { count, firstFailedAt }
const failedPasswordChecks = new Map();

function deriveKey(password, salt, { N, r, p }) {
  // scrypt needs 128·N·r bytes of memory; Node's default cap is too low for our N.
  return scryptAsync(password, salt, KEY_LENGTH, { N, r, p, maxmem: 256 * N * r });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, SCRYPT_COST);
  const { N, r, p } = SCRYPT_COST;
  return ['scrypt', N, r, p, salt.toString('hex'), key.toString('hex')].join(':');
}

async function passwordMatches(password, storedHash) {
  const [, N, r, p, saltHex, keyHex] = storedHash.split(':');
  const cost = { N: Number(N), r: Number(r), p: Number(p) };
  const key = await deriveKey(password, Buffer.from(saltHex, 'hex'), cost);
  return timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
}

function attemptKeyFor(email, req) {
  return `${email}|${req.ip}`;
}

function isLockedOut(attemptKey) {
  const entry = failedPasswordChecks.get(attemptKey);
  if (!entry) return false;
  if (Date.now() - entry.firstFailedAt > LOCKOUT_MS) {
    failedPasswordChecks.delete(attemptKey);
    return false;
  }
  return entry.count >= MAX_FAILED_PASSWORD_CHECKS;
}

function recordFailedPasswordCheck(attemptKey) {
  const now = Date.now();
  for (const [key, entry] of failedPasswordChecks) {
    if (now - entry.firstFailedAt > LOCKOUT_MS) failedPasswordChecks.delete(key);
  }
  const entry = failedPasswordChecks.get(attemptKey) ?? { count: 0, firstFailedAt: now };
  entry.count += 1;
  failedPasswordChecks.set(attemptKey, entry);
}

function normaliseEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidPassword(value) {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH;
}

function toPublicUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function register(req, res) {
  const email = normaliseEmail(req.body?.email);
  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
  const password = req.body?.password;

  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email' });
  if (!displayName) return res.status(400).json({ error: 'Enter a display name' });
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const user = await insertUser({ email, displayName, passwordHash: await hashPassword(password) });
    res.status(201).json(toPublicUser(user));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That email is already registered' });
    }
    throw error;
  }
}

export async function login(req, res) {
  const email = normaliseEmail(req.body?.email);
  const password = req.body?.password;
  const attemptKey = attemptKeyFor(email, req);
  if (isLockedOut(attemptKey)) return res.status(429).json({ error: TOO_MANY_ATTEMPTS });

  const user = await findUserByEmail(email);
  const correct = user && typeof password === 'string' && (await passwordMatches(password, user.password_hash));
  if (!correct) {
    recordFailedPasswordCheck(attemptKey);
    return res.status(401).json({ error: 'Wrong email or password' });
  }

  failedPasswordChecks.delete(attemptKey);
  await startSession(res, user.id);
  res.json(toPublicUser(user));
}

export async function logout(req, res) {
  await endSession(req, res);
  res.status(204).end();
}

export function getCurrentUser(req, res) {
  res.json(req.user);
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const attemptKey = attemptKeyFor(req.user.email, req);
  if (isLockedOut(attemptKey)) return res.status(429).json({ error: TOO_MANY_ATTEMPTS });

  const storedHash = await findPasswordHash(req.user.id);
  const correct = typeof currentPassword === 'string' && (await passwordMatches(currentPassword, storedHash));
  if (!correct) {
    recordFailedPasswordCheck(attemptKey);
    return res.status(400).json({ error: 'Current password is wrong' });
  }

  failedPasswordChecks.delete(attemptKey);

  await updatePasswordAndEndOtherSessions({
    userId: req.user.id,
    passwordHash: await hashPassword(newPassword),
    keepSessionId: req.sessionId,
  });
  res.status(204).end();
}
