import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RUN_TYPE,
  RUN_TYPE_MODIFIERS,
  RUN_TYPE_ORDER,
  applyRunTypeModifier,
  clearRunType,
  loadRunType,
  runTypeLabel,
  saveRunType,
} from "./run-type";
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE,
} from "./scoring-profile-presets";
import type { RunType, ScoringWeights } from "../types";

const WEIGHT_KEYS: ReadonlyArray<keyof ScoringWeights> = [
  "precipitation",
  "temperature",
  "wind",
  "humidity",
  "airQuality",
  "daylight",
];

function sumWeights(weights: ScoringWeights): number {
  return WEIGHT_KEYS.reduce((acc, key) => acc + weights[key], 0);
}

describe("RUN_TYPE_MODIFIERS", () => {
  it("defines exactly the five spec'd run types", () => {
    expect(Object.keys(RUN_TYPE_MODIFIERS).sort()).toEqual(
      ["easy", "intervals", "long", "recovery", "tempo"],
    );
  });

  it("RUN_TYPE_ORDER lists every run type once", () => {
    expect([...RUN_TYPE_ORDER].sort()).toEqual(
      ["easy", "intervals", "long", "recovery", "tempo"],
    );
    expect(new Set(RUN_TYPE_ORDER).size).toBe(RUN_TYPE_ORDER.length);
  });

  it("every modifier has a non-empty label and description", () => {
    for (const runType of RUN_TYPE_ORDER) {
      const modifier = RUN_TYPE_MODIFIERS[runType];
      expect(modifier.label.length).toBeGreaterThan(0);
      expect(modifier.description.length).toBeGreaterThan(0);
    }
  });

  it("every weight multiplier is finite and >= 0", () => {
    for (const runType of RUN_TYPE_ORDER) {
      for (const value of Object.values(
        RUN_TYPE_MODIFIERS[runType].weightMultipliers,
      )) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value as number).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("recovery is the only modifier that overrides the good threshold", () => {
    for (const runType of RUN_TYPE_ORDER) {
      const override = RUN_TYPE_MODIFIERS[runType].goodThresholdOverride;
      if (runType === "recovery") {
        expect(override).toBe(50);
      } else {
        expect(override).toBeUndefined();
      }
    }
  });

  it("easy is a true no-op modifier", () => {
    const easy = RUN_TYPE_MODIFIERS.easy;
    expect(easy.idealShiftCelsius).toEqual({ low: 0, high: 0 });
    expect(easy.weightMultipliers).toEqual({});
    expect(easy.goodThresholdOverride).toBeUndefined();
  });
});

describe("applyRunTypeModifier", () => {
  it("easy modifier returns a profile with the same weights and ideal range", () => {
    const effective = applyRunTypeModifier(DEFAULT_PROFILE, "easy");
    for (const key of WEIGHT_KEYS) {
      expect(effective.weights[key]).toBeCloseTo(
        DEFAULT_PROFILE.weights[key],
        9,
      );
    }
    expect(effective.idealApparentTempCelsius).toEqual(
      DEFAULT_PROFILE.idealApparentTempCelsius,
    );
    expect(effective.goodThresholdOverride).toBeUndefined();
  });

  it("preserves preset / basedOn / darknessScore from the source profile", () => {
    const heatSensitive = BUILT_IN_PROFILES["heat-sensitive"];
    const effective = applyRunTypeModifier(heatSensitive, "intervals");
    expect(effective.preset).toBe(heatSensitive.preset);
    expect(effective.darknessScore).toBe(heatSensitive.darknessScore);
    expect(effective.schemaVersion).toBe(1);
  });

  it("renormalises weights to sum to 1.0 for every (profile, runType) combination", () => {
    for (const profile of Object.values(BUILT_IN_PROFILES)) {
      for (const runType of RUN_TYPE_ORDER) {
        const effective = applyRunTypeModifier(profile, runType);
        expect(Math.abs(sumWeights(effective.weights) - 1)).toBeLessThan(
          1e-9,
        );
      }
    }
  });

  it("intervals shifts the ideal range cooler relative to the source", () => {
    const effective = applyRunTypeModifier(DEFAULT_PROFILE, "intervals");
    expect(effective.idealApparentTempCelsius.low).toBe(
      DEFAULT_PROFILE.idealApparentTempCelsius.low - 2,
    );
    expect(effective.idealApparentTempCelsius.high).toBe(
      DEFAULT_PROFILE.idealApparentTempCelsius.high - 3,
    );
  });

  it("recovery shifts the ideal range warmer and sets the threshold override", () => {
    const effective = applyRunTypeModifier(DEFAULT_PROFILE, "recovery");
    expect(effective.idealApparentTempCelsius.low).toBe(
      DEFAULT_PROFILE.idealApparentTempCelsius.low + 1,
    );
    expect(effective.idealApparentTempCelsius.high).toBe(
      DEFAULT_PROFILE.idealApparentTempCelsius.high + 2,
    );
    expect(effective.goodThresholdOverride).toBe(50);
  });

  it("increases the temperature weight share when intervals is applied", () => {
    const effective = applyRunTypeModifier(DEFAULT_PROFILE, "intervals");
    expect(effective.weights.temperature).toBeGreaterThan(
      DEFAULT_PROFILE.weights.temperature,
    );
    expect(effective.weights.precipitation).toBeLessThan(
      DEFAULT_PROFILE.weights.precipitation,
    );
  });

  it("clamps the combined ideal range to [-10, 25] °C", () => {
    // Winter runner already sits at -2 / 10; intervals would push to -4 / 7.
    // To exercise clamping, start from a synthetic extreme profile.
    const extremeProfile = {
      ...DEFAULT_PROFILE,
      idealApparentTempCelsius: { low: -9, high: 24 },
    };
    const intervals = applyRunTypeModifier(extremeProfile, "intervals");
    expect(intervals.idealApparentTempCelsius.low).toBeGreaterThanOrEqual(
      -10,
    );
    expect(intervals.idealApparentTempCelsius.high).toBeLessThanOrEqual(25);

    const recoveryExtreme = {
      ...DEFAULT_PROFILE,
      idealApparentTempCelsius: { low: 23, high: 24 },
    };
    const recovery = applyRunTypeModifier(recoveryExtreme, "recovery");
    expect(recovery.idealApparentTempCelsius.high).toBeLessThanOrEqual(25);
  });

  it("does not mutate the input profile", () => {
    const snapshot = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    applyRunTypeModifier(DEFAULT_PROFILE, "intervals");
    expect(DEFAULT_PROFILE).toEqual(snapshot);
  });

  it("heat-sensitive × intervals stays within the clamp domain", () => {
    const heatSensitive = BUILT_IN_PROFILES["heat-sensitive"];
    const effective = applyRunTypeModifier(heatSensitive, "intervals");
    expect(effective.idealApparentTempCelsius.low).toBeGreaterThanOrEqual(
      -10,
    );
    expect(effective.idealApparentTempCelsius.low).toBeLessThanOrEqual(
      effective.idealApparentTempCelsius.high,
    );
  });
});

// Minimal localStorage shim for jsdom (mirrors scoring-profile.test.ts).
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

describe("persistence", () => {
  beforeEach(() => {
    storage.clear();
  });

  afterEach(() => {
    storage.clear();
  });

  it("loadRunType returns the default when nothing is stored", () => {
    expect(loadRunType()).toBe(DEFAULT_RUN_TYPE);
    expect(DEFAULT_RUN_TYPE).toBe("easy");
  });

  it("saveRunType + loadRunType round-trips every run type", () => {
    const runTypes: RunType[] = [
      "easy",
      "long",
      "tempo",
      "intervals",
      "recovery",
    ];
    for (const runType of runTypes) {
      saveRunType(runType);
      expect(loadRunType()).toBe(runType);
    }
  });

  it("loadRunType falls back to the default for an unrecognised value", () => {
    localStorage.setItem("running-forecast:run-type", "not-a-run-type");
    expect(loadRunType()).toBe(DEFAULT_RUN_TYPE);
  });

  it("clearRunType removes the saved value", () => {
    saveRunType("intervals");
    clearRunType();
    expect(loadRunType()).toBe(DEFAULT_RUN_TYPE);
  });
});

describe("runTypeLabel", () => {
  it("returns the modifier's label", () => {
    expect(runTypeLabel("easy")).toBe("Easy");
    expect(runTypeLabel("intervals")).toBe("Intervals");
    expect(runTypeLabel("recovery")).toBe("Recovery");
  });
});
