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
 */
export function useLocation() {
  const location = ref<UserLocation | null>(null);
  const status = ref<LocationStatus>("loading");
  const errorMessage = ref<string | null>(null);

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
  }

  return {
    location,
    status,
    errorMessage,
    setManualLocation,
  };
}
