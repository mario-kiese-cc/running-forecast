import { describe, it, expect } from "vitest";
import {
  scorePrecipitation,
  scoreTemperature,
  scoreWind,
  scoreHumidity,
  scoreAirQuality,
  scoreDaylight,
  computeFactors,
  computeOverallScore,
  scoreToRating,
  scoreHour,
  scoreAllHours,
} from "./run-scorer";
import type { HourlyData, HourlyConditions } from "../types";

/** Helper to build HourlyConditions with sensible defaults */
function makeConditions(
  overrides: Partial<HourlyConditions> = {},
): HourlyConditions {
  return {
    time: "2026-05-21T10:00",
    temperatureCelsius: 14,
    apparentTemperatureCelsius: 13,
    precipitationProbability: 0,
    precipitationMm: 0,
    relativeHumidity: 50,
    windSpeedKmh: 5,
    uvIndex: 3,
    isDaylight: true,
    ...overrides,
  };
}

function makeHourlyData(
  conditionOverrides: Partial<HourlyConditions> = {},
  aqi?: number,
): HourlyData {
  return {
    conditions: makeConditions(conditionOverrides),
    aqi,
  };
}

// --- Precipitation ---

describe("scorePrecipitation", () => {
  it("should return 100 for 0% probability and no rain", () => {
    expect(scorePrecipitation(0, 0)).toBe(100);
  });

  it("should return 0 for 70% or higher probability", () => {
    expect(scorePrecipitation(70, 0)).toBe(0);
    expect(scorePrecipitation(100, 0)).toBe(0);
  });

  it("should return ~50 for 35% probability", () => {
    const score = scorePrecipitation(35, 0);
    expect(score).toBeCloseTo(50, 0);
  });

  it("should penalize heavy rain intensity regardless of probability", () => {
    // 0% probability but 5mm/h actual rain → 0
    expect(scorePrecipitation(0, 5)).toBe(0);
  });

  it("should use the lower of probability and intensity scores", () => {
    // Low probability but moderate rain
    const score = scorePrecipitation(10, 2.5);
    expect(score).toBe(50);
  });
});

// --- Temperature ---

describe("scoreTemperature", () => {
  it("should return 100 in the ideal range (8–18°C)", () => {
    expect(scoreTemperature(8)).toBe(100);
    expect(scoreTemperature(13)).toBe(100);
    expect(scoreTemperature(18)).toBe(100);
  });

  it("should return 0 at or below -5°C", () => {
    expect(scoreTemperature(-5)).toBe(0);
    expect(scoreTemperature(-10)).toBe(0);
  });

  it("should return 0 at or above 35°C", () => {
    expect(scoreTemperature(35)).toBe(0);
    expect(scoreTemperature(40)).toBe(0);
  });

  it("should degrade linearly below ideal range", () => {
    // Midpoint between -5 and 8 is 1.5°C → ~50
    const score = scoreTemperature(1.5);
    expect(score).toBeCloseTo(50, 0);
  });

  it("should degrade linearly above ideal range", () => {
    // Midpoint between 18 and 35 is 26.5°C → ~50
    const score = scoreTemperature(26.5);
    expect(score).toBeCloseTo(50, 0);
  });
});

// --- Wind ---

describe("scoreWind", () => {
  it("should return 100 for calm wind (0–10 km/h)", () => {
    expect(scoreWind(0)).toBe(100);
    expect(scoreWind(5)).toBe(100);
    expect(scoreWind(10)).toBe(100);
  });

  it("should return 0 for extreme wind (≥50 km/h)", () => {
    expect(scoreWind(50)).toBe(0);
    expect(scoreWind(80)).toBe(0);
  });

  it("should return 50 for 30 km/h", () => {
    expect(scoreWind(30)).toBe(50);
  });
});

// --- Humidity ---

describe("scoreHumidity", () => {
  it("should return 100 in the ideal range (40–60%)", () => {
    expect(scoreHumidity(40)).toBe(100);
    expect(scoreHumidity(50)).toBe(100);
    expect(scoreHumidity(60)).toBe(100);
  });

  it("should return 0 at 90% or above", () => {
    expect(scoreHumidity(90)).toBe(0);
    expect(scoreHumidity(100)).toBe(0);
  });

  it("should return 0 at 10% or below", () => {
    expect(scoreHumidity(10)).toBe(0);
    expect(scoreHumidity(0)).toBe(0);
  });

  it("should degrade linearly above ideal range", () => {
    // 75% is midpoint between 60 and 90 → ~50
    expect(scoreHumidity(75)).toBeCloseTo(50, 0);
  });
});

// --- Air Quality ---

describe("scoreAirQuality", () => {
  it("should return 100 for good AQI (0–50)", () => {
    expect(scoreAirQuality(0)).toBe(100);
    expect(scoreAirQuality(50)).toBe(100);
  });

  it("should return 0 for unhealthy AQI (≥150)", () => {
    expect(scoreAirQuality(150)).toBe(0);
    expect(scoreAirQuality(300)).toBe(0);
  });

  it("should return 100 when AQI is unavailable", () => {
    expect(scoreAirQuality(undefined)).toBe(100);
  });

  it("should return 50 for AQI of 100", () => {
    expect(scoreAirQuality(100)).toBe(50);
  });
});

// --- Daylight ---

