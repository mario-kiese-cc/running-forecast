import { describe, it, expect } from "vitest";
import {
  buildWindows,
  findBestWindows,
  buildDayForecasts,
  getTodayString,
  type TimeWindow,
} from "./slot-builder";
import type { TimeSlot, ScoreFactors } from "../types";

/** Helper to build a minimal TimeSlot for testing */
function makeSlot(
  time: string,
  score: number,
  rating: TimeSlot["rating"] = scoreToRating(score),
): TimeSlot {
  return {
    time,
    score,
    rating,
    factors: makePerfectFactors(),
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

function makePerfectFactors(): ScoreFactors {
  return {
    precipitation: 100,
    temperature: 100,
    wind: 100,
    humidity: 100,
    airQuality: 100,
    daylight: 100,
  };
}

function scoreToRating(score: number): TimeSlot["rating"] {
  if (score >= 80) return "great";
  if (score >= 60) return "good";
  if (score >= 30) return "fair";
  return "avoid";
}

// --- buildWindows ---

describe("buildWindows", () => {
  it("should return empty array for empty input", () => {
    expect(buildWindows([])).toEqual([]);
  });

  it("should create a single window when all slots share a rating", () => {
    const slots = [
      makeSlot("2026-05-21T06:00", 90),
      makeSlot("2026-05-21T07:00", 85),
      makeSlot("2026-05-21T08:00", 95),
    ];
    const windows = buildWindows(slots);

    expect(windows).toHaveLength(1);
    expect(windows[0].rating).toBe("great");
    expect(windows[0].hours).toBe(3);
    expect(windows[0].startTime).toBe("2026-05-21T06:00");
    expect(windows[0].endTime).toBe("2026-05-21T09:00");
    expect(windows[0].averageScore).toBe(90);
  });

  it("should split windows when rating changes", () => {
    const slots = [
      makeSlot("2026-05-21T06:00", 85), // great
      makeSlot("2026-05-21T07:00", 90), // great
      makeSlot("2026-05-21T08:00", 50), // fair
      makeSlot("2026-05-21T09:00", 45), // fair
      makeSlot("2026-05-21T10:00", 75), // good
    ];
    const windows = buildWindows(slots);

    expect(windows).toHaveLength(3);
    expect(windows[0].rating).toBe("great");
    expect(windows[0].hours).toBe(2);
    expect(windows[1].rating).toBe("fair");
    expect(windows[1].hours).toBe(2);
    expect(windows[2].rating).toBe("good");
    expect(windows[2].hours).toBe(1);
  });

  it("should handle a single slot", () => {
    const slots = [makeSlot("2026-05-21T12:00", 70)];
    const windows = buildWindows(slots);

    expect(windows).toHaveLength(1);
    expect(windows[0].hours).toBe(1);
    expect(windows[0].startTime).toBe("2026-05-21T12:00");
    expect(windows[0].endTime).toBe("2026-05-21T13:00");
  });

  it("should compute end time correctly for hour 23", () => {
    const slots = [makeSlot("2026-05-21T23:00", 30)];
    const windows = buildWindows(slots);

    expect(windows[0].endTime).toBe("2026-05-22T00:00");
  });

  it("should compute average score correctly", () => {
    const slots = [
      makeSlot("2026-05-21T06:00", 80),
      makeSlot("2026-05-21T07:00", 100),
    ];
    const windows = buildWindows(slots);

    expect(windows[0].averageScore).toBe(90);
  });
});

// --- findBestWindows ---

describe("findBestWindows", () => {
  it("should return great and good windows sorted by score", () => {
    const windows: TimeWindow[] = [
      {
        startTime: "2026-05-21T06:00",
        endTime: "2026-05-21T09:00",
        averageScore: 85,
        rating: "great",
        hours: 3,
        slots: [],
      },
      {
        startTime: "2026-05-21T10:00",
        endTime: "2026-05-21T12:00",
        averageScore: 40,
        rating: "fair",
        hours: 2,
        slots: [],
      },
      {
        startTime: "2026-05-21T16:00",
        endTime: "2026-05-21T19:00",
        averageScore: 65,
        rating: "good",
        hours: 3,
        slots: [],
      },
    ];
    const best = findBestWindows(windows);

    expect(best).toHaveLength(2);
    expect(best[0].rating).toBe("great");
    expect(best[1].rating).toBe("good");
  });

  it("should return the least-bad window when no good/great exist", () => {
    const windows: TimeWindow[] = [
      {
        startTime: "2026-05-21T06:00",
        endTime: "2026-05-21T09:00",
        averageScore: 20,
        rating: "avoid",
        hours: 3,
        slots: [],
      },
      {
        startTime: "2026-05-21T10:00",
        endTime: "2026-05-21T13:00",
        averageScore: 45,
        rating: "fair",
        hours: 3,
        slots: [],
      },
    ];
    const best = findBestWindows(windows);

    expect(best).toHaveLength(1);
    expect(best[0].averageScore).toBe(45);
  });

  it("should return empty array for empty input", () => {
    expect(findBestWindows([])).toEqual([]);
  });
});

// --- buildDayForecasts ---

describe("buildDayForecasts", () => {
  const TODAY = "2026-05-21";

  it("should group slots by date and label today/tomorrow", () => {
    const slots = [
      makeSlot("2026-05-21T08:00", 90),
      makeSlot("2026-05-21T09:00", 85),
      makeSlot("2026-05-22T08:00", 70),
      makeSlot("2026-05-22T09:00", 75),
    ];
    const forecasts = buildDayForecasts(slots, TODAY);

    expect(forecasts).toHaveLength(2);
    expect(forecasts[0].date).toBe("2026-05-21");
    expect(forecasts[0].label).toBe("Today");
    expect(forecasts[0].slots).toHaveLength(2);
    expect(forecasts[1].date).toBe("2026-05-22");
    expect(forecasts[1].label).toBe("Tomorrow");
    expect(forecasts[1].slots).toHaveLength(2);
  });

  it("should identify best windows per day", () => {
    const slots = [
      makeSlot("2026-05-21T06:00", 90), // great
      makeSlot("2026-05-21T07:00", 85), // great
      makeSlot("2026-05-21T12:00", 20), // avoid
      makeSlot("2026-05-21T17:00", 70), // good
    ];
    const forecasts = buildDayForecasts(slots, TODAY);
    const today = forecasts[0];

    expect(today.bestWindows.length).toBeGreaterThan(0);
    expect(today.bestWindows[0].rating).toBe("great");
    expect(today.bestWindowsAreLateNight).toBe(false);
  });

  it("should exclude nighttime hours (21:00–05:59) from best windows when daytime alternatives exist", () => {
    const slots = [
      makeSlot("2026-05-21T05:00", 95), // night — should be ignored
      makeSlot("2026-05-21T08:00", 70), // good daytime
      makeSlot("2026-05-21T22:00", 95), // night — should be ignored
    ];
    const forecasts = buildDayForecasts(slots, TODAY);
    const today = forecasts[0];

    expect(today.bestWindows).toHaveLength(1);
    expect(today.bestWindows[0].startTime).toBe("2026-05-21T08:00");
    expect(today.bestWindowsAreLateNight).toBe(false);
    // Hourly slots are still present in the day view.
    expect(today.slots).toHaveLength(3);
  });

  it("should fall back to nighttime windows and flag isLateNight when no daytime hours rate well", () => {
    const slots = [
      makeSlot("2026-05-21T12:00", 20), // avoid daytime
      makeSlot("2026-05-21T22:00", 95), // great night
    ];
    const forecasts = buildDayForecasts(slots, TODAY);
    const today = forecasts[0];

    expect(today.bestWindows.length).toBeGreaterThan(0);
    expect(today.bestWindowsAreLateNight).toBe(true);
  });

  it("should keep isLateNight false when fallback picks a daytime window", () => {
    const slots = [
      makeSlot("2026-05-21T12:00", 45), // fair daytime — wins fallback
      makeSlot("2026-05-21T22:00", 20), // night avoid
    ];
    const forecasts = buildDayForecasts(slots, TODAY);
    const today = forecasts[0];

    expect(today.bestWindows).toHaveLength(1);
    expect(today.bestWindows[0].startTime).toBe("2026-05-21T12:00");
    expect(today.bestWindowsAreLateNight).toBe(false);
  });

  it("should use date string as label for non-today/tomorrow dates", () => {
    const slots = [makeSlot("2026-05-25T10:00", 80)];
    const forecasts = buildDayForecasts(slots, TODAY);

    expect(forecasts[0].label).toBe("2026-05-25");
  });

  it("should handle empty input", () => {
    expect(buildDayForecasts([], TODAY)).toEqual([]);
  });
});

// --- getTodayString ---

describe("getTodayString", () => {
  it("should return a string in YYYY-MM-DD format", () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should return today's date", () => {
    const today = getTodayString();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(today).toBe(expected);
  });
});
