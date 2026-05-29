import type {
  HourlyConditions,
  HourlyData,
  UserLocation,
} from "../types";
import { isDaylight, type DaylightWindow } from "./daylight";

// --- Open-Meteo API response shapes ---

/** Shape of the Open-Meteo forecast response */
interface OpenMeteoForecastResponse {
  readonly hourly: {
    readonly time: string[];
    readonly temperature_2m: number[];
    readonly apparent_temperature: number[];
    readonly precipitation_probability: number[];
    readonly precipitation: number[];
    readonly relative_humidity_2m: number[];
    readonly wind_speed_10m: number[];
    readonly uv_index: number[];
  };
  readonly daily: {
    readonly time: string[];
    readonly sunrise: string[];
    readonly sunset: string[];
  };
}

/** Shape of the Open-Meteo air quality response */
interface OpenMeteoAirQualityResponse {
  readonly hourly: {
    readonly time: string[];
    readonly european_aqi: (number | null)[];
  };
}

// --- API URLs ---

const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_BASE_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

const FORECAST_PARAMS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "relative_humidity_2m",
  "wind_speed_10m",
  "uv_index",
].join(",");

const DAILY_PARAMS = "sunrise,sunset";
// Seven days powers the Week heatmap (week-at-a-glance). The Timeline view
// renders whatever days are returned, so it now spans the full week too.
const FORECAST_DAYS = 7;

// --- URL builders ---

/** Build the Open-Meteo forecast URL for a location */
export function buildForecastUrl(location: UserLocation): string {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: FORECAST_PARAMS,
    daily: DAILY_PARAMS,
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS),
  });
  return `${FORECAST_BASE_URL}?${params.toString()}`;
}

/** Build the Open-Meteo air quality URL for a location */
export function buildAirQualityUrl(location: UserLocation): string {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: "european_aqi",
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS),
  });
  return `${AIR_QUALITY_BASE_URL}?${params.toString()}`;
}

// --- Response parsing ---

/**
 * Parse daylight windows from the daily forecast response.
 */
function parseDaylightWindows(
  daily: OpenMeteoForecastResponse["daily"],
): DaylightWindow[] {
  return daily.time.map((_, index) => ({
    sunrise: daily.sunrise[index],
    sunset: daily.sunset[index],
  }));
}

/**
 * Parse hourly conditions from the forecast response.
 * Enriches each hour with daylight information.
 */
export function parseForecastResponse(
  response: OpenMeteoForecastResponse,
): HourlyConditions[] {
  const windows = parseDaylightWindows(response.daily);
  const { hourly } = response;

  return hourly.time.map((time, index) => ({
    time,
    temperatureCelsius: hourly.temperature_2m[index],
    apparentTemperatureCelsius: hourly.apparent_temperature[index],
    precipitationProbability: hourly.precipitation_probability[index],
    precipitationMm: hourly.precipitation[index],
    relativeHumidity: hourly.relative_humidity_2m[index],
    windSpeedKmh: hourly.wind_speed_10m[index],
    uvIndex: hourly.uv_index[index],
    isDaylight: isDaylight(time, windows),
  }));
}

/**
 * Parse air quality response into a map of time → AQI.
 * Returns a Map for O(1) lookup when merging with forecast data.
 */
export function parseAirQualityResponse(
  response: OpenMeteoAirQualityResponse,
): Map<string, number> {
  const map = new Map<string, number>();
  const { hourly } = response;

  for (let i = 0; i < hourly.time.length; i++) {
    const aqi = hourly.european_aqi[i];
    if (aqi !== null) {
      map.set(hourly.time[i], aqi);
    }
  }

  return map;
}

/**
 * Merge hourly conditions with air quality data into HourlyData[].
 */
export function mergeWeatherAndAqi(
  conditions: ReadonlyArray<HourlyConditions>,
  aqiMap: Map<string, number>,
): HourlyData[] {
  return conditions.map((c) => ({
    conditions: c,
    aqi: aqiMap.get(c.time),
  }));
}

// --- Fetcher ---

/**
 * Fetch function type — allows injecting a custom fetcher for testing.
 */
export type FetchFn = (url: string) => Promise<Response>;

/**
 * Fetch weather and air quality data for a location.
 * Returns merged HourlyData array.
 *
 * @param location - User's location
 * @param fetchFn - Fetch implementation (defaults to global fetch)
 * @throws Error if either API request fails
 */
export async function fetchWeatherData(
  location: UserLocation,
  fetchFn: FetchFn = fetch,
): Promise<HourlyData[]> {
  const forecastUrl = buildForecastUrl(location);
  const airQualityUrl = buildAirQualityUrl(location);

  // Fetch both APIs in parallel
  const [forecastRes, airQualityRes] = await Promise.all([
    fetchFn(forecastUrl),
    fetchFn(airQualityUrl),
  ]);

  if (!forecastRes.ok) {
    throw new Error(
      `Weather API request failed: ${forecastRes.status} ${forecastRes.statusText}`,
    );
  }

  const forecastData =
    (await forecastRes.json()) as OpenMeteoForecastResponse;
  const conditions = parseForecastResponse(forecastData);

  // AQI is optional — degrade gracefully if unavailable
  let aqiMap = new Map<string, number>();
  if (airQualityRes.ok) {
    const airQualityData =
      (await airQualityRes.json()) as OpenMeteoAirQualityResponse;
    aqiMap = parseAirQualityResponse(airQualityData);
  }

  return mergeWeatherAndAqi(conditions, aqiMap);
}
