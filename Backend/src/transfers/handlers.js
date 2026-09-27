import { parseMoney, isPositive } from '../money.js';
import { parseDay } from '../days.js';
import { isId, unknownFieldError } from '../fields.js';
import {
  listTransfers,
  findTransfer,
  findOwnAccounts,
  insertTransfer,
  updateTransfer,
  setTransferDeleted,
} from './queries.js';

const TRANSFER_FIELDS = ['fromAccountId', 'toAccountId', 'amount', 'date', 'note'];
const PAGE_SIZE = 50;
const ARCHIVED_TRANSFER_ERROR = 'This transfer involves an archived account, so it cannot be changed';

function readNote(value) {
  if (value === undefined || value === null) return { note: null };
  if (typeof value !== 'string') return { error: 'note must be text' };
  return { note: value.trim() || null };
}

// Used for both create and edit. Edit merges the request over the current
// transfer first, so every field is always checked the same way.
function readTransferFields(input) {
  if (!isId(input.fromAccountId)) return { error: 'fromAccountId must be an account id' };
  if (!isId(input.toAccountId)) return { error: 'toAccountId must be an account id' };
  if (input.fromAccountId === input.toAccountId) return { error: 'A transfer needs two different accounts' };
  const amount = parseMoney(input.amount);
  if (!amount || !isPositive(amount)) {
    return { error: 'amount must be a positive amount as a string, like "5000.00"' };
  }
  const date = parseDay(input.date);
  if (!date) return { error: 'date must be a date like "2026-09-27"' };
  const { note, error } = readNote(input.note);
  if (error) return { error };
  return { fromAccountId: input.fromAccountId, toAccountId: input.toAccountId, amount, date, note };
}

// The accounts come from the request body, so they are never trusted: each
// must belong to the requester, be unarchived, and have been open that day.
async function accountsError(fields, userId) {
  const accounts = await findOwnAccounts(userId, [fields.fromAccountId, fields.toAccountId]);
  for (const field of ['fromAccountId', 'toAccountId']) {
    const account = accounts.find((candidate) => candidate.id === fields[field]);
    if (!account) return `${field} is not one of your accounts`;
    if (account.archived_at) return `${account.name} is archived`;
    if (fields.date < account.opening_date) {
      return `${account.name} was opened on ${account.opening_date}, so a transfer cannot be dated before that`;
    }
  }
  return null;
}

function toPublicTransfer(row) {
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amount: row.amount,
    date: row.date,
    note: row.note,
  };
}

// Sends the 404 itself, so callers only need to stop when this returns nothing.
async function loadTransfer(req, res) {
  const transfer = isId(req.params.id) ? await findTransfer(req.params.id, req.user.id) : undefined;
  if (!transfer) res.status(404).json({ error: 'Transfer not found' });
  return transfer;
}

export async function getTransfers(req, res) {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isSafeInteger(page) || page < 1) return res.status(400).json({ error: 'page must be a whole number from 1' });

  // One extra row tells us whether another page exists.
  const rows = await listTransfers(req.user.id, { limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  res.json({ entries: rows.slice(0, PAGE_SIZE).map(toPublicTransfer), hasMore: rows.length > PAGE_SIZE });
}

export async function createTransfer(req, res) {
  const unknown = unknownFieldError(req.body ?? {}, TRANSFER_FIELDS);
  if (unknown) return res.status(400).json(unknown);
  const fields = readTransferFields(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });
  const accountProblem = await accountsError(fields, req.user.id);
  if (accountProblem) return res.status(400).json({ error: accountProblem });

  res.status(201).json(toPublicTransfer(await insertTransfer(req.user.id, fields)));
}

export async function editTransfer(req, res) {
  const transfer = await loadTransfer(req, res);
  if (!transfer) return;
  if (transfer.touches_archived_account) return res.status(409).json({ error: ARCHIVED_TRANSFER_ERROR });

  const unknown = unknownFieldError(req.body ?? {}, TRANSFER_FIELDS);
  if (unknown) return res.status(400).json(unknown);
  const fields = readTransferFields({ ...toPublicTransfer(transfer), ...req.body });
  if (fields.error) return res.status(400).json({ error: fields.error });
  const accountProblem = await accountsError(fields, req.user.id);
  if (accountProblem) return res.status(400).json({ error: accountProblem });

  res.json(toPublicTransfer(await updateTransfer(transfer.id, req.user.id, fields)));
}

export async function deleteTransfer(req, res) {
  const transfer = await loadTransfer(req, res);
  if (!transfer) return;
  if (transfer.touches_archived_account) return res.status(409).json({ error: ARCHIVED_TRANSFER_ERROR });

  await setTransferDeleted(transfer.id, req.user.id);
  res.status(204).end();
}
