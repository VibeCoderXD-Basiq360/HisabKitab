// A copy of formatRupees in Backend/src/money.js: Web/ and Backend/ share no
// code. Formatting only — the client never does money arithmetic.
// Indian grouping: the last three digits, then pairs. "3100000.00" → "₹31,00,000.00".
export function formatRupees(amount) {
  const negative = amount.startsWith('-');
  const [whole, paise] = amount.replace('-', '').split('.');
  const lastThree = whole.slice(-3);
  const leading = whole.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ',');
  const grouped = leading ? `${leading},${lastThree}` : lastThree;
  return `${negative ? '-' : ''}₹${grouped}.${paise}`;
}
