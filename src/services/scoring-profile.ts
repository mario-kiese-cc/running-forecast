import type {
  ScoringProfile,
  ScoringProfilePreset,
  ScoringWeights,
} from "../types";
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE,
  PRESET_LABELS,
} from "./scoring-profile-presets";

const STORAGE_KEY = "running-forecast:scoring-profile";

const WEIGHT_KEYS: ReadonlyArray<keyof ScoringWeights> = [
  "precipitation",
  "temperature",
  "wind",
  "humidity",
  "airQuality",
  "daylight",
];

/**
 * Re-normalise raw weight inputs so the six values sum to 1.0.
 *
 * Negative or non-finite inputs are clamped to 0. If all inputs are 0 (or
 * invalid), returns the default preset's weights rather than an undefined
 * profile \u2014 a forecast with all-zero weights would render an empty score
 * for every hour, which is never what the user wants.
 */
export function normalizeWeights(raw: ScoringWeights): ScoringWeights {
  const sanitized = WEIGHT_KEYS.map((key) => {
    const value = raw[key];
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const sum = sanitized.reduce((acc, value) => acc + value, 0);

  if (sum <= 0) return DEFAULT_PROFILE.weights;

  return {
    precipitation: sanitized[0] / sum,
    temperature: sanitized[1] / sum,
    wind: sanitized[2] / sum,
    humidity: sanitized[3] / sum,
    airQuality: sanitized[4] / sum,
    daylight: sanitized[5] / sum,
  };
}

/**
 * Build a custom profile by forking a built-in preset and applying a patch.
 *
 * The result is always tagged `preset: "custom"` with `basedOn` set to the
 * source preset, so the UI can render labels like
 * "Custom (based on Heat-sensitive)".
 */
export function withCustomEdit(
  source: ScoringProfile,
  patch: {
    weights?: Partial<ScoringWeights>;
    idealApparentTempCelsius?: { low?: number; high?: number };
    darknessScore?: number;
  },
): ScoringProfile {
  const basedOn: Exclude<ScoringProfilePreset, "custom"> =
    source.preset === "custom"
      ? (source.basedOn ?? "default")
      : (source.preset as Exclude<ScoringProfilePreset, "custom">);

  const mergedRawWeights: ScoringWeights = {
    ...source.weights,
    ...patch.weights,
  };
  const weights = normalizeWeights(mergedRawWeights);

  const low =
    patch.idealApparentTempCelsius?.low ??
    source.idealApparentTempCelsius.low;
  const high =
    patch.idealApparentTempCelsius?.high ??
    source.idealApparentTempCelsius.high;
  // Guarantee low <= high by swapping if the user dragged them past each other.
  const idealApparentTempCelsius =
    low <= high ? { low, high } : { low: high, high: low };

  const darknessScore = clamp(
    patch.darknessScore ?? source.darknessScore,
    0,
    100,
  );

  // Intentionally do NOT propagate `source.goodThresholdOverride`. That
  // field is owned by `applyRunTypeModifier` (ADR-006) and must never be
  // persisted on a personal profile — otherwise a stale recovery
  // threshold could leak across reloads.
  return {
    schemaVersion: 1,
    preset: "custom",
    basedOn,
    weights,
    idealApparentTempCelsius,
    darknessScore,
  };
}

/**
 * Derived, user-facing label. Never persisted \u2014 labels are pure functions
 * of `preset` + `basedOn` (see ADR-005).
 */
export function profileLabel(profile: ScoringProfile): string {
  if (profile.preset !== "custom") {
    return PRESET_LABELS[profile.preset];
  }
  const base = profile.basedOn ?? "default";
  return `Custom (based on ${PRESET_LABELS[base]})`;
}

/**
 * Persist the active profile. Errors (e.g. quota exceeded, private mode)
 * are swallowed \u2014 a missed save is not worth crashing the app.
 */
export function saveProfile(profile: ScoringProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Intentionally ignored \u2014 see JSDoc.
  }
}

/**
 * Load the active profile. Returns `DEFAULT_PROFILE` if nothing is saved,
 * the JSON is unparseable, or the saved blob fails validation \u2014 the same
 * forgiving fallback we use for `loadLocation`.
 */
export function loadProfile(): ScoringProfile {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_PROFILE;
  }
  if (raw === null) return DEFAULT_PROFILE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILE;
  }

  return isValidProfile(parsed) ? parsed : DEFAULT_PROFILE;
}

/** Clear the saved profile (used by "Reset to defaults"). */
export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Intentionally ignored.
  }
}

/**
 * Resolve a preset identifier to its full profile.
 *
 * For built-in presets, returns the canonical preset object. For `"custom"`,
 * returns `null` because a custom profile has no canonical form \u2014 callers
 * must build one with `withCustomEdit`.
 */
export function presetProfile(
  preset: Exclude<ScoringProfilePreset, "custom">,
): ScoringProfile {
  return BUILT_IN_PROFILES[preset];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function isValidProfile(value: unknown): value is ScoringProfile {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj.schemaVersion !== 1) return false;
  if (!isValidPreset(obj.preset)) return false;
  if (obj.preset === "custom") {
    if (obj.basedOn !== undefined && !isValidBuiltInPreset(obj.basedOn)) {
      return false;
    }
  }

  if (!isValidWeights(obj.weights)) return false;
  if (!isValidRange(obj.idealApparentTempCelsius)) return false;
  if (
    typeof obj.darknessScore !== "number" ||
    !Number.isFinite(obj.darknessScore) ||
    obj.darknessScore < 0 ||
    obj.darknessScore > 100
  ) {
    return false;
  }
  return true;
}

function isValidPreset(value: unknown): value is ScoringProfilePreset {
  return (
    value === "default" ||
    value === "heat-sensitive" ||
    value === "cold-averse" ||
    value === "winter-runner" ||
    value === "urban-air-quality" ||
    value === "custom"
  );
}

function isValidBuiltInPreset(
  value: unknown,
): value is Exclude<ScoringProfilePreset, "custom"> {
  return isValidPreset(value) && value !== "custom";
}

function isValidWeights(value: unknown): value is ScoringWeights {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  let sum = 0;
  for (const key of WEIGHT_KEYS) {
    const weight = obj[key];
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      return false;
    }
    sum += weight;
  }
  // Allow small float drift around 1.0.
  return Math.abs(sum - 1) < 0.01;
}

function isValidRange(
  value: unknown,
): value is { low: number; high: number } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.low !== "number" || !Number.isFinite(obj.low)) return false;
  if (typeof obj.high !== "number" || !Number.isFinite(obj.high)) return false;
  return obj.low <= obj.high;
}
