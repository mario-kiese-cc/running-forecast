/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeWeights,
  withCustomEdit,
  profileLabel,
  loadProfile,
  saveProfile,
  clearProfile,
  presetProfile,
} from "./scoring-profile";
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE,
} from "./scoring-profile-presets";
import type { ScoringProfile } from "../types";

// Minimal localStorage shim for jsdom.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get length() {
      return storage.size;
    },
    key: vi.fn(() => null),
  },
  writable: true,
});

beforeEach(() => {
  storage.clear();
});

describe("normalizeWeights", () => {
  it("should leave already-normalised weights unchanged", () => {
    const result = normalizeWeights(DEFAULT_PROFILE.weights);
    const sum =
      result.precipitation +
      result.temperature +
      result.wind +
      result.humidity +
      result.airQuality +
      result.daylight;
    expect(sum).toBeCloseTo(1.0, 5);
    expect(result.precipitation).toBeCloseTo(0.3, 5);
  });

  it("should scale raw input so weights sum to 1.0", () => {
    const result = normalizeWeights({
      precipitation: 50,
      temperature: 50,
      wind: 0,
      humidity: 0,
      airQuality: 0,
      daylight: 0,
    });
    expect(result.precipitation).toBeCloseTo(0.5, 5);
    expect(result.temperature).toBeCloseTo(0.5, 5);
    expect(result.wind).toBe(0);
  });

  it("should treat negative and non-finite inputs as 0", () => {
    const result = normalizeWeights({
      precipitation: -10,
      temperature: 50,
      wind: Number.NaN,
      humidity: Number.POSITIVE_INFINITY,
      airQuality: 50,
      daylight: 0,
    });
    expect(result.precipitation).toBe(0);
    expect(result.wind).toBe(0);
    expect(result.humidity).toBe(0);
    expect(result.temperature).toBeCloseTo(0.5, 5);
    expect(result.airQuality).toBeCloseTo(0.5, 5);
  });

  it("should fall back to default weights when all inputs are zero", () => {
    const result = normalizeWeights({
      precipitation: 0,
      temperature: 0,
      wind: 0,
      humidity: 0,
      airQuality: 0,
      daylight: 0,
    });
    expect(result).toEqual(DEFAULT_PROFILE.weights);
  });
});

describe("withCustomEdit", () => {
  it("should fork a built-in preset into a custom profile", () => {
    const result = withCustomEdit(BUILT_IN_PROFILES["heat-sensitive"], {
      weights: { wind: 0.5 },
    });
    expect(result.preset).toBe("custom");
    expect(result.basedOn).toBe("heat-sensitive");
  });

  it("should normalise weights after a patch", () => {
    const result = withCustomEdit(DEFAULT_PROFILE, {
      weights: { temperature: 1 },
    });
    const sum =
      result.weights.precipitation +
      result.weights.temperature +
      result.weights.wind +
      result.weights.humidity +
      result.weights.airQuality +
      result.weights.daylight;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("should preserve basedOn when editing an already-custom profile", () => {
    const first = withCustomEdit(BUILT_IN_PROFILES["winter-runner"], {
      darknessScore: 80,
    });
    const second = withCustomEdit(first, { darknessScore: 90 });
    expect(second.basedOn).toBe("winter-runner");
    expect(second.darknessScore).toBe(90);
  });

  it("should swap low/high if the user inverts the temperature range", () => {
    const result = withCustomEdit(DEFAULT_PROFILE, {
      idealApparentTempCelsius: { low: 20, high: 5 },
    });
    expect(result.idealApparentTempCelsius.low).toBe(5);
    expect(result.idealApparentTempCelsius.high).toBe(20);
  });

  it("should clamp darknessScore to [0, 100]", () => {
    expect(
      withCustomEdit(DEFAULT_PROFILE, { darknessScore: -10 }).darknessScore,
    ).toBe(0);
    expect(
      withCustomEdit(DEFAULT_PROFILE, { darknessScore: 250 }).darknessScore,
    ).toBe(100);
  });

  it("never propagates goodThresholdOverride from the source profile", () => {
    // Simulate a profile that has the run-type override smuggled onto it.
    const tainted: ScoringProfile = {
      ...DEFAULT_PROFILE,
      goodThresholdOverride: 50,
    };
    const result = withCustomEdit(tainted, { darknessScore: 25 });
    expect(result.goodThresholdOverride).toBeUndefined();
  });
});

describe("profileLabel", () => {
  it("should return the preset name for built-in profiles", () => {
    expect(profileLabel(DEFAULT_PROFILE)).toBe("Default");
    expect(profileLabel(BUILT_IN_PROFILES["heat-sensitive"])).toBe(
      "Heat-sensitive",
    );
  });

  it("should annotate custom profiles with their basedOn preset", () => {
    const custom = withCustomEdit(BUILT_IN_PROFILES["heat-sensitive"], {
      darknessScore: 50,
    });
    expect(profileLabel(custom)).toBe("Custom (based on Heat-sensitive)");
  });

  it("should fall back to 'based on Default' when basedOn is missing", () => {
    const orphan: ScoringProfile = {
      ...DEFAULT_PROFILE,
      preset: "custom",
    };
    expect(profileLabel(orphan)).toBe("Custom (based on Default)");
  });
});

describe("presetProfile", () => {
  it("should return the canonical built-in profile", () => {
    expect(presetProfile("winter-runner")).toBe(
      BUILT_IN_PROFILES["winter-runner"],
    );
  });
});

describe("loadProfile / saveProfile", () => {
  it("should return DEFAULT_PROFILE when nothing is saved", () => {
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it("should round-trip a saved profile", () => {
    const custom = withCustomEdit(BUILT_IN_PROFILES["cold-averse"], {
      darknessScore: 60,
    });
    saveProfile(custom);
    expect(loadProfile()).toEqual(custom);
  });

  it("should ignore invalid JSON and fall back to default", () => {
    storage.set("running-forecast:scoring-profile", "not-json{");
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it("should reject blobs with the wrong schema version", () => {
    storage.set(
      "running-forecast:scoring-profile",
      JSON.stringify({ ...DEFAULT_PROFILE, schemaVersion: 99 }),
    );
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it("should reject blobs whose weights do not sum to 1.0", () => {
    storage.set(
      "running-forecast:scoring-profile",
      JSON.stringify({
        ...DEFAULT_PROFILE,
        weights: {
          precipitation: 0.5,
          temperature: 0.5,
          wind: 0.5,
          humidity: 0.5,
          airQuality: 0,
          daylight: 0,
        },
      }),
    );
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it("should reject blobs with an inverted ideal temperature range", () => {
    storage.set(
      "running-forecast:scoring-profile",
      JSON.stringify({
        ...DEFAULT_PROFILE,
        idealApparentTempCelsius: { low: 20, high: 5 },
      }),
    );
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });
});

describe("clearProfile", () => {
  it("should remove the persisted profile", () => {
    saveProfile(BUILT_IN_PROFILES["heat-sensitive"]);
    clearProfile();
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });
});
