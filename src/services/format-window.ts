import { dateToLabel } from "./day-label";

/**
 * Render a time window for display in the "Best time to run" summary.
 *
 * Rules:
 * - Same logical day → single day prefix, time on each side
 *   (e.g. "Today 08:00 – 12:00").
 * - End falls on the next calendar date at exactly 00:00 → treat as
 *   "24:00" on the start day (e.g. "Today 22:00 – 24:00").
 * - End falls on a different labelled day with a non-midnight time →
 *   prefix both sides (e.g. "Today 22:00 – Tomorrow 03:00").
 *
 * Operates on raw ISO strings (no Date parsing) for timezone safety.
 *
 * @param startTime - ISO 8601 datetime, e.g. "2026-05-21T08:00"
 * @param endTime   - ISO 8601 datetime (exclusive), e.g. "2026-05-21T12:00"
 * @param today     - "YYYY-MM-DD" string used to label days as Today/Tomorrow
 */
export function formatWindowRange(
  startTime: string,
  endTime: string,
  today: string,
): string {
  const startDate = startTime.slice(0, 10);
  const startHm = startTime.slice(11, 16);
  const endDate = endTime.slice(0, 10);
  const endHm = endTime.slice(11, 16);

  const startLabel = dateToLabel(startDate, today);

  // Same calendar day → single prefix.
  if (startDate === endDate) {
    return `${startLabel} ${startHm} – ${endHm}`;
  }

  // Cross-day ending exactly at midnight → render as 24:00 on the start day.
  if (endHm === "00:00") {
    return `${startLabel} ${startHm} – 24:00`;
  }

  // Cross-day with a non-midnight end → prefix both sides.
  const endLabel = dateToLabel(endDate, today);
  return `${startLabel} ${startHm} – ${endLabel} ${endHm}`;
}
