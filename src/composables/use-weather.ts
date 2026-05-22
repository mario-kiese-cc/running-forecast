import { ref, watch } from "vue";
import type { Ref } from "vue";
import type { UserLocation, TimeSlot } from "../types";
import { fetchWeatherData, type FetchFn } from "../services/weather-service";
import { scoreAllHours } from "../services/run-scorer";

export type WeatherStatus = "idle" | "loading" | "ready" | "error";

/**
 * Composable that fetches weather data and scores time slots.
 *
 * Watches the location ref — when it becomes non-null, fetches data automatically.
 * Exposes scored time slots, loading state, and a manual refresh function.
 *
 * @param location - Reactive ref to the user's location
 * @param fetchFn - Optional fetch implementation for testing
 */
export function useWeather(
  location: Ref<UserLocation | null>,
  fetchFn?: FetchFn,
) {
  const slots = ref<TimeSlot[]>([]);
  const status = ref<WeatherStatus>("idle");
  const errorMessage = ref<string | null>(null);
  const lastFetchedAt = ref<string | null>(null);

  async function fetchAndScore(loc: UserLocation): Promise<void> {
    status.value = "loading";
    errorMessage.value = null;

    try {
      const hourlyData = await fetchWeatherData(loc, fetchFn);
      slots.value = scoreAllHours(hourlyData);
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

  // Auto-fetch when location becomes available
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
