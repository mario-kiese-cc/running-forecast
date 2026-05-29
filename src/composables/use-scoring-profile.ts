import { ref } from "vue";
import type { Ref } from "vue";
import type {
  ScoringProfile,
  ScoringProfilePreset,
  ScoringWeights,
} from "../types";
import {
  clearProfile,
  loadProfile,
  presetProfile,
  saveProfile,
  withCustomEdit,
} from "../services/scoring-profile";
import { DEFAULT_PROFILE } from "../services/scoring-profile-presets";

/**
 * Module-level singleton so every consumer (header pill, settings panel,
 * weather composable) shares one reactive profile. Lazy-initialised on
 * first call to avoid touching `localStorage` at module-evaluation time
 * (which breaks in SSR / non-jsdom test environments).
 */
let profileRef: Ref<ScoringProfile> | null = null;

function ensureRef(): Ref<ScoringProfile> {
  if (profileRef === null) {
    profileRef = ref<ScoringProfile>(loadProfile());
  }
  return profileRef;
}

/**
 * Reactive access to the active scoring profile, with mutation helpers
 * that persist every change. All actions update the singleton ref so
 * `useWeather`'s derived `slots` re-computes automatically (see ADR-005).
 */
export function useScoringProfile(): {
  profile: Ref<ScoringProfile>;
  setPreset: (preset: Exclude<ScoringProfilePreset, "custom">) => void;
  updateWeight: (key: keyof ScoringWeights, value: number) => void;
  updateIdealRange: (range: { low?: number; high?: number }) => void;
  updateDarknessScore: (value: number) => void;
  reset: () => void;
} {
  const profile = ensureRef();

  function commit(next: ScoringProfile): void {
    profile.value = next;
    saveProfile(next);
  }

  function setPreset(preset: Exclude<ScoringProfilePreset, "custom">): void {
    commit(presetProfile(preset));
  }

  function updateWeight(key: keyof ScoringWeights, value: number): void {
    commit(
      withCustomEdit(profile.value, {
        weights: { [key]: value } as Partial<ScoringWeights>,
      }),
    );
  }

  function updateIdealRange(range: { low?: number; high?: number }): void {
    commit(withCustomEdit(profile.value, { idealApparentTempCelsius: range }));
  }

  function updateDarknessScore(value: number): void {
    commit(withCustomEdit(profile.value, { darknessScore: value }));
  }

  function reset(): void {
    clearProfile();
    profile.value = DEFAULT_PROFILE;
  }

  return {
    profile,
    setPreset,
    updateWeight,
    updateIdealRange,
    updateDarknessScore,
    reset,
  };
}

/**
 * Reset the module-level singleton. Tests only \u2014 do not call from app code.
 */
export function __resetScoringProfileForTests(): void {
  profileRef = null;
}
