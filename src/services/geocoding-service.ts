import type { UserLocation } from "../types";
import type { FetchFn } from "./weather-service";

const GEOCODING_BASE_URL =
  "https://geocoding-api.open-meteo.com/v1/search";

/** Maximum number of geocoding candidates to return */
const MAX_RESULTS = 5;

/** A geocoding candidate returned by the API */
export interface GeocodingCandidate {
  /** City/place name */
  readonly name: string;
  /** Country name */
  readonly country: string;
  /** Admin region (state/province), if available */
  readonly admin1?: string;
  /** Latitude */
  readonly latitude: number;
  /** Longitude */
  readonly longitude: number;
}

/** Shape of the Open-Meteo geocoding API response */
interface OpenMeteoGeocodingResponse {
  readonly results?: ReadonlyArray<{
    readonly name: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly country?: string;
    readonly admin1?: string;
  }>;
}

/**
 * Build the geocoding API URL for a city name.
 */
export function buildGeocodingUrl(cityName: string): string {
  const params = new URLSearchParams({
    name: cityName,
    count: String(MAX_RESULTS),
    format: "json",
  });
  return `${GEOCODING_BASE_URL}?${params.toString()}`;
}

/**
 * Geocode a city name to location candidates.
 *
 * @param cityName - The city name to search for
 * @param fetchFn - Fetch implementation (defaults to global fetch)
 * @returns Array of candidates, empty if nothing found
 * @throws Error if the API request fails
 */
export async function geocodeCity(
  cityName: string,
  fetchFn: FetchFn = fetch,
): Promise<GeocodingCandidate[]> {
  const trimmed = cityName.trim();
  if (trimmed.length === 0) return [];

  const url = buildGeocodingUrl(trimmed);
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new Error(
      `Geocoding API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OpenMeteoGeocodingResponse;

  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results.map((result) => ({
    name: result.name,
    country: result.country ?? "Unknown",
    admin1: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

/**
 * Convert a geocoding candidate to a UserLocation.
 */
export function candidateToLocation(
  candidate: GeocodingCandidate,
): UserLocation {
  const nameParts = [candidate.name];
  if (candidate.admin1) nameParts.push(candidate.admin1);
  nameParts.push(candidate.country);

  return {
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    name: nameParts.join(", "),
  };
}

/**
 * Format a candidate for display in a picker list.
 * E.g. "Vienna, State of Vienna, Austria"
 */
export function formatCandidate(candidate: GeocodingCandidate): string {
  const parts = [candidate.name];
  if (candidate.admin1) parts.push(candidate.admin1);
  parts.push(candidate.country);
  return parts.join(", ");
}
