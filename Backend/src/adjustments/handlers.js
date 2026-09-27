import { parseMoney, isPositive } from '../money.js';
import { parseDay } from '../days.js';
import { isId, unknownFieldError } from '../fields.js';
import { findOwnAccount, listAdjustments, insertAdjustment } from './queries.js';

const ADJUSTMENT_FIELDS = ['amount', 'direction', 'date', 'note'];
const DIRECTIONS = ['in', 'out'];

function readAdjustmentFields(input) {
  const amount = parseMoney(input.amount);
  if (!amount || !isPositive(amount)) {
    return { error: 'amount must be a positive amount as a string, like "250.00"' };
  }
  if (!DIRECTIONS.includes(input.direction)) return { error: 'direction must be in or out' };
  const date = parseDay(input.date);
  if (!date) return { error: 'date must be a date like "2026-09-27"' };
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (!note) return { error: 'Say why the balance needs adjusting in note' };
  return { amount, direction: input.direction, date, note };
}

function toPublicAdjustment(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    amount: row.amount,
    direction: row.direction,
    date: row.date,
    note: row.note,
  };
}

// Sends the 404 itself, so callers only need to stop when this returns nothing.
async function loadAccount(req, res) {
  const account = isId(req.params.id) ? await findOwnAccount(req.params.id, req.user.id) : undefined;
  if (!account) res.status(404).json({ error: 'Account not found' });
  return account;
}

export async function getAdjustments(req, res) {
  const account = await loadAccount(req, res);
  if (!account) return;
  const rows = await listAdjustments(account.id, req.user.id);
  res.json(rows.map(toPublicAdjustment));
}

export async function createAdjustment(req, res) {
  const account = await loadAccount(req, res);
  if (!account) return;
  if (account.archived_at) return res.status(409).json({ error: `${account.name} is archived` });

  const unknown = unknownFieldError(req.body ?? {}, ADJUSTMENT_FIELDS);
  if (unknown) return res.status(400).json(unknown);
  const fields = readAdjustmentFields(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });
  if (fields.date < account.opening_date) {
    return res.status(400).json({
      error: `${account.name} was opened on ${account.opening_date}, so an adjustment cannot be dated before that`,
    });
  }

  const adjustment = await insertAdjustment(req.user.id, { ...fields, accountId: account.id });
  res.status(201).json(toPublicAdjustment(adjustment));
}
