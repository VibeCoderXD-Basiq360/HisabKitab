import { pool } from '../db.js';

export async function insertUser({ email, displayName, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (email, display_name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name`,
    [email, displayName, passwordHash],
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, display_name, password_hash
     FROM users
     WHERE email = $1`,
    [email],
  );
  return result.rows[0];
}

export async function findPasswordHash(userId) {
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  return result.rows[0].password_hash;
}

// One statement, so the new password and the logout of other devices
// succeed or fail together.
export async function updatePasswordAndEndOtherSessions({ userId, passwordHash, keepSessionId }) {
  await pool.query(
    `WITH updated AS (
       UPDATE users SET password_hash = $2 WHERE id = $1
     )
     DELETE FROM sessions WHERE user_id = $1 AND id <> $3`,
    [userId, passwordHash, keepSessionId],
  );
}

export async function insertSession(userId, tokenHash) {
  await pool.query('INSERT INTO sessions (user_id, token_hash) VALUES ($1, $2)', [userId, tokenHash]);
}

export async function findActiveSession(tokenHash, idleDays) {
  const result = await pool.query(
    `SELECT s.id AS session_id,
            s.last_used_at < now() - interval '1 day' AS needs_touch,
            u.id AS user_id, u.email, u.display_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.last_used_at > now() - make_interval(days => $2)`,
    [tokenHash, idleDays],
  );
  return result.rows[0];
}

export async function touchSession(sessionId) {
  await pool.query('UPDATE sessions SET last_used_at = now() WHERE id = $1', [sessionId]);
}

export async function deleteSession(sessionId) {
  await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}
