import { parseMoney, formatRupees } from '../money.js';
import { parseDay } from '../days.js';
import { isId, unknownFieldError } from '../fields.js';
import {
  listActiveAccounts,
  findAccount,
  insertAccount,
  updateAccount,
  setAccountArchived,
  listLedgerEntries,
} from './queries.js';

const KINDS = ['bank', 'cash', 'wallet', 'credit_card'];
const CARD_FIELDS = ['billingDay', 'dueDay', 'lastFour'];
const EDITABLE_FIELDS = ['name', 'openingBalance', 'openingOutstanding', ...CARD_FIELDS];
const CREATE_FIELDS = ['kind', 'openingDate', ...EDITABLE_FIELDS];
const LEDGER_PAGE_SIZE = 50;

function isDayOfMonth(value) {
  return Number.isInteger(value) && value >= 1 && value <= 31;
}

function readCardFields(input) {
  if (!isDayOfMonth(input.billingDay)) return { error: 'billingDay must be a day of the month, 1 to 31' };
  if (!isDayOfMonth(input.dueDay)) return { error: 'dueDay must be a day of the month, 1 to 31' };
  if (typeof input.lastFour !== 'string' || !/^\d{4}$/.test(input.lastFour)) {
    return { error: 'lastFour must be 4 digits' };
  }
  return { billingDay: input.billingDay, dueDay: input.dueDay, lastFour: input.lastFour };
}

// Used for both create and edit. Edit merges the request over the current
// account first, so every field is always checked the same way.
function readAccountFields(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) return { error: 'Enter a name' };
  if (!KINDS.includes(input.kind)) return { error: `kind must be one of ${KINDS.join(', ')}` };
  const openingDate = parseDay(input.openingDate);
  if (!openingDate) return { error: 'openingDate must be a date like "2026-09-27"' };

  const isCard = input.kind === 'credit_card';
  const openingField = isCard ? 'openingOutstanding' : 'openingBalance';
  const wrongField = isCard ? 'openingBalance' : 'openingOutstanding';
  if (wrongField in input) return { error: `Use ${openingField} for this kind of account` };
  const openingAmount = parseMoney(input[openingField]);
  if (!openingAmount) return { error: `${openingField} must be an amount as a string, like "1200.00"` };

  const common = { name, kind: input.kind, openingDate, openingAmount };
  if (isCard) {
    const card = readCardFields(input);
    return card.error ? card : { ...common, ...card };
  }
  if (CARD_FIELDS.some((field) => field in input)) {
    return { error: 'Only credit cards have billingDay, dueDay and lastFour' };
  }
  return { ...common, billingDay: null, dueDay: null, lastFour: null };
}

function toPublicAccount(row) {
  const account = { id: row.id, name: row.name, kind: row.kind, openingDate: row.opening_date };
  if (row.kind === 'credit_card') {
    account.openingOutstanding = row.opening_amount;
    account.outstanding = row.current_amount;
    account.billingDay = row.billing_day;
    account.dueDay = row.due_day;
    account.lastFour = row.last_four;
  } else {
    account.openingBalance = row.opening_amount;
    account.balance = row.current_amount;
  }
  account.archivedAt = row.archived_at;
  return account;
}

function toLedgerEntry(row) {
  return { date: row.date, amount: row.amount, direction: row.direction, source: row.source, sourceId: row.source_id };
}

function nonZeroBalanceMessage(account) {
  const amount = formatRupees(account.current_amount);
  if (account.kind === 'credit_card') return `This card still has ${amount} outstanding. Clear it before archiving.`;
  return `This account still has a balance of ${amount}. Bring it to zero before archiving.`;
}

// Sends the 404 itself, so callers only need to stop when this returns nothing.
async function loadAccount(req, res) {
  const account = isId(req.params.id) ? await findAccount(req.params.id, req.user.id) : undefined;
  if (!account) res.status(404).json({ error: 'Account not found' });
  return account;
}

export async function listAccounts(req, res) {
  const rows = await listActiveAccounts(req.user.id);
  res.json(rows.map(toPublicAccount));
}

export async function createAccount(req, res) {
  const unknown = unknownFieldError(req.body ?? {}, CREATE_FIELDS);
  if (unknown) return res.status(400).json(unknown);
  const fields = readAccountFields(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });

  try {
    const accountId = await insertAccount(req.user.id, fields);
    res.status(201).json(toPublicAccount(await findAccount(accountId, req.user.id)));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: `You already have an account called "${fields.name}"` });
    }
    throw error;
  }
}

export async function getAccount(req, res) {
  const account = await loadAccount(req, res);
  if (account) res.json(toPublicAccount(account));
}

export async function editAccount(req, res) {
  const account = await loadAccount(req, res);
  if (!account) return;
  if (account.archived_at) return res.status(409).json({ error: 'This account is archived and cannot be edited' });

  const changes = req.body ?? {};
  if ('kind' in changes || 'openingDate' in changes) {
    return res.status(400).json({ error: 'kind and openingDate cannot be changed' });
  }
  const unknown = unknownFieldError(changes, EDITABLE_FIELDS);
  if (unknown) return res.status(400).json(unknown);
  const fields = readAccountFields({ ...toPublicAccount(account), ...changes });
  if (fields.error) return res.status(400).json({ error: fields.error });

  try {
    await updateAccount(account.id, req.user.id, fields);
    res.json(toPublicAccount(await findAccount(account.id, req.user.id)));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: `You already have an account called "${fields.name}"` });
    }
    throw error;
  }
}

export async function archiveAccount(req, res) {
  const account = await loadAccount(req, res);
  if (!account) return;
  if (account.archived_at) return res.status(409).json({ error: 'This account is already archived' });
  if (!account.balance_is_zero) return res.status(409).json({ error: nonZeroBalanceMessage(account) });

  await setAccountArchived(account.id, req.user.id);
  res.status(204).end();
}

export async function getLedger(req, res) {
  const account = await loadAccount(req, res);
  if (!account) return;
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isSafeInteger(page) || page < 1) return res.status(400).json({ error: 'page must be a whole number from 1' });

  // One extra row tells us whether another page exists.
  const rows = await listLedgerEntries(account.id, req.user.id, {
    limit: LEDGER_PAGE_SIZE + 1,
    offset: (page - 1) * LEDGER_PAGE_SIZE,
  });
  res.json({
    entries: rows.slice(0, LEDGER_PAGE_SIZE).map(toLedgerEntry),
    hasMore: rows.length > LEDGER_PAGE_SIZE,
  });
}
