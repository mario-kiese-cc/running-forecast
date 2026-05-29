import type {
  HourlyData,
  ScoreFactors,
  ScoreRating,
  ScoringProfile,
  ScoringWeights,
  TimeSlot,
} from "../types";
import { DEFAULT_PROFILE } from "./scoring-profile-presets";

/** Default score thresholds for rating labels. Overridable per call. */
const RATING_THRESHOLDS = {
  great: 80,
  good: 60,
  fair: 30,
} as const;

/**
 * Per-call overrides for the rating thresholds. Currently only the `good`
 * threshold is overridable (used by the `recovery` run type, ADR-006).
 * Other thresholds may follow if needed.
 */
export interface RatingThresholdOverrides {
  readonly good?: number;
}

/**
 * Score precipitation conditions (0–100).
 * 0% probability = 100 score, ≥70% probability = 0 score.
 * Also penalizes heavy rain intensity.
 */
export function scorePrecipitation(
  probability: number,
  amountMm: number,
): number {
  // Probability penalty: linear 100→0 over 0–70%
  const probScore = Math.max(0, 100 - (probability / 70) * 100);

  // Intensity penalty: >5mm/h is heavy rain
  const intensityScore = Math.max(0, 100 - (amountMm / 5) * 100);

  return Math.min(probScore, intensityScore);
}

/**
 * Score temperature conditions (0–100).
 *
 * The curve *shape* is fixed (see ADR-005). Only the `idealRange` is
 * tunable — it translates the plateau and the two flanks left/right:
 *   - `[idealLow, idealHigh]` → 100 (plateau)
 *   - cold flank of width 13 °C below `idealLow` → linear 100 → 0
 *   - warm flank: 2 °C above `idealHigh` taper 100 → 80, then 8 °C
 *     decline 80 → 0 (heat hurts disproportionately)
 *
 * With the default range (8–18) this is byte-for-byte the original curve.
 */
export function scoreTemperature(
  apparentTempCelsius: number,
  idealRange: { low: number; high: number } = DEFAULT_PROFILE.idealApparentTempCelsius,
): number {
  const idealLow = idealRange.low;
  const idealHigh = idealRange.high;
  const COLD_FLANK_WIDTH = 13;
  const WARM_TAPER_WIDTH = 2;
  const WARM_TAPER_SCORE = 80;
  const HOT_DECLINE_WIDTH = 8;

  const warmThreshold = idealHigh + WARM_TAPER_WIDTH;
  const extremeHigh = warmThreshold + HOT_DECLINE_WIDTH;

  if (apparentTempCelsius >= idealLow && apparentTempCelsius <= idealHigh) {
    return 100;
  }

  if (apparentTempCelsius < idealLow) {
    const distance = idealLow - apparentTempCelsius;
    return Math.max(0, 100 - (distance / COLD_FLANK_WIDTH) * 100);
  }

  // Warm taper from idealHigh to warmThreshold.
  if (apparentTempCelsius <= warmThreshold) {
    const distance = apparentTempCelsius - idealHigh;
    return 100 - (distance / WARM_TAPER_WIDTH) * (100 - WARM_TAPER_SCORE);
  }

  // Hot decline from warmThreshold to extremeHigh.
  if (apparentTempCelsius >= extremeHigh) {
    return 0;
  }
  const distance = apparentTempCelsius - warmThreshold;
  return WARM_TAPER_SCORE - (distance / HOT_DECLINE_WIDTH) * WARM_TAPER_SCORE;
}

/**
 * Score wind conditions (0–100).
 * 0–10 km/h = 100, ≥50 km/h = 0. Linear in between.
 */
export function scoreWind(windSpeedKmh: number): number {
  const CALM = 10;
  const EXTREME = 50;

  if (windSpeedKmh <= CALM) return 100;
  if (windSpeedKmh >= EXTREME) return 0;

  return 100 - ((windSpeedKmh - CALM) / (EXTREME - CALM)) * 100;
}

/**
 * Score humidity (0–100).
 * 40–60% = 100. Degrades outside that range.
 * ≥90% = 0.
 */
export function scoreHumidity(relativeHumidity: number): number {
  const IDEAL_LOW = 40;
  const IDEAL_HIGH = 60;
  const EXTREME_HIGH = 90;
  const EXTREME_LOW = 10;

  if (relativeHumidity >= IDEAL_LOW && relativeHumidity <= IDEAL_HIGH) {
    return 100;
  }

  if (relativeHumidity > IDEAL_HIGH) {
    const range = EXTREME_HIGH - IDEAL_HIGH;
    const distance = relativeHumidity - IDEAL_HIGH;
    return Math.max(0, 100 - (distance / range) * 100);
  }

  // relativeHumidity < IDEAL_LOW
  const range = IDEAL_LOW - EXTREME_LOW;
  const distance = IDEAL_LOW - relativeHumidity;
  return Math.max(0, 100 - (distance / range) * 100);
}

