// How an account is described in words, the same on the home cards and in
// the list.

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
