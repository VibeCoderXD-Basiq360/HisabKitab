// NUMERIC(12,2): up to 10 digits before the point, up to 2 after.
const MONEY_PATTERN = /^-?\d{1,10}(\.\d{1,2})?$/;

// Money arrives as a string, never a JSON number, so no float ever touches it.
// Returns the amount with exactly 2 decimal places, or null if it is not money.
export function parseMoney(value) {
  if (typeof value !== 'string' || !MONEY_PATTERN.test(value)) return null;
  const [whole, paise = ''] = value.split('.');
  return `${whole}.${paise.padEnd(2, '0')}`;
}

// Indian grouping: the last three digits, then pairs. "3100000.00" → "₹31,00,000.00".
export function formatRupees(amount) {
  const negative = amount.startsWith('-');
  const [whole, paise] = amount.replace('-', '').split('.');
  const lastThree = whole.slice(-3);
  const leading = whole.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ',');
  const grouped = leading ? `${leading},${lastThree}` : lastThree;
  return `${negative ? '-' : ''}₹${grouped}.${paise}`;
}
