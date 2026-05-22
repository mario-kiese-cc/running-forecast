/**
 * Helpers for converting "YYYY-MM-DD" date strings into human-readable labels
 * ("Today" / "Tomorrow" / fallback) relative to a reference date.
 *
 * Pure string operations — no Date parsing on the input dates, so these
 * helpers are timezone-safe for already-local ISO strings.
 */

/** Label a date string relative to `today`. */
export function dateToLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return date;
}

/**
 * Add `days` to a "YYYY-MM-DD" string and return the new "YYYY-MM-DD".
 * Uses Date arithmetic on midnight UTC to avoid DST edge cases for date-only math.
 */
export function addDays(date: string, days: number): string {
  // Parse as UTC midnight to avoid DST shifting the day.
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Get today's date as "YYYY-MM-DD" in the local timezone. */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
