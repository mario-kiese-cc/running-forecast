import { computed, ref, watch } from "vue";
import type { ComputedRef, Ref } from "vue";
import type {
  HourlyData,
  ScoringProfile,
  TimeSlot,
  UserLocation,
} from "../types";
import { fetchWeatherData, type FetchFn } from "../services/weather-service";
import { scoreAllHours } from "../services/run-scorer";
import { DEFAULT_PROFILE } from "../services/scoring-profile-presets";

export type WeatherStatus = "idle" | "loading" | "ready" | "error";

/**
 * Composable that fetches weather data and scores time slots.
 *
 * Watches the location ref — when it becomes non-null, fetches data
 * automatically. Raw hourly data is cached in a ref; scored `slots` is
 * a `computed` over `(rawHourly, profile)` so a profile change re-scores
 * the visible forecast without a network refetch (see ADR-005).
 *
 * @param location - Reactive ref to the user's location
 * @param profile  - Reactive ref to the active scoring profile (optional;
 *                   defaults to `DEFAULT_PROFILE` for callers that don't
 *                   participate in the profile system yet, e.g. tests).
 * @param fetchFn  - Optional fetch implementation for testing
 */
export function useWeather(
  location: Ref<UserLocation | null>,
  profile?: Ref<ScoringProfile>,
  fetchFn?: FetchFn,
): {
  slots: ComputedRef<TimeSlot[]>;
  status: Ref<WeatherStatus>;
  errorMessage: Ref<string | null>;
  lastFetchedAt: Ref<string | null>;
  refresh: () => Promise<void>;
} {
  const rawHourly = ref<HourlyData[]>([]);
  const status = ref<WeatherStatus>("idle");
  const errorMessage = ref<string | null>(null);
  const lastFetchedAt = ref<string | null>(null);

  const slots = computed<TimeSlot[]>(() =>
    scoreAllHours(rawHourly.value, profile?.value ?? DEFAULT_PROFILE),
  );

  async function fetchAndScore(loc: UserLocation): Promise<void> {
    status.value = "loading";
    errorMessage.value = null;

    try {
      const hourlyData = await fetchWeatherData(loc, fetchFn);
      rawHourly.value = hourlyData;
      status.value = "ready";
      lastFetchedAt.value = new Date().toISOString();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Failed to fetch weather data";
      status.value = "error";
    }
  }

  /**
   * Manually refresh weather data for the current location.
   */
  async function refresh(): Promise<void> {
    if (location.value) {
      await fetchAndScore(location.value);
    }
  }

  // Auto-fetch when location becomes available.
  watch(
    location,
    (newLocation) => {
      if (newLocation) {
        fetchAndScore(newLocation);
      }
    },
    { immediate: true },
  );

  return {
    slots,
    status,
    errorMessage,
    lastFetchedAt,
    refresh,
  };
}
