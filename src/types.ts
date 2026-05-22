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

/** User location for API requests */
export interface UserLocation {
  readonly latitude: number;
  readonly longitude: number;
  /** Optional display name (city, etc.) */
  readonly name?: string;
  /** How this location was obtained — used by the UI to label the badge. */
  readonly source?: LocationSource;
}
