/**
 * "Unsociable" running hours — times of day when most users won't run.
 * Used to de-emphasize hourly cards visually and to exclude hours from
 * best-window recommendations.
 */

/** Inclusive start hour of the unsociable window (24h clock). */
export const NIGHT_START_HOUR = 21;
/** Exclusive end hour of the unsociable window (24h clock). */
export const NIGHT_END_HOUR = 6;

/**
 * Returns `true` if the given ISO time string falls within 21:00–05:59
 * (start inclusive, end exclusive). Uses string slicing, not Date parsing,
 * to remain timezone-safe.
 *
 * @param time - ISO 8601 datetime, e.g. "2026-05-21T22:00"
 */
export function isUnsociableHour(time: string): boolean {
  const hour = Number(time.slice(11, 13));
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}
