import type { UserLocation } from "../types";

const STORAGE_KEY = "running-forecast:location";

/**
 * Save a user location to localStorage.
 */
export function saveLocation(location: UserLocation): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

/**
 * Load a previously saved location from localStorage.
 * Returns undefined if nothing is saved or the data is invalid.
 */
export function loadLocation(): UserLocation | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidLocation(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * Clear the saved location from localStorage.
 */
export function clearLocation(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Request the user's location via the browser Geolocation API.
 * Returns a Promise that resolves with the location or rejects on error/denial.
 */
export function requestGeolocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "detected",
        });
      },
      (error) => {
        reject(new Error(`Geolocation failed: ${error.message}`));
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000, // Cache for 5 minutes
      },
    );
  });
}

/**
 * Type guard to validate that a parsed value is a UserLocation.
 */
function isValidLocation(value: unknown): value is UserLocation {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;
  if (typeof obj.latitude !== "number" || typeof obj.longitude !== "number") {
    return false;
  }
  if (obj.latitude < -90 || obj.latitude > 90) return false;
  if (obj.longitude < -180 || obj.longitude > 180) return false;

  if (obj.name !== undefined && typeof obj.name !== "string") return false;
  if (
    obj.source !== undefined &&
    obj.source !== "detected" &&
    obj.source !== "manual"
  ) {
    return false;
  }

  return true;
}
