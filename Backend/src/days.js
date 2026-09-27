const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A day the user picked, as "YYYY-MM-DD". Returns it, or null for anything
// else, including impossible days like "2026-02-30".
export function parseDay(value) {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return null;
  const midnightUtc = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(midnightUtc.getTime())) return null;
  return midnightUtc.toISOString().slice(0, 10) === value ? value : null;
}
