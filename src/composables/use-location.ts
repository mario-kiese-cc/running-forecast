import { ref, onMounted } from "vue";
import type { UserLocation } from "../types";
import {
  loadLocation,
  saveLocation,
  requestGeolocation,
} from "../services/location-service";
import { reverseGeocode } from "../services/reverse-geocoding-service";

export type LocationStatus = "loading" | "ready" | "prompt" | "error";

/**
 * Status of a user-triggered re-detection. Kept separate from the main
 * `status` so re-detection does not flip the whole app back to a loading
 * skeleton.
 */
export type DetectionStatus = "idle" | "detecting" | "error";

/**
 * If the location has no `name`, look up a nearest-city label via reverse
 * geocoding. Returns the original location unchanged on failure or when a
 * name is already present. Pure with respect to its inputs aside from the
 * network call.
 */
async function enrichWithCityName(
  loc: UserLocation,
): Promise<UserLocation> {
  if (loc.name && loc.name.length > 0) return loc;

  const result = await reverseGeocode(loc.latitude, loc.longitude);
  if (!result) return loc;

  const name = result.country
    ? `${result.city}, ${result.country}`
    : result.city;
  return { ...loc, name };
}

/**
 * Composable for managing user location.
 *
 * On mount, tries to load from localStorage.
 * If nothing saved, tries browser geolocation.
 * If that fails, sets status to "prompt" so the UI can show a manual input.
 *
 * Exposes `detectLocation()` so the user can explicitly re-trigger the
 * browser Geolocation API at any time (e.g. after moving cities).
 */
export function useLocation() {
  const location = ref<UserLocation | null>(null);
  const status = ref<LocationStatus>("loading");
  const errorMessage = ref<string | null>(null);

  const detectionStatus = ref<DetectionStatus>("idle");
  const detectionError = ref<string | null>(null);

  onMounted(async () => {
    // Try localStorage first
    const saved = loadLocation();
    if (saved) {
      location.value = saved;
      status.value = "ready";
      // Backfill a city name for legacy saved locations that lack one.
      void enrichAndPersist(saved);
      return;
    }

    // Try browser geolocation
    try {
      const geo = await requestGeolocation();
      location.value = geo;
      saveLocation(geo);
      status.value = "ready";
      // Detected locations never carry a name — enrich asynchronously.
      void enrichAndPersist(geo);
    } catch (error) {
      // Geolocation denied or unavailable — ask user for manual input
      errorMessage.value =
        error instanceof Error ? error.message : "Location unavailable";
      status.value = "prompt";
    }
  });

  /**
   * Resolve a nearest-city name in the background and patch state +
   * localStorage if the active location is still the one we enriched.
   */
  async function enrichAndPersist(loc: UserLocation): Promise<void> {
    const enriched = await enrichWithCityName(loc);
    if (enriched === loc) return; // No change — lookup failed or name already present.

    // Only commit if the user hasn't swapped to a different location in the meantime.
    const current = location.value;
    if (
      current &&
      current.latitude === loc.latitude &&
      current.longitude === loc.longitude
    ) {
      location.value = enriched;
      saveLocation(enriched);
    }
  }

  /**
   * Set location manually (from user input).
   * Saves to localStorage for next visit.
   */
  function setManualLocation(loc: UserLocation): void {
    const stamped: UserLocation = { ...loc, source: "manual" };
    location.value = stamped;
    saveLocation(stamped);
    status.value = "ready";
    errorMessage.value = null;
    // A successful manual set supersedes any prior detection error.
    detectionStatus.value = "idle";
    detectionError.value = null;
  }

  /**
   * Re-trigger the browser Geolocation API and replace the current
   * location with the result. Independent of the initial-mount flow.
   *
   * Safe to call from any state; does nothing destructive on failure
   * (the existing location stays put and `detectionError` is set).
   */
  async function detectLocation(): Promise<void> {
    // Snapshot the active location so a concurrent manual set during the
    // request doesn't get clobbered by a stale geolocation result.
    const before = location.value;
    detectionStatus.value = "detecting";
    detectionError.value = null;

    try {
      const geo = await requestGeolocation();

      // If the user manually set a different location while we were
      // waiting, honour that and drop our result on the floor.
      if (location.value !== before && location.value !== null) {
        const current = location.value;
        const movedDeliberately =
          current.latitude !== before?.latitude ||
          current.longitude !== before?.longitude;
        if (movedDeliberately) {
          detectionStatus.value = "idle";
          return;
        }
      }

      location.value = geo;
      saveLocation(geo);
      status.value = "ready";
      errorMessage.value = null;
      detectionStatus.value = "idle";
      // Enrich asynchronously — guarded against further changes internally.
      void enrichAndPersist(geo);
    } catch (error) {
      detectionError.value =
        error instanceof Error ? error.message : "Location unavailable";
      detectionStatus.value = "error";
    }
  }

  return {
    location,
    status,
    errorMessage,
    setManualLocation,
    detectLocation,
    detectionStatus,
    detectionError,
  };
}
