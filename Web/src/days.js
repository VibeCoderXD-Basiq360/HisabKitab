const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-09-18" → "18 Sep", with the year added when it is not this year.
// Read from the string itself: turning it into a Date could shift the day
// across timezones.
export function formatDay(day) {
  const [year, month, date] = day.split('-');
  const label = `${Number(date)} ${MONTHS[Number(month) - 1]}`;
  return Number(year) === new Date().getFullYear() ? label : `${label} ${year}`;
}
