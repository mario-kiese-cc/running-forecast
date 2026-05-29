import type {
  RunType,
  RunTypeModifier,
  ScoringProfile,
  ScoringWeights,
} from "../types";
import { normalizeWeights } from "./scoring-profile";

const STORAGE_KEY = "running-forecast:run-type";

/** Clamp range for the combined ideal-temperature window (FR-4). */
const IDEAL_TEMP_MIN_CELSIUS = -10;
const IDEAL_TEMP_MAX_CELSIUS = 25;

/**
 * Built-in run-type modifiers (spec OQ-1 starter values).
 *
 * Each modifier is a *delta* applied on top of the active personal
 * `ScoringProfile`. Missing keys in `weightMultipliers` default to 1.0
 * (no change). See ADR-006 for the composition rules.
 *
 * `uvImpactMultiplier` is recorded for the future UV factor but has no
 * effect on v1 scoring.
 */
export const RUN_TYPE_MODIFIERS: Record<RunType, RunTypeModifier> = {
  easy: {
    runType: "easy",
    label: "Easy",
    description: "Balanced — any non-rainy slot works.",
    weightMultipliers: {},
    idealShiftCelsius: { low: 0, high: 0 },
  },
  long: {
    runType: "long",
    label: "Long",
    description:
      "Long run — favours cool windows; UV and sustained heat matter more.",
    weightMultipliers: {
      temperature: 1.2,
      humidity: 1.2,
    },
    idealShiftCelsius: { low: -1, high: -2 },
    uvImpactMultiplier: 1.3,
  },
  tempo: {
    runType: "tempo",
    label: "Tempo",
    description: "Tempo — prefers cooler, calmer conditions.",
    weightMultipliers: {
      temperature: 1.3,
      humidity: 1.2,
      wind: 1.1,
    },
    idealShiftCelsius: { low: -1, high: -2 },
  },
  intervals: {
    runType: "intervals",
    label: "Intervals",
    description: "Intervals — penalises heat, humidity, and wind more.",
    weightMultipliers: {
      temperature: 1.5,
      humidity: 1.3,
      wind: 1.2,
    },
    idealShiftCelsius: { low: -2, high: -3 },
  },
  recovery: {
    runType: "recovery",
    label: "Recovery",
    description: "Recovery — lenient; most non-rainy slots qualify.",
    weightMultipliers: {
      temperature: 0.8,
      humidity: 0.8,
      wind: 0.8,
    },
    idealShiftCelsius: { low: 1, high: 2 },
    goodThresholdOverride: 50,
  },
};

/** Ordered list of run types as they appear in the selector. */
export const RUN_TYPE_ORDER: ReadonlyArray<RunType> = [
  "easy",
  "long",
  "tempo",
  "intervals",
  "recovery",
];

/** Default run type on first visit (FR-6). */
export const DEFAULT_RUN_TYPE: RunType = "easy";

/**
 * Compose a personal `ScoringProfile` with a `RunType` modifier and return
 * a new effective profile. Pure function — inputs are not mutated.
 *
 * Steps:
 *   1. raw weights = profile.weights × modifier.weightMultipliers per key
 *      (missing multiplier keys default to 1.0).
 *   2. weights = normalizeWeights(raw) — always sums to 1.0 (FR-3).
 *   3. idealLow  = clamp(profile.low  + shift.low,  -10, 25)
 *      idealHigh = clamp(profile.high + shift.high, -10, 25)
 *      If swap occurs (low > high) the two are exchanged — defensive
 *      against pathological combinations of preset + modifier.
 *   4. `goodThresholdOverride` (if any) is copied from the modifier.
 *   5. preset / basedOn / darknessScore / schemaVersion are copied from
 *      the input profile so the UI can still display the personal label.
 */
export function applyRunTypeModifier(
  profile: ScoringProfile,
  runType: RunType,
): ScoringProfile {
  const modifier = RUN_TYPE_MODIFIERS[runType];

  const multipliedWeights: ScoringWeights = {
    precipitation:
      profile.weights.precipitation *
      (modifier.weightMultipliers.precipitation ?? 1),
    temperature:
      profile.weights.temperature *
      (modifier.weightMultipliers.temperature ?? 1),
    wind:
      profile.weights.wind * (modifier.weightMultipliers.wind ?? 1),
    humidity:
      profile.weights.humidity *
      (modifier.weightMultipliers.humidity ?? 1),
    airQuality:
      profile.weights.airQuality *
      (modifier.weightMultipliers.airQuality ?? 1),
    daylight:
      profile.weights.daylight *
      (modifier.weightMultipliers.daylight ?? 1),
  };

  const weights = normalizeWeights(multipliedWeights);

  const shiftedLow = clamp(
    profile.idealApparentTempCelsius.low + modifier.idealShiftCelsius.low,
    IDEAL_TEMP_MIN_CELSIUS,
    IDEAL_TEMP_MAX_CELSIUS,
  );
  const shiftedHigh = clamp(
    profile.idealApparentTempCelsius.high + modifier.idealShiftCelsius.high,
    IDEAL_TEMP_MIN_CELSIUS,
    IDEAL_TEMP_MAX_CELSIUS,
  );
  const idealApparentTempCelsius =
    shiftedLow <= shiftedHigh
      ? { low: shiftedLow, high: shiftedHigh }
      : { low: shiftedHigh, high: shiftedLow };

  return {
    schemaVersion: 1,
    preset: profile.preset,
    basedOn: profile.basedOn,
    weights,
    idealApparentTempCelsius,
    darknessScore: profile.darknessScore,
    goodThresholdOverride: modifier.goodThresholdOverride,
  };
}

/**
 * Persist the chosen run type. Errors (quota, private mode) are swallowed
 * — a missed save is not worth crashing the app.
 */
export function saveRunType(runType: RunType): void {
  try {
    localStorage.setItem(STORAGE_KEY, runType);
  } catch {
    // Intentionally ignored.
  }
}

/**
 * Load the persisted run type. Returns `DEFAULT_RUN_TYPE` if nothing is
 * saved, the value is unrecognised, or storage is unavailable.
 */
export function loadRunType(): RunType {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_RUN_TYPE;
  }
  if (raw === null) return DEFAULT_RUN_TYPE;
  return isValidRunType(raw) ? raw : DEFAULT_RUN_TYPE;
}

/** Clear the persisted run type. */
export function clearRunType(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Intentionally ignored.
  }
}

/** Human-readable label for a run type. */
export function runTypeLabel(runType: RunType): string {
  return RUN_TYPE_MODIFIERS[runType].label;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function isValidRunType(value: unknown): value is RunType {
  return (
    value === "easy" ||
    value === "long" ||
    value === "tempo" ||
    value === "intervals" ||
    value === "recovery"
  );
}
