import type { TimeSlot, ScoreRating } from "../types";
import { dateToLabel } from "./day-label";
import { isUnsociableHour } from "./night-hours";

// Re-export for backwards compatibility (App.vue imports getTodayString from here).
export { getTodayString } from "./day-label";

/** A group of consecutive hours that share a similar rating */
export interface TimeWindow {
  /** Start time (ISO 8601) */
  readonly startTime: string;
  /** End time (ISO 8601, exclusive — the hour after the last included slot) */
  readonly endTime: string;
  /** Average score across all hours in the window */
  readonly averageScore: number;
  /** Rating based on the average score */
  readonly rating: ScoreRating;
  /** Number of hours in this window */
  readonly hours: number;
  /** The individual slots in this window */
  readonly slots: TimeSlot[];
}

/** A day's worth of slots with metadata */
export interface DayForecast {
  /** Date string, e.g. "2026-05-21" */
  readonly date: string;
  /** Display label, e.g. "Today" or "Tomorrow" */
  readonly label: string;
  /** All hourly slots for this day */
  readonly slots: TimeSlot[];
  /** Best time window(s) for running, sorted by score descending */
  readonly bestWindows: TimeWindow[];
  /**
   * True when the only available best windows fall in the unsociable
   * nighttime range (21:00–05:59). UI may show a "late night" hint.
   */
  readonly bestWindowsAreLateNight: boolean;
}

/**
 * Group consecutive slots that share a rating into TimeWindows.
 * Adjacent hours with the same rating are merged.
 */
export function buildWindows(slots: ReadonlyArray<TimeSlot>): TimeWindow[] {
  if (slots.length === 0) return [];

  const windows: TimeWindow[] = [];
  let windowSlots: TimeSlot[] = [slots[0]];

  for (let i = 1; i < slots.length; i++) {
    const current = slots[i];
    const previous = slots[i - 1];

    if (current.rating === previous.rating) {
      windowSlots.push(current);
    } else {
      windows.push(finalizeWindow(windowSlots));
      windowSlots = [current];
    }
  }

  // Finalize last window
  windows.push(finalizeWindow(windowSlots));

  return windows;
}

/**
 * Find the best time windows for running.
 * Returns windows rated "good" or "great", sorted by average score descending.
 * If no good/great windows exist, returns the single highest-rated window.
 */
export function findBestWindows(windows: ReadonlyArray<TimeWindow>): TimeWindow[] {
  const runnableWindows = windows.filter(
    (w) => w.rating === "great" || w.rating === "good",
  );

  if (runnableWindows.length > 0) {
    return [...runnableWindows].sort((a, b) => b.averageScore - a.averageScore);
  }

  // No good windows — return the best of what's available
  if (windows.length === 0) return [];

  const best = [...windows].sort((a, b) => b.averageScore - a.averageScore);
  return [best[0]];
}

/**
 * Compute best windows for a day, preferring daytime hours.
 *
 * Strategy:
 *  1. If there are runnable (great/good) daytime windows, return them.
 *  2. Otherwise, if there are runnable windows at night, return those and
 *     flag `isLateNight` so the UI can show a hint.
 *  3. Otherwise, return the single least-bad window from the daytime set,
 *     or fall back to the overall least-bad window if no daytime data exists.
 */
export function findBestWindowsPreferringDaytime(
  slots: ReadonlyArray<TimeSlot>,
): { windows: TimeWindow[]; isLateNight: boolean } {
  const daytimeSlots = slots.filter((s) => !isUnsociableHour(s.time));
  const daytimeWindows = buildWindows(daytimeSlots);
  const runnableDaytime = daytimeWindows.filter(
    (w) => w.rating === "great" || w.rating === "good",
  );

  if (runnableDaytime.length > 0) {
    return {
      windows: [...runnableDaytime].sort(
        (a, b) => b.averageScore - a.averageScore,
      ),
      isLateNight: false,
    };
  }

  // No runnable daytime windows — check if night has anything runnable.
  const allWindows = buildWindows(slots);
  const runnableNight = allWindows.filter(
    (w) =>
      (w.rating === "great" || w.rating === "good") &&
      isUnsociableHour(w.startTime),
  );

  if (runnableNight.length > 0) {
    return {
      windows: [...runnableNight].sort(
        (a, b) => b.averageScore - a.averageScore,
      ),
      isLateNight: true,
    };
  }

  // Nothing is runnable anywhere — fall back to the least-bad daytime window.
  if (daytimeWindows.length > 0) {
    return { windows: findBestWindows(daytimeWindows), isLateNight: false };
  }

  // No daytime data at all — last resort: any window.
  const fallback = findBestWindows(allWindows);
  const isLateNight = fallback.some((w) => isUnsociableHour(w.startTime));
  return { windows: fallback, isLateNight };
}

/**
 * Group slots by calendar date and build DayForecasts.
 *
 * @param slots - All scored time slots (may span multiple days)
 * @param today - The current date string (e.g. "2026-05-21") for labeling
 */
export function buildDayForecasts(
  slots: ReadonlyArray<TimeSlot>,
  today: string,
): DayForecast[] {
  const byDate = new Map<string, TimeSlot[]>();

  for (const slot of slots) {
    // Extract date portion from "2026-05-21T10:00"
    const date = slot.time.slice(0, 10);
    const existing = byDate.get(date);
    if (existing) {
      existing.push(slot);
    } else {
      byDate.set(date, [slot]);
    }
  }

  const forecasts: DayForecast[] = [];

  for (const [date, daySlots] of byDate) {
    const { windows: bestWindows, isLateNight } =
      findBestWindowsPreferringDaytime(daySlots);

    forecasts.push({
      date,
      label: dateToLabel(date, today),
      slots: daySlots,
      bestWindows,
      bestWindowsAreLateNight: isLateNight,
    });
  }

  return forecasts;
}

// --- Internal helpers ---

function finalizeWindow(slots: TimeSlot[]): TimeWindow {
  const totalScore = slots.reduce((sum, s) => sum + s.score, 0);
  const averageScore = Math.round(totalScore / slots.length);

  return {
    startTime: slots[0].time,
    endTime: computeEndTime(slots[slots.length - 1].time),
    averageScore,
    rating: ratingFromScore(averageScore),
    hours: slots.length,
    slots,
  };
}

/** Add one hour to an ISO time string, e.g. "2026-05-21T23:00" → "2026-05-22T00:00" */
function computeEndTime(lastSlotTime: string): string {
  const date = new Date(lastSlotTime);
  date.setHours(date.getHours() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function ratingFromScore(score: number): ScoreRating {
  if (score >= 80) return "great";
  if (score >= 60) return "good";
  if (score >= 30) return "fair";
  return "avoid";
}
