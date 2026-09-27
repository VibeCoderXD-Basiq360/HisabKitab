import { pool } from '../db.js';

// Cards are flipped here, so opening_amount and current_amount read as
// "outstanding" for a card and "balance" for everything else.
const ACCOUNT_COLUMNS = `
  a.id, a.name, a.kind, a.opening_date, a.billing_day, a.due_day, a.last_four, a.archived_at,
  CASE WHEN a.kind = 'credit_card' THEN -a.opening_balance ELSE a.opening_balance END AS opening_amount,
  CASE WHEN a.kind = 'credit_card' THEN -totals.balance ELSE totals.balance END AS current_amount,
  totals.balance = 0 AS balance_is_zero`;

// The balance is summed from every movement on each read. It is never stored.
const BALANCE_JOIN = `
  CROSS JOIN LATERAL (
    SELECT sum(m.amount) AS balance FROM account_movements m WHERE m.account_id = a.id
  ) totals`;

export async function listActiveAccounts(userId) {
  const result = await pool.query(
    `SELECT ${ACCOUNT_COLUMNS}
     FROM accounts a ${BALANCE_JOIN}
     WHERE a.user_id = $1 AND a.archived_at IS NULL
     ORDER BY a.created_at, a.id`,
    [userId],
  );
  return result.rows;
}

export async function findAccount(accountId, userId) {
  const result = await pool.query(
    `SELECT ${ACCOUNT_COLUMNS}
     FROM accounts a ${BALANCE_JOIN}
     WHERE a.id = $1 AND a.user_id = $2`,
    [accountId, userId],
  );
  return result.rows[0];
}

export async function insertAccount(userId, fields) {
  const result = await pool.query(
    `INSERT INTO accounts (user_id, name, kind, opening_balance, opening_date, billing_day, due_day, last_four)
     VALUES ($1, $2, $3::text,
             CASE WHEN $3::text = 'credit_card' THEN -$4::numeric ELSE $4::numeric END,
             $5, $6, $7, $8)
     RETURNING id`,
    [
      userId,
      fields.name,
      fields.kind,
      fields.openingAmount,
      fields.openingDate,
      fields.billingDay,
      fields.dueDay,
      fields.lastFour,
    ],
  );
  return result.rows[0].id;
}

export async function updateAccount(accountId, userId, fields) {
  await pool.query(
    `UPDATE accounts
     SET name = $3,
         opening_balance = CASE WHEN kind = 'credit_card' THEN -$4::numeric ELSE $4::numeric END,
         billing_day = $5,
         due_day = $6,
         last_four = $7
     WHERE id = $1 AND user_id = $2 AND archived_at IS NULL`,
    [accountId, userId, fields.name, fields.openingAmount, fields.billingDay, fields.dueDay, fields.lastFour],
  );
}

export async function setAccountArchived(accountId, userId) {
  await pool.query(
    'UPDATE accounts SET archived_at = now() WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
    [accountId, userId],
  );
}

export async function listLedgerEntries(accountId, userId, { limit, offset }) {
  const result = await pool.query(
    `SELECT m.date, abs(m.amount) AS amount,
            CASE WHEN m.amount < 0 THEN 'out' ELSE 'in' END AS direction,
            m.source, m.source_id
     FROM account_movements m
     JOIN accounts a ON a.id = m.account_id
     WHERE m.account_id = $1 AND a.user_id = $2
     -- Newest first; on the opening day the opening balance sits below that
     -- day's movements. source + source_id is unique within one account, so
     -- the order is total and pages never overlap or skip rows.
     ORDER BY m.date DESC, m.source = 'opening', m.source, m.source_id DESC
     LIMIT $3 OFFSET $4`,
    [accountId, userId, limit, offset],
  );
  return result.rows;
}
