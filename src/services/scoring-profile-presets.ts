import type {
  ScoringProfile,
  ScoringProfilePreset,
  ScoringWeights,
} from "../types";

/**
 * Built-in scoring presets.
 *
 * Starter values per ADR-005. These are pure data; iterate freely based on
 * user feedback. Every preset's weights MUST sum to 1.0 \u2014 verified by
 * `scoring-profile-presets.test.ts`.
 *
 * Conventions:
 *   - `idealApparentTempCelsius.low <= idealApparentTempCelsius.high`
 *   - `darknessScore` in [0, 100]
 *   - `custom` is intentionally absent: a custom profile is built at runtime
 *     by forking a built-in preset.
 */

const DEFAULT_WEIGHTS: ScoringWeights = {
  precipitation: 0.3,
  temperature: 0.3,
  wind: 0.1,
  humidity: 0.1,
  airQuality: 0.1,
  daylight: 0.1,
};

const HEAT_SENSITIVE_WEIGHTS: ScoringWeights = {
  precipitation: 0.25,
  temperature: 0.4,
  wind: 0.05,
  humidity: 0.15,
  airQuality: 0.05,
  daylight: 0.1,
};

const COLD_AVERSE_WEIGHTS: ScoringWeights = {
  precipitation: 0.3,
  temperature: 0.35,
  wind: 0.15,
  humidity: 0.05,
  airQuality: 0.05,
  daylight: 0.1,
};

const WINTER_RUNNER_WEIGHTS: ScoringWeights = {
  precipitation: 0.3,
  temperature: 0.25,
  wind: 0.15,
  humidity: 0.05,
  airQuality: 0.1,
  daylight: 0.15,
};

const URBAN_AIR_QUALITY_WEIGHTS: ScoringWeights = {
  precipitation: 0.25,
  temperature: 0.25,
  wind: 0.1,
  humidity: 0.05,
  airQuality: 0.25,
  daylight: 0.1,
};

/** Default preset \u2014 byte-for-byte equivalent to the original hard-coded scorer. */
export const DEFAULT_PROFILE: ScoringProfile = {
  schemaVersion: 1,
  preset: "default",
  weights: DEFAULT_WEIGHTS,
  idealApparentTempCelsius: { low: 8, high: 18 },
  darknessScore: 20,
};

const HEAT_SENSITIVE_PROFILE: ScoringProfile = {
  schemaVersion: 1,
  preset: "heat-sensitive",
  weights: HEAT_SENSITIVE_WEIGHTS,
  idealApparentTempCelsius: { low: 6, high: 14 },
  darknessScore: 20,
};

const COLD_AVERSE_PROFILE: ScoringProfile = {
  schemaVersion: 1,
  preset: "cold-averse",
  weights: COLD_AVERSE_WEIGHTS,
  idealApparentTempCelsius: { low: 12, high: 22 },
  darknessScore: 20,
};

const WINTER_RUNNER_PROFILE: ScoringProfile = {
  schemaVersion: 1,
  preset: "winter-runner",
  weights: WINTER_RUNNER_WEIGHTS,
  idealApparentTempCelsius: { low: -2, high: 10 },
  darknessScore: 70,
};

const URBAN_AIR_QUALITY_PROFILE: ScoringProfile = {
  schemaVersion: 1,
  preset: "urban-air-quality",
  weights: URBAN_AIR_QUALITY_WEIGHTS,
  idealApparentTempCelsius: { low: 8, high: 18 },
  darknessScore: 20,
};

/** Lookup of all built-in presets keyed by preset identifier. */
export const BUILT_IN_PROFILES: Record<
  Exclude<ScoringProfilePreset, "custom">,
  ScoringProfile
> = {
  default: DEFAULT_PROFILE,
  "heat-sensitive": HEAT_SENSITIVE_PROFILE,
  "cold-averse": COLD_AVERSE_PROFILE,
  "winter-runner": WINTER_RUNNER_PROFILE,
  "urban-air-quality": URBAN_AIR_QUALITY_PROFILE,
};

/** Human-readable preset names. Used in pills, panel headers, and labels. */
export const PRESET_LABELS: Record<ScoringProfilePreset, string> = {
  default: "Default",
  "heat-sensitive": "Heat-sensitive",
  "cold-averse": "Cold-averse",
  "winter-runner": "Winter runner",
  "urban-air-quality": "Urban air quality",
  custom: "Custom",
};

/** One-line preset descriptions for the settings panel. */
export const PRESET_DESCRIPTIONS: Record<
  Exclude<ScoringProfilePreset, "custom">,
  string
> = {
  default: "Balanced weighting suited to most runners.",
  "heat-sensitive": "Penalises warm and humid hours more strongly.",
  "cold-averse": "Shifts the ideal range warmer; tolerates more heat.",
  "winter-runner": "Comfortable in the cold and the dark.",
  "urban-air-quality": "Weights air quality on par with temperature.",
};
