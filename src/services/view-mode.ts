/**
 * The two top-level ways to view the forecast:
 * - `timeline` — the ranked, day-by-day hourly cards (default).
 * - `week` — the multi-day heatmap (week-at-a-glance).
 */
export type ViewMode = "timeline" | "week";

/** Mode used when nothing is persisted or the stored value is invalid. */
export const DEFAULT_VIEW_MODE: ViewMode = "timeline";

const STORAGE_KEY = "running-forecast:view-mode";

/**
 * Persist the chosen view mode. Errors (quota, private mode) are swallowed
 * — a missed save is not worth crashing the app.
 */
export function saveViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Intentionally ignored.
  }
}

/**
 * Load the persisted view mode. Returns {@link DEFAULT_VIEW_MODE} if
 * nothing is saved, the value is unrecognised, or storage is unavailable.
 */
export function loadViewMode(): ViewMode {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_VIEW_MODE;
  }
  if (raw === null) return DEFAULT_VIEW_MODE;
  return isValidViewMode(raw) ? raw : DEFAULT_VIEW_MODE;
}

/** Clear the persisted view mode. */
export function clearViewMode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Intentionally ignored.
  }
}

function isValidViewMode(value: unknown): value is ViewMode {
  return value === "timeline" || value === "week";
}