describe("scoreDaylight", () => {
  it("should return 100 for daylight", () => {
    expect(scoreDaylight(true)).toBe(100);
  });

  it("should return 20 for darkness (not 0 — running in dark is possible)", () => {
    expect(scoreDaylight(false)).toBe(20);
  });
});

// --- Score to Rating ---

describe("scoreToRating", () => {
  it("should return 'great' for scores ≥ 80", () => {
    expect(scoreToRating(80)).toBe("great");
    expect(scoreToRating(100)).toBe("great");
  });

  it("should return 'good' for scores 60–79", () => {
    expect(scoreToRating(60)).toBe("good");
    expect(scoreToRating(79)).toBe("good");
  });

  it("should return 'fair' for scores 30–59", () => {
    expect(scoreToRating(30)).toBe("fair");
    expect(scoreToRating(59)).toBe("fair");
  });

  it("should return 'avoid' for scores < 30", () => {
    expect(scoreToRating(0)).toBe("avoid");
    expect(scoreToRating(29)).toBe("avoid");
  });
});

// --- Integration: computeFactors + computeOverallScore ---

describe("computeFactors", () => {
  it("should return all 100s for perfect conditions", () => {
    const hourly = makeHourlyData({}, 20);
    const factors = computeFactors(hourly);

    expect(factors.precipitation).toBe(100);
    expect(factors.temperature).toBe(100);
    expect(factors.wind).toBe(100);
    expect(factors.humidity).toBe(100);
    expect(factors.airQuality).toBe(100);
    expect(factors.daylight).toBe(100);
  });

  it("should reflect bad precipitation in the precipitation factor only", () => {
    const hourly = makeHourlyData({ precipitationProbability: 70 });
    const factors = computeFactors(hourly);

    expect(factors.precipitation).toBe(0);
    expect(factors.temperature).toBe(100);
  });
});

describe("computeOverallScore", () => {
  it("should return 100 for all-perfect factors", () => {
    const score = computeOverallScore({
      precipitation: 100,
      temperature: 100,
      wind: 100,
      humidity: 100,
      airQuality: 100,
      daylight: 100,
    });
    expect(score).toBe(100);
  });

  it("should return 0 for all-zero factors", () => {
    const score = computeOverallScore({
      precipitation: 0,
      temperature: 0,
      wind: 0,
      humidity: 0,
      airQuality: 0,
      daylight: 0,
    });
    expect(score).toBe(0);
  });

  it("should weight precipitation highest (30%)", () => {
    // Only precipitation is bad → score drops by 30 points
    const score = computeOverallScore({
      precipitation: 0,
      temperature: 100,
      wind: 100,
      humidity: 100,
      airQuality: 100,
      daylight: 100,
    });
    expect(score).toBe(70);
  });

  it("should be clamped between 0 and 100", () => {
    const score = computeOverallScore({
      precipitation: 150,
      temperature: 150,
      wind: 150,
      humidity: 150,
      airQuality: 150,
      daylight: 150,
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});

// --- End-to-end: scoreHour ---

describe("scoreHour", () => {
  it("should produce a 'great' slot for perfect conditions", () => {
    const hourly = makeHourlyData({}, 20);
    const slot = scoreHour(hourly);

    expect(slot.score).toBe(100);
    expect(slot.rating).toBe("great");
    expect(slot.time).toBe("2026-05-21T10:00");
    expect(slot.conditions).toEqual(hourly.conditions);
    expect(slot.aqi).toBe(20);
  });

  it("should produce an 'avoid' slot for rainy, hot, windy, humid, polluted night", () => {
    const hourly = makeHourlyData(
      {
        precipitationProbability: 100,
        precipitationMm: 10,
        apparentTemperatureCelsius: 38,
        windSpeedKmh: 60,
        relativeHumidity: 95,
        isDaylight: false,
      },
      200,
    );
    const slot = scoreHour(hourly);

    // Darkness scores 20 (not 0), contributing 2 points (20 × 0.10 weight)
    expect(slot.score).toBe(2);
    expect(slot.rating).toBe("avoid");
  });

  it("should handle missing AQI gracefully", () => {
    const hourly = makeHourlyData({});
    const slot = scoreHour(hourly);

    // AQI defaults to 100 score when missing, so overall should still be high
    expect(slot.score).toBeGreaterThanOrEqual(80);
    expect(slot.aqi).toBeUndefined();
  });
});

// --- scoreAllHours ---

describe("scoreAllHours", () => {
  it("should score multiple hours and preserve order", () => {
    const hours: HourlyData[] = [
      makeHourlyData({ time: "2026-05-21T06:00" }),
      makeHourlyData({ time: "2026-05-21T07:00", precipitationProbability: 80 }),
      makeHourlyData({ time: "2026-05-21T08:00" }),
    ];
    const slots = scoreAllHours(hours);

    expect(slots).toHaveLength(3);
    expect(slots[0].time).toBe("2026-05-21T06:00");
    expect(slots[1].time).toBe("2026-05-21T07:00");
    expect(slots[2].time).toBe("2026-05-21T08:00");

    // Middle slot should score much lower (rainy)
    expect(slots[1].score).toBeLessThan(slots[0].score);
    expect(slots[1].score).toBeLessThan(slots[2].score);
  });

  it("should return empty array for empty input", () => {
    expect(scoreAllHours([])).toEqual([]);
  });
});
