import type { TimeSlot, WeekGridCell, WeekGridRow } from "../types";
import { gridDayLabel } from "./day-label";

/** Maximum number of days rendered in the week view. */
export const MAX_WEEK_ROWS = 7;

/** Number of hour columns per row. */
const HOURS_PER_DAY = 24;

/**
 * Build the week heatmap grid from scored slots.
 *
 * One row per calendar date present in `slots` (ascending, capped at
 * {@link MAX_WEEK_ROWS}); each row always has 24 cells indexed by hour of
 * day. A cell carries its `slot` only when the hour is in the future and
 * has data — past hours and hours beyond the forecast horizon get a
 * `null` slot (see {@link WeekGridCell}).
 *
 * Timezone note: like the rest of the codebase, this works on the local
 * ISO strings returned by Open-Meteo (`timezone=auto`) and compares them
 * against `now` in device-local time. There is no separate IANA timezone
 * plumbing; device-local is assumed to match location-local, consistent
 * with `getTodayString` / `dateToLabel`.
 *
 * @param slots - All scored slots (may span multiple days), any order.
 * @param now   - The current instant, used to mark past hours.
 */
export function buildWeekGrid(
  slots: ReadonlyArray<TimeSlot>,
  now: Date,
): WeekGridRow[] {
  if (slots.length === 0) return [];

  const todayIso = localDateKey(now);
  const nowHourKey = localHourKey(now);

  // Index slots by their ISO time for O(1) cell lookup.
  const slotByTime = new Map<string, TimeSlot>();
  for (const slot of slots) {
    slotByTime.set(slot.time, slot);
  }

  // Collect the distinct dates, ascending, capped at MAX_WEEK_ROWS.
  const dates = [...new Set(slots.map((s) => s.time.slice(0, 10)))]
    .sort()
    .slice(0, MAX_WEEK_ROWS);

  return dates.map((dateIso) => ({
    dateIso,
    dayLabel: gridDayLabel(dateIso, todayIso),
    cells: buildCells(dateIso, nowHourKey, slotByTime),
  }));
}

/**
 * Find the single highest-scoring future cell across the grid, returning
 * its ISO time (used to draw the "best of the week" ring). Ties resolve to
 * the earliest time. Returns `null` when no future cell has data.
 */
export function findBestFutureCellTime(
  rows: ReadonlyArray<WeekGridRow>,
): string | null {
  let bestTime: string | null = null;
  let bestScore = -1;

  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.isPast || cell.slot === null) continue;
      if (cell.slot.score > bestScore) {
        bestScore = cell.slot.score;
        bestTime = cell.time;
      }
    }
  }

  return bestTime;
}

// --- Internal helpers ---

function buildCells(
  dateIso: string,
  nowHourKey: string,
  slotByTime: Map<string, TimeSlot>,
): WeekGridCell[] {
  const cells: WeekGridCell[] = [];

  for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
    const hh = String(hour).padStart(2, "0");
    const time = `${dateIso}T${hh}:00`;
    // Strict comparison: the current hour counts as actionable, not past.
    const isPast = `${dateIso}T${hh}` < nowHourKey;

    cells.push({
      time,
      hourOfDay: hour,
      slot: isPast ? null : slotByTime.get(time) ?? null,
      isPast,
    });
  }

  return cells;
}

/** "YYYY-MM-DD" for `date` in device-local time. */
function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "YYYY-MM-DDTHH" for `date` in device-local time (hour-granular key). */
function localHourKey(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  return `${localDateKey(date)}T${hour}`;
}
