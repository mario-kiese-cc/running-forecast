/** Hourly weather conditions from the API */
export interface HourlyConditions {
  /** ISO 8601 datetime for this hour */
  readonly time: string;
  /** Temperature in °C */
  readonly temperatureCelsius: number;
  /** "Feels like" temperature in °C (combines temp, wind, humidity) */
  readonly apparentTemperatureCelsius: number;
  /** Precipitation probability as 0–100 */
  readonly precipitationProbability: number;
  /** Precipitation amount in mm */
  readonly precipitationMm: number;
  /** Relative humidity as 0–100 */
  readonly relativeHumidity: number;
  /** Wind speed in km/h */
  readonly windSpeedKmh: number;
  /** UV index (0–11+) */
  readonly uvIndex: number;
  /** Whether this hour is daylight (between sunrise and sunset) */
  readonly isDaylight: boolean;
}

/** Combined weather + AQI for one hour */
export interface HourlyData {
  readonly conditions: HourlyConditions;
  /** AQI value, undefined if not available */
  readonly aqi?: number;
}

/** Score rating label */
export type ScoreRating = "great" | "good" | "fair" | "avoid";

/** Scored time slot for display */
export interface TimeSlot {
  /** ISO 8601 datetime for this hour */
  readonly time: string;
  /** Overall score 0–100 */
  readonly score: number;
  /** Human-readable rating */
  readonly rating: ScoreRating;
  /** Individual factor scores for tooltip/detail display */
  readonly factors: ScoreFactors;
  /** The raw conditions used to compute this score */
  readonly conditions: HourlyConditions;
  /** AQI value, undefined if not available */
  readonly aqi?: number;
}

/**
 * One cell in the week heatmap: a single hour of a single day.
 *
 * `slot` is `null` when the hour is in the past or beyond the forecast
 * horizon (no data). Past cells are non-interactive and carry no score.
 */
export interface WeekGridCell {
  /** ISO 8601 datetime for this hour, e.g. "2026-05-21T07:00". */
  readonly time: string;
  /** Hour of day, 0–23 (local). */
  readonly hourOfDay: number;
  /** The scored slot, or `null` when past / out-of-horizon. */
  readonly slot: TimeSlot | null;
  /** True when this hour is strictly before the current hour. */
  readonly isPast: boolean;
}

/** One row in the week heatmap: a single calendar day with 24 cells. */
export interface WeekGridRow {
  /** Local date, "YYYY-MM-DD". */
  readonly dateIso: string;
  /** Display label: "Today" / "Tomorrow" / localised weekday (e.g. "Wed"). */
  readonly dayLabel: string;
  /** Always length 24, indexed by hour of day. */
  readonly cells: ReadonlyArray<WeekGridCell>;
}

/** Individual factor scores (each 0–100, before weighting) */
export interface ScoreFactors {
  readonly precipitation: number;
  readonly temperature: number;
  readonly wind: number;
  readonly humidity: number;
  readonly airQuality: number;
  readonly daylight: number;
}

/** How the location was obtained. */
export type LocationSource = "detected" | "manual";

/** Identifier for a built-in scoring preset. `custom` denotes a user-edited profile. */
export type ScoringProfilePreset =
  | "default"
  | "heat-sensitive"
  | "cold-averse"
  | "winter-runner"
  | "urban-air-quality"
  | "custom";

/**
 * Per-factor weights for the overall score. Must sum to 1.0 — enforced by
 * `normalizeWeights` whenever weights are constructed from user input.
 */
export interface ScoringWeights {
  readonly precipitation: number;
  readonly temperature: number;
  readonly wind: number;
  readonly humidity: number;
  readonly airQuality: number;
  readonly daylight: number;
}

/**
 * A user-tunable scoring configuration. Flows through `useScoringProfile`
 * into `useWeather` and ultimately into `scoreAllHours`.
 *
 * The human-readable label is *derived* (see `profileLabel`) rather than
 * stored, because labels are pure functions of `preset` + `basedOn`.
 */
export interface ScoringProfile {
  readonly schemaVersion: 1;
  readonly preset: ScoringProfilePreset;
  /** For `preset === "custom"`, the built-in preset this was forked from. */
  readonly basedOn?: Exclude<ScoringProfilePreset, "custom">;
  readonly weights: ScoringWeights;
  /** Apparent-temperature range that scores 100. */
  readonly idealApparentTempCelsius: {
    readonly low: number;
    readonly high: number;
  };
  /** Score applied to `!isDaylight` hours, 0–100. */
  readonly darknessScore: number;
  /**
   * Optional override for the `good` rating threshold (default 60). Only
   * ever set by `applyRunTypeModifier`; never persisted on a personal
   * profile — `withCustomEdit` and the persistence validator both strip
   * it (see ADR-006).
   */
  readonly goodThresholdOverride?: number;
}

/** Run-type identifier. See `src/services/run-type.ts`. */
export type RunType =
  | "easy"
  | "long"
  | "tempo"
  | "intervals"
  | "recovery";

/**
 * A delta applied on top of the active personal `ScoringProfile`.
 *
 * `weightMultipliers` are per-key multiplicative factors; missing keys are
 * treated as 1.0 (no change). After multiplication the weight vector is
 * re-normalised to sum to 1.0 by `applyRunTypeModifier`.
 *
 * `idealShiftCelsius` translates the apparent-temperature ideal range. The
 * combined range is clamped to a sane domain (see ADR-006).
 *
 * `uvImpactMultiplier` is reserved for a future UV scoring factor. It is
 * defined now to stabilise the type but has no effect on v1 scoring.
 */
export interface RunTypeModifier {
  readonly runType: RunType;
  readonly label: string;
  readonly description: string;
  readonly weightMultipliers: Partial<ScoringWeights>;
  readonly idealShiftCelsius: {
    readonly low: number;
    readonly high: number;
  };
  /** Optional override for the "good" rating threshold (default 60). */
  readonly goodThresholdOverride?: number;
  /** Reserved for future UV factor; ignored by the v1 scorer. */
  readonly uvImpactMultiplier?: number;
}

/** User location for API requests */
export interface UserLocation {
  readonly latitude: number;
  readonly longitude: number;
  /** Optional display name (city, etc.) */
  readonly name?: string;
  /** How this location was obtained — used by the UI to label the badge. */
  readonly source?: LocationSource;
}
