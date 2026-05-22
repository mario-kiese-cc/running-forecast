import type {
  HourlyData,
  ScoreFactors,
  ScoreRating,
  TimeSlot,
} from "../types";

/**
 * Factor weights — must sum to 1.0.
 * Precipitation matters most, then temperature.
 */
const WEIGHTS = {
  precipitation: 0.3,
  temperature: 0.25,
  wind: 0.15,
  humidity: 0.1,
  airQuality: 0.1,
  daylight: 0.1,
} as const;

/** Score thresholds for rating labels */
const RATING_THRESHOLDS = {
  great: 80,
  good: 60,
  fair: 30,
} as const;

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
 * Ideal "feels like" range: 8–18°C (score 100).
 * Degrades linearly outside that range.
 * Unrunnable below -5°C or above 35°C.
 */
export function scoreTemperature(apparentTempCelsius: number): number {
  const IDEAL_LOW = 8;
  const IDEAL_HIGH = 18;
  const EXTREME_LOW = -5;
  const EXTREME_HIGH = 35;

  if (apparentTempCelsius >= IDEAL_LOW && apparentTempCelsius <= IDEAL_HIGH) {
    return 100;
  }

  if (apparentTempCelsius < IDEAL_LOW) {
    const range = IDEAL_LOW - EXTREME_LOW;
    const distance = IDEAL_LOW - apparentTempCelsius;
    return Math.max(0, 100 - (distance / range) * 100);
  }

  // apparentTempCelsius > IDEAL_HIGH
  const range = EXTREME_HIGH - IDEAL_HIGH;
  const distance = apparentTempCelsius - IDEAL_HIGH;
  return Math.max(0, 100 - (distance / range) * 100);
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
 * Daylight = 100, darkness = 20 (not 0 — running in the dark is possible, just less ideal).
 */
export function scoreDaylight(isDaylight: boolean): number {
  return isDaylight ? 100 : 20;
}

/**
 * Compute individual factor scores for one hour.
 */
export function computeFactors(hourly: HourlyData): ScoreFactors {
  return {
    precipitation: scorePrecipitation(
      hourly.conditions.precipitationProbability,
      hourly.conditions.precipitationMm,
    ),
    temperature: scoreTemperature(hourly.conditions.apparentTemperatureCelsius),
    wind: scoreWind(hourly.conditions.windSpeedKmh),
    humidity: scoreHumidity(hourly.conditions.relativeHumidity),
    airQuality: scoreAirQuality(hourly.aqi),
    daylight: scoreDaylight(hourly.conditions.isDaylight),
  };
}

/**
 * Compute the weighted overall score from individual factors.
 * Returns a value clamped to 0–100.
 */
export function computeOverallScore(factors: ScoreFactors): number {
  const weighted =
    factors.precipitation * WEIGHTS.precipitation +
    factors.temperature * WEIGHTS.temperature +
    factors.wind * WEIGHTS.wind +
    factors.humidity * WEIGHTS.humidity +
    factors.airQuality * WEIGHTS.airQuality +
    factors.daylight * WEIGHTS.daylight;

  return Math.round(Math.max(0, Math.min(100, weighted)));
}

/**
 * Map a numeric score to a human-readable rating.
 */
export function scoreToRating(score: number): ScoreRating {
  if (score >= RATING_THRESHOLDS.great) return "great";
  if (score >= RATING_THRESHOLDS.good) return "good";
  if (score >= RATING_THRESHOLDS.fair) return "fair";
  return "avoid";
}

/**
 * Score a single hour of weather data into a TimeSlot.
 */
export function scoreHour(hourly: HourlyData): TimeSlot {
  const factors = computeFactors(hourly);
  const score = computeOverallScore(factors);
  const rating = scoreToRating(score);

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
export function scoreAllHours(hours: ReadonlyArray<HourlyData>): TimeSlot[] {
  return hours.map(scoreHour);
}
