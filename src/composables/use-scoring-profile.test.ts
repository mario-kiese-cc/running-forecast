/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useScoringProfile,
  __resetScoringProfileForTests,
} from "./use-scoring-profile";
import { DEFAULT_PROFILE, BUILT_IN_PROFILES } from "../services/scoring-profile-presets";

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
  __resetScoringProfileForTests();
});

describe("useScoringProfile", () => {
  it("should initialise to DEFAULT_PROFILE when nothing is saved", () => {
    const { profile } = useScoringProfile();
    expect(profile.value).toEqual(DEFAULT_PROFILE);
  });

  it("should share state across multiple calls (singleton)", () => {
    const first = useScoringProfile();
    const second = useScoringProfile();
    expect(first.profile).toBe(second.profile);
  });

  it("setPreset should switch to a built-in preset and persist", () => {
    const { profile, setPreset } = useScoringProfile();
    setPreset("heat-sensitive");
    expect(profile.value).toEqual(BUILT_IN_PROFILES["heat-sensitive"]);
    expect(storage.get("running-forecast:scoring-profile")).toContain(
      "heat-sensitive",
    );
  });

  it("updateWeight should fork to a custom profile preserving basedOn", () => {
    const { profile, setPreset, updateWeight } = useScoringProfile();
    setPreset("cold-averse");
    updateWeight("wind", 0.5);
    expect(profile.value.preset).toBe("custom");
    expect(profile.value.basedOn).toBe("cold-averse");
    // Re-normalised so the six weights still sum to 1.
    const sum =
      profile.value.weights.precipitation +
      profile.value.weights.temperature +
      profile.value.weights.wind +
      profile.value.weights.humidity +
      profile.value.weights.airQuality +
      profile.value.weights.daylight;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("updateIdealRange should produce a custom profile with the new range", () => {
    const { profile, updateIdealRange } = useScoringProfile();
    updateIdealRange({ low: 5, high: 15 });
    expect(profile.value.preset).toBe("custom");
    expect(profile.value.idealApparentTempCelsius).toEqual({ low: 5, high: 15 });
  });

  it("updateDarknessScore should persist the new value", () => {
    const { profile, updateDarknessScore } = useScoringProfile();
    updateDarknessScore(75);
    expect(profile.value.darknessScore).toBe(75);
  });

  it("reset should restore DEFAULT_PROFILE and clear storage", () => {
    const { profile, setPreset, reset } = useScoringProfile();
    setPreset("heat-sensitive");
    expect(storage.size).toBe(1);
    reset();
    expect(profile.value).toEqual(DEFAULT_PROFILE);
    expect(storage.size).toBe(0);
  });

  it("should rehydrate from a previously saved profile on a fresh singleton", () => {
    const first = useScoringProfile();
    first.setPreset("winter-runner");

    __resetScoringProfileForTests();
    const second = useScoringProfile();
    expect(second.profile.value).toEqual(BUILT_IN_PROFILES["winter-runner"]);
  });
});