/**
 * Score air quality (0–100).
 * AQI 0–50 (good) = 100, ≥150 (unhealthy) = 0. Linear in between.
 * Returns 100 if AQI data is unavailable.
 */
export function scoreAirQuality(aqi: number | undefined): number {
  if (aqi === undefined) return 100;

  const GOOD = 50;
  const UNHEALTHY = 150;

  if (aqi <= GOOD) return 100;
  if (aqi >= UNHEALTHY) return 0;

  return 100 - ((aqi - GOOD) / (UNHEALTHY - GOOD)) * 100;
}

/**
 * Score daylight (0–100).
 * Daylight = 100, darkness = `darknessScore` (default 20 — running in the
 * dark is possible, just less ideal). Winter-runner profile bumps this up.
 */
export function scoreDaylight(
  isDaylight: boolean,
  darknessScore: number = DEFAULT_PROFILE.darknessScore,
): number {
  return isDaylight ? 100 : darknessScore;
}

/**
 * Compute individual factor scores for one hour.
 */
export function computeFactors(
  hourly: HourlyData,
  profile: ScoringProfile = DEFAULT_PROFILE,
): ScoreFactors {
  return {
    precipitation: scorePrecipitation(
      hourly.conditions.precipitationProbability,
      hourly.conditions.precipitationMm,
    ),
    temperature: scoreTemperature(
      hourly.conditions.apparentTemperatureCelsius,
      profile.idealApparentTempCelsius,
    ),
    wind: scoreWind(hourly.conditions.windSpeedKmh),
    humidity: scoreHumidity(hourly.conditions.relativeHumidity),
    airQuality: scoreAirQuality(hourly.aqi),
    daylight: scoreDaylight(hourly.conditions.isDaylight, profile.darknessScore),
  };
}

/**
 * Compute the weighted overall score from individual factors.
 * Returns a value clamped to 0–100.
 */
export function computeOverallScore(
  factors: ScoreFactors,
  weights: ScoringWeights = DEFAULT_PROFILE.weights,
): number {
  const weighted =
    factors.precipitation * weights.precipitation +
    factors.temperature * weights.temperature +
    factors.wind * weights.wind +
    factors.humidity * weights.humidity +
    factors.airQuality * weights.airQuality +
    factors.daylight * weights.daylight;

  return Math.round(Math.max(0, Math.min(100, weighted)));
}

/**
 * Map a numeric score to a human-readable rating.
 *
 * `overrides.good` lets callers soften (or stiffen) the `good` threshold
 * — the `recovery` run type uses this to relabel a 52-score from `fair`
 * to `good` (FR-8). The clamp keeps the override within the surrounding
 * thresholds so an unreachable rating can't be produced.
 */
export function scoreToRating(
  score: number,
  overrides?: RatingThresholdOverrides,
): ScoreRating {
  const goodThreshold = clampThreshold(
    overrides?.good ?? RATING_THRESHOLDS.good,
    RATING_THRESHOLDS.fair,
    RATING_THRESHOLDS.great,
  );

  if (score >= RATING_THRESHOLDS.great) return "great";
  if (score >= goodThreshold) return "good";
  if (score >= RATING_THRESHOLDS.fair) return "fair";
  return "avoid";
}

function clampThreshold(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Score a single hour of weather data into a TimeSlot.
 */
export function scoreHour(
  hourly: HourlyData,
  profile: ScoringProfile = DEFAULT_PROFILE,
): TimeSlot {
  const factors = computeFactors(hourly, profile);
  const score = computeOverallScore(factors, profile.weights);
  const rating = scoreToRating(score, {
    good: profile.goodThresholdOverride,
  });

  return {
    time: hourly.conditions.time,
    score,
    rating,
    factors,
    conditions: hourly.conditions,
    aqi: hourly.aqi,
  };
}

/**
 * Score an array of hourly data into TimeSlots.
 * Returns slots in the same order as input.
 */
export function scoreAllHours(
  hours: ReadonlyArray<HourlyData>,
  profile: ScoringProfile = DEFAULT_PROFILE,
): TimeSlot[] {
  return hours.map((hourly) => scoreHour(hourly, profile));
}
