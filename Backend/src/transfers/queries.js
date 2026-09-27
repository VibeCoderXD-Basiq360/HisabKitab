import { pool } from '../db.js';

const TRANSFER_COLUMNS = 't.id, t.from_account_id, t.to_account_id, t.amount, t.date, t.note';

export async function listTransfers(userId, { limit, offset }) {
  const result = await pool.query(
    `SELECT ${TRANSFER_COLUMNS}
     FROM transfers t
     WHERE t.user_id = $1 AND t.deleted_at IS NULL
     -- id breaks ties between transfers on the same day, so pages never overlap.
     ORDER BY t.date DESC, t.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

export async function findTransfer(transferId, userId) {
  const result = await pool.query(
    `SELECT ${TRANSFER_COLUMNS},
            (from_account.archived_at IS NOT NULL OR to_account.archived_at IS NOT NULL)
              AS touches_archived_account
     FROM transfers t
     JOIN accounts from_account ON from_account.id = t.from_account_id
     JOIN accounts to_account ON to_account.id = t.to_account_id
     WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL`,
    [transferId, userId],
  );
  return result.rows[0];
}

export async function findOwnAccounts(userId, accountIds) {
  const result = await pool.query(
    `SELECT id, name, opening_date, archived_at
     FROM accounts
     WHERE user_id = $1 AND id = ANY($2::bigint[])`,
    [userId, accountIds],
  );
  return result.rows;
}

export async function insertTransfer(userId, fields) {
  const result = await pool.query(
    `INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, date, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, from_account_id, to_account_id, amount, date, note`,
    [userId, fields.fromAccountId, fields.toAccountId, fields.amount, fields.date, fields.note],
  );
  return result.rows[0];
}

export async function updateTransfer(transferId, userId, fields) {
  const result = await pool.query(
    `UPDATE transfers
     SET from_account_id = $3, to_account_id = $4, amount = $5, date = $6, note = $7
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING id, from_account_id, to_account_id, amount, date, note`,
    [transferId, userId, fields.fromAccountId, fields.toAccountId, fields.amount, fields.date, fields.note],
  );
  return result.rows[0];
}

export async function setTransferDeleted(transferId, userId) {
  await pool.query(
    'UPDATE transfers SET deleted_at = now() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [transferId, userId],
  );
}
