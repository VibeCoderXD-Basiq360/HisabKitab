import { pool } from '../db.js';

export async function findOwnAccount(accountId, userId) {
  const result = await pool.query(
    'SELECT id, name, opening_date, archived_at FROM accounts WHERE id = $1 AND user_id = $2',
    [accountId, userId],
  );
  return result.rows[0];
}

export async function listAdjustments(accountId, userId) {
  const result = await pool.query(
    `SELECT id, account_id, amount, direction, date, note
     FROM adjustments
     WHERE account_id = $1 AND user_id = $2
     ORDER BY date DESC, id DESC`,
    [accountId, userId],
  );
  return result.rows;
}

export async function insertAdjustment(userId, fields) {
  const result = await pool.query(
    `INSERT INTO adjustments (user_id, account_id, amount, direction, date, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, account_id, amount, direction, date, note`,
    [userId, fields.accountId, fields.amount, fields.direction, fields.date, fields.note],
  );
  return result.rows[0];
}
