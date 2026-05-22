/** Sunrise/sunset pair for one day */
export interface DaylightWindow {
  /** ISO 8601 datetime for sunrise, e.g. "2026-05-21T05:07" */
  readonly sunrise: string;
  /** ISO 8601 datetime for sunset, e.g. "2026-05-21T20:34" */
  readonly sunset: string;
}

/**
 * Determine whether a given hour falls within daylight.
 * Compares the hour's time string against sunrise/sunset windows.
 *
 * @param hourTime - ISO 8601 datetime for the hour, e.g. "2026-05-21T10:00"
 * @param windows - Array of sunrise/sunset pairs (one per day)
 * @returns true if the hour is between any sunrise and sunset
 */
export function isDaylight(
  hourTime: string,
  windows: ReadonlyArray<DaylightWindow>,
): boolean {
  for (const window of windows) {
    if (hourTime >= window.sunrise && hourTime < window.sunset) {
      return true;
    }
  }
  return false;
}
