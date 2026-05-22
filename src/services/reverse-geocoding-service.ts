import type { FetchFn } from "./weather-service";

/**
 * Reverse-geocoding via BigDataCloud's free client endpoint.
 * No API key required. CORS-enabled for browser use.
 * See: https://www.bigdatacloud.com/docs/api/free-reverse-geocode-to-city-api
 */
const REVERSE_GEOCODING_BASE_URL =
  "https://api.bigdatacloud.net/data/reverse-geocode-client";

/** Normalized reverse-geocoding result. */
export interface ReverseGeocodingResult {
  /** Best available city-level label. */
  readonly city: string;
  /** Country name, if returned by the API. */
  readonly country?: string;
}

/** Subset of BigDataCloud's response shape we depend on. */
interface BigDataCloudResponse {
  readonly city?: string;
  readonly locality?: string;
  readonly principalSubdivision?: string;
  readonly countryName?: string;
}

/**
 * Build the reverse-geocoding URL for a coordinate pair.
 * Defaults to English labels.
 */
export function buildReverseGeocodingUrl(
  latitude: number,
  longitude: number,
): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  return `${REVERSE_GEOCODING_BASE_URL}?${params.toString()}`;
}

/**
 * Resolve a coordinate to a nearest-city label.
 *
 * This is an enrichment-only call: any failure (network, bad response,
 * empty result) returns `null` rather than throwing. Callers should
 * gracefully degrade to showing coordinates.
 *
 * @param latitude  - Decimal degrees, -90..90
 * @param longitude - Decimal degrees, -180..180
 * @param fetchFn   - Fetch implementation (defaults to global fetch)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  fetchFn: FetchFn = fetch,
): Promise<ReverseGeocodingResult | null> {
  const url = buildReverseGeocodingUrl(latitude, longitude);

  let response: Response;
  try {
    response = await fetchFn(url);
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let data: BigDataCloudResponse;
  try {
    data = (await response.json()) as BigDataCloudResponse;
  } catch {
    return null;
  }

  const city = pickCityLabel(data);
  if (!city) return null;

  return {
    city,
    country: data.countryName,
  };
}

/**
 * Choose the most specific available city-level label.
 * BigDataCloud often leaves `city` empty for rural points, so we
 * progressively fall back to `locality` and finally `principalSubdivision`.
 */
function pickCityLabel(data: BigDataCloudResponse): string | undefined {
  if (data.city && data.city.trim().length > 0) return data.city.trim();
  if (data.locality && data.locality.trim().length > 0) return data.locality.trim();
  if (
    data.principalSubdivision &&
    data.principalSubdivision.trim().length > 0
  ) {
    return data.principalSubdivision.trim();
  }
  return undefined;
}
