import { formatDay } from './days.js';

// How an account and its movements are described in words, the same
// everywhere they appear.

const KIND_LABELS = { bank: 'Bank account', cash: 'Cash', wallet: 'Wallet', credit_card: 'Credit card' };

export function kindLabel(account) {
  return account.kind === 'credit_card' ? `Credit card ending ${account.lastFour}` : KIND_LABELS[account.kind];
}

// The amount an account leads with, and the word that goes with it — never
// the amount alone. A card with a negative outstanding has been overpaid, so
// it is "in credit", shown without the minus.
export function headlineFigure(account) {
  if (account.kind !== 'credit_card') return { word: 'balance', amount: account.balance };
  if (account.outstanding.startsWith('-')) return { word: 'in credit', amount: account.outstanding.slice(1) };
  return { word: 'outstanding', amount: account.outstanding };
}

// On a card, money out is spending you owe for, and money in pays it off.
const MOVEMENT_WORDS = { in: 'in', out: 'out' };
const CARD_MOVEMENT_WORDS = { in: 'paid off', out: 'charged' };

function openingWord(isCard, entry) {
  if (!isCard) return entry.direction === 'in' ? 'balance' : 'overdrawn';
  // A card opening at zero comes back as "in"; it still owes, just nothing.
  return entry.direction === 'in' && entry.amount !== '0.00' ? 'in credit' : 'owed';
}

// One ledger row in words: a title, a detail line with the date, and the
// word that says which way the money went. `notes` maps adjustment ids to
// their notes, so a correction is titled by why it was made.
export function describeLedgerEntry(account, entry, notes) {
  const isCard = account.kind === 'credit_card';
  const day = formatDay(entry.date);
  if (entry.source === 'opening') {
    return { title: isCard ? 'Owed at the start' : 'Starting balance', detail: day, word: openingWord(isCard, entry) };
  }
  const word = (isCard ? CARD_MOVEMENT_WORDS : MOVEMENT_WORDS)[entry.direction];
  if (entry.source === 'adjustment') {
    return { title: notes.get(entry.sourceId) ?? 'Correction', detail: `Correction, ${day}`, word };
  }
  return { title: 'Transfer', detail: day, word };
}
