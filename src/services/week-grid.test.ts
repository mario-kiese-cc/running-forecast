import { describe, it, expect } from "vitest";
import { buildWeekGrid, findBestFutureCellTime, MAX_WEEK_ROWS } from "./week-grid";
import type { ScoreFactors, TimeSlot } from "../types";

/** Build a minimal TimeSlot for a given ISO time and score. */
function makeSlot(time: string, score = 70): TimeSlot {
  return {
    time,
    score,
    rating: ratingFromScore(score),
    factors: perfectFactors(),
    conditions: {
      time,
      temperatureCelsius: 14,
      apparentTemperatureCelsius: 13,
      precipitationProbability: 0,
      precipitationMm: 0,
      relativeHumidity: 50,
      windSpeedKmh: 5,
      uvIndex: 3,
      isDaylight: true,
    },
  };
}

function perfectFactors(): ScoreFactors {
  return {
    precipitation: 100,
    temperature: 100,
    wind: 100,
    humidity: 100,
    airQuality: 100,
    daylight: 100,
  };
}

function ratingFromScore(score: number): TimeSlot["rating"] {
  if (score >= 80) return "great";
  if (score >= 60) return "good";
  if (score >= 30) return "fair";
  return "avoid";
}

/** Build a Date at a specific local date/hour. */
function localAt(dateIso: string, hour: number): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

/** Slots for every hour of a date. */
function fullDay(dateIso: string, score = 70): TimeSlot[] {
  return Array.from({ length: 24 }, (_, hour) =>
    makeSlot(`${dateIso}T${String(hour).padStart(2, "0")}:00`, score),
  );
}

describe("buildWeekGrid", () => {
  it("returns an empty array for no slots", () => {
    expect(buildWeekGrid([], localAt("2026-05-21", 8))).toEqual([]);
  });

  it("creates one row per distinct date, ascending", () => {
    const slots = [
      ...fullDay("2026-05-22"),
      ...fullDay("2026-05-21"),
      ...fullDay("2026-05-23"),
    ];
    const rows = buildWeekGrid(slots, localAt("2026-05-21", 0));
    expect(rows.map((r) => r.dateIso)).toEqual([
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
    ]);
  });

  it("always produces 24 cells per row indexed by hour", () => {
    const rows = buildWeekGrid(fullDay("2026-05-21"), localAt("2026-05-21", 0));
    expect(rows[0].cells).toHaveLength(24);
    rows[0].cells.forEach((cell, hour) => {
      expect(cell.hourOfDay).toBe(hour);
      expect(cell.time).toBe(`2026-05-21T${String(hour).padStart(2, "0")}:00`);
    });
  });

  it("caps rows at MAX_WEEK_ROWS days", () => {
    const slots = Array.from({ length: 10 }, (_, i) =>
      fullDay(`2026-05-${String(21 + i).padStart(2, "0")}`),
    ).flat();
    const rows = buildWeekGrid(slots, localAt("2026-05-21", 0));
    expect(rows).toHaveLength(MAX_WEEK_ROWS);
    expect(rows[rows.length - 1].dateIso).toBe("2026-05-27");
  });

  it("marks hours before the current hour as past with a null slot", () => {
    const rows = buildWeekGrid(fullDay("2026-05-21"), localAt("2026-05-21", 8));
    const cells = rows[0].cells;
    expect(cells[7].isPast).toBe(true);
    expect(cells[7].slot).toBeNull();
    expect(cells[8].isPast).toBe(false);
  });

  it("treats the current hour as actionable (not past)", () => {
    const rows = buildWeekGrid(fullDay("2026-05-21"), localAt("2026-05-21", 8));
    const current = rows[0].cells[8];
    expect(current.isPast).toBe(false);
    expect(current.slot).not.toBeNull();
  });

  it("keeps future-hour slots populated", () => {
    const rows = buildWeekGrid(fullDay("2026-05-21"), localAt("2026-05-21", 8));
    const future = rows[0].cells[15];
    expect(future.isPast).toBe(false);
    expect(future.slot?.time).toBe("2026-05-21T15:00");
  });

  it("leaves out-of-horizon future hours as null without marking them past", () => {
    // Only 10:00 has data; 11:00 onward are future-but-missing.
    const rows = buildWeekGrid(
      [makeSlot("2026-05-21T10:00")],
      localAt("2026-05-21", 9),
    );
    const cell11 = rows[0].cells[11];
    expect(cell11.slot).toBeNull();
    expect(cell11.isPast).toBe(false);
  });

  it("marks all of a fully-past day as past", () => {
    const rows = buildWeekGrid(
      [...fullDay("2026-05-21"), ...fullDay("2026-05-22")],
      localAt("2026-05-22", 6),
    );
    expect(rows[0].cells.every((c) => c.isPast)).toBe(true);
    expect(rows[0].cells.every((c) => c.slot === null)).toBe(true);
  });

  it("labels today and tomorrow rows", () => {
    const rows = buildWeekGrid(
      [...fullDay("2026-05-21"), ...fullDay("2026-05-22")],
      localAt("2026-05-21", 0),
    );
    expect(rows[0].dayLabel).toBe("Today");
    expect(rows[1].dayLabel).toBe("Tomorrow");
  });

  it("labels later days with a localised weekday", () => {
    const rows = buildWeekGrid(fullDay("2026-05-25"), localAt("2026-05-21", 0));
    // Locale-robust: matches the runtime's own short-weekday for that date.
    const expected = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, 4, 25)));
    expect(rows[0].dayLabel).toBe(expected);
    expect(rows[0].dayLabel).not.toBe("2026-05-25");
  });
});

describe("findBestFutureCellTime", () => {
  it("returns null when there are no future cells with data", () => {
    const rows = buildWeekGrid(fullDay("2026-05-21"), localAt("2026-05-22", 0));
    expect(findBestFutureCellTime(rows)).toBeNull();
  });

  it("returns null for an empty grid", () => {
    expect(findBestFutureCellTime([])).toBeNull();
  });

  it("finds the highest-scoring future cell", () => {
    const slots = [
      makeSlot("2026-05-21T10:00", 50),
      makeSlot("2026-05-21T11:00", 90),
      makeSlot("2026-05-21T12:00", 70),
    ];
    const rows = buildWeekGrid(slots, localAt("2026-05-21", 9));
    expect(findBestFutureCellTime(rows)).toBe("2026-05-21T11:00");
  });

  it("ignores past cells even if they would score higher", () => {
    const slots = [
      makeSlot("2026-05-21T06:00", 99),
      makeSlot("2026-05-21T15:00", 80),
    ];
    const rows = buildWeekGrid(slots, localAt("2026-05-21", 10));
    expect(findBestFutureCellTime(rows)).toBe("2026-05-21T15:00");
  });

  it("resolves ties to the earliest time", () => {
    const slots = [
      makeSlot("2026-05-21T10:00", 88),
      makeSlot("2026-05-21T14:00", 88),
    ];
    const rows = buildWeekGrid(slots, localAt("2026-05-21", 9));
    expect(findBestFutureCellTime(rows)).toBe("2026-05-21T10:00");
  });
});
