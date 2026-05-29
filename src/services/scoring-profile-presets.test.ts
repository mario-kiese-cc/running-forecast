import { describe, it, expect } from "vitest";
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE,
  PRESET_LABELS,
} from "./scoring-profile-presets";
import { scoreHour } from "./run-scorer";
import type { HourlyData, ScoringProfile } from "../types";

describe("Built-in scoring presets", () => {
  it("should expose all five presets in the lookup", () => {
    expect(Object.keys(BUILT_IN_PROFILES).sort()).toEqual(
      [
        "cold-averse",
        "default",
        "heat-sensitive",
        "urban-air-quality",
        "winter-runner",
      ],
    );
  });

  it("DEFAULT_PROFILE should be the same object as the lookup entry", () => {
    expect(BUILT_IN_PROFILES.default).toBe(DEFAULT_PROFILE);
  });

  it("every preset's weights should sum to 1.0", () => {
    for (const profile of Object.values(BUILT_IN_PROFILES)) {
      const sum =
        profile.weights.precipitation +
        profile.weights.temperature +
        profile.weights.wind +
        profile.weights.humidity +
        profile.weights.airQuality +
        profile.weights.daylight;
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("every preset should have a valid ideal temperature range", () => {
    for (const profile of Object.values(BUILT_IN_PROFILES)) {
      const { low, high } = profile.idealApparentTempCelsius;
      expect(low).toBeLessThanOrEqual(high);
    }
  });

  it("every preset should have a darkness score within [0, 100]", () => {
    for (const profile of Object.values(BUILT_IN_PROFILES)) {
      expect(profile.darknessScore).toBeGreaterThanOrEqual(0);
      expect(profile.darknessScore).toBeLessThanOrEqual(100);
    }
  });

  it("every preset should have a human-readable label", () => {
    for (const key of Object.keys(BUILT_IN_PROFILES)) {
      expect(PRESET_LABELS[key as keyof typeof PRESET_LABELS]).toBeTruthy();
    }
    expect(PRESET_LABELS.custom).toBe("Custom");
  });
});

describe("Preset behavioural invariants", () => {
  function hotAfternoon(): HourlyData {
    return {
      conditions: {
        time: "2026-07-15T15:00",
        temperatureCelsius: 28,
        apparentTemperatureCelsius: 27,
        precipitationProbability: 0,
        precipitationMm: 0,
        relativeHumidity: 70,
        windSpeedKmh: 8,
        uvIndex: 8,
        isDaylight: true,
      },
      aqi: 40,
    };
  }

  function darkWinterMorning(): HourlyData {
    return {
      conditions: {
        time: "2026-01-15T07:00",
        temperatureCelsius: -1,
        apparentTemperatureCelsius: -4,
        precipitationProbability: 0,
        precipitationMm: 0,
        relativeHumidity: 70,
        windSpeedKmh: 10,
        uvIndex: 0,
        isDaylight: false,
      },
      aqi: 30,
    };
  }

  function scoreWith(profile: ScoringProfile, hourly: HourlyData): number {
    return scoreHour(hourly, profile).score;
  }

  it("heat-sensitive should rank a hot afternoon lower than default", () => {
    const defaultScore = scoreWith(DEFAULT_PROFILE, hotAfternoon());
    const heatScore = scoreWith(
      BUILT_IN_PROFILES["heat-sensitive"],
      hotAfternoon(),
    );
    expect(heatScore).toBeLessThan(defaultScore);
  });

  it("cold-averse should rank a hot afternoon higher than default", () => {
    const defaultScore = scoreWith(DEFAULT_PROFILE, hotAfternoon());
    const coldAverseScore = scoreWith(
      BUILT_IN_PROFILES["cold-averse"],
      hotAfternoon(),
    );
    expect(coldAverseScore).toBeGreaterThan(defaultScore);
  });

  it("winter-runner should rank a dark winter morning higher than default", () => {
    const defaultScore = scoreWith(DEFAULT_PROFILE, darkWinterMorning());
    const winterScore = scoreWith(
      BUILT_IN_PROFILES["winter-runner"],
      darkWinterMorning(),
    );
    expect(winterScore).toBeGreaterThan(defaultScore);
  });
});
