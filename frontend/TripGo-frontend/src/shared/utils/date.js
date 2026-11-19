/**
 * YYYY-MM-DD in the user's local timezone, offset by `days` from today.
 * Avoids toISOString(), which returns the UTC date (yesterday in IST before 05:30).
 */
export const localDateString = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
