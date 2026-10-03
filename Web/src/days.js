const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-09-18" → "18 Sep", with the year added when it is not this year.
// Read from the string itself: turning it into a Date could shift the day
// across timezones.
export function formatDay(day) {
  const [year, month, date] = day.split('-');
  const label = `${Number(date)} ${MONTHS[Number(month) - 1]}`;
  return Number(year) === new Date().getFullYear() ? label : `${label} ${year}`;
}

// Today as "YYYY-MM-DD", by the phone's own calendar — the day the person
// sees, not the day on a server somewhere else.
export function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${date}`;
}

// 1 → "1st", 18 → "18th", 22 → "22nd", 13 → "13th".
export function dayWithSuffix(day) {
  const isTeen = day >= 11 && day <= 13;
  const suffix = isTeen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th');
  return `${day}${suffix}`;
}
