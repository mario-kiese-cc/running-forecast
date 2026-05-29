import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useWeather } from "./use-weather";
import type { ScoringProfile, UserLocation } from "../types";
import sampleWeather from "../../data/sample-weather.json";
import sampleAirQuality from "../../data/sample-air-quality.json";
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE,
} from "../services/scoring-profile-presets";

/**
 * @vitest-environment jsdom
 */

const VIENNA: UserLocation = {
  latitude: 48.21,
  longitude: 16.37,
  name: "Vienna",
};

function mockResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(data),
  } as Response;
}

function createSuccessFetch(): ReturnType<typeof vi.fn> {
  return vi.fn((url: string) => {
    if (url.includes("air-quality")) {
      return Promise.resolve(mockResponse(sampleAirQuality));
    }
    return Promise.resolve(mockResponse(sampleWeather));
  });
}

describe("useWeather", () => {
  it("should start as idle when location is null", () => {
    const location = ref<UserLocation | null>(null);
    const profile = ref<ScoringProfile>(DEFAULT_PROFILE);
    const { status, slots } = useWeather(location, profile, vi.fn());

    expect(status.value).toBe("idle");
    expect(slots.value).toEqual([]);
  });

  it("should fetch and score when location becomes available", async () => {
    const location = ref<UserLocation | null>(null);
    const profile = ref<ScoringProfile>(DEFAULT_PROFILE);
    const mockFetch = createSuccessFetch();
    const { status, slots } = useWeather(location, profile, mockFetch);

    // Set location — triggers watch
    location.value = VIENNA;
    await nextTick();
    // Wait for the async fetchAndScore to complete
    await vi.waitFor(() => {
      expect(status.value).toBe("ready");
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(slots.value).toHaveLength(6);
    expect(slots.value[0].time).toBe("2026-05-21T06:00");
    expect(slots.value[0].score).toBeGreaterThan(0);
    expect(slots.value[0].rating).toBeDefined();
  });

  it("should fetch immediately when location is provided at creation", async () => {
    const location = ref<UserLocation | null>(VIENNA);
    const profile = ref<ScoringProfile>(DEFAULT_PROFILE);
    const mockFetch = createSuccessFetch();
    const { status, slots } = useWeather(location, profile, mockFetch);

    await vi.waitFor(() => {
      expect(status.value).toBe("ready");
    });

    expect(slots.value).toHaveLength(6);
  });

  it("should set error status when forecast API fails", async () => {
    const location = ref<UserLocation | null>(VIENNA);
    const profile = ref<ScoringProfile>(DEFAULT_PROFILE);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(null, false, 500))
      .mockResolvedValueOnce(mockResponse(sampleAirQuality));

    const { status, errorMessage } = useWeather(location, profile, mockFetch);

    await vi.waitFor(() => {
      expect(status.value).toBe("error");
    });

    expect(errorMessage.value).toContain("Weather API request failed");
  });

  it("should support manual refresh", async () => {
    const location = ref<UserLocation | null>(VIENNA);
    const profile = ref<ScoringProfile>(DEFAULT_PROFILE);
    const mockFetch = createSuccessFetch();
    const { status, refresh, slots } = useWeather(location, profile, mockFetch);

    await vi.waitFor(() => {
      expect(status.value).toBe("ready");
    });

    const firstFetchCount = mockFetch.mock.calls.length;

    await refresh();

    expect(mockFetch.mock.calls.length).toBe(firstFetchCount + 2);
    expect(slots.value).toHaveLength(6);
  });

  it("should record lastFetchedAt on success", async () => {
    const location = ref<UserLocation | null>(VIENNA);
    const profile = ref<ScoringProfile>(DEFAULT_PROFILE);
    const mockFetch = createSuccessFetch();
    const { status, lastFetchedAt } = useWeather(location, profile, mockFetch);

    expect(lastFetchedAt.value).toBeNull();

    await vi.waitFor(() => {
      expect(status.value).toBe("ready");
    });

    expect(lastFetchedAt.value).not.toBeNull();
    // Should be a valid ISO date
    expect(new Date(lastFetchedAt.value!).getTime()).not.toBeNaN();
  });

  it("should re-score slots when the profile ref changes", async () => {
    const location = ref<UserLocation | null>(VIENNA);
    const profile = ref<ScoringProfile>(DEFAULT_PROFILE);
    const mockFetch = createSuccessFetch();
    const { status, slots } = useWeather(location, profile, mockFetch);

    await vi.waitFor(() => {
      expect(status.value).toBe("ready");
    });

    const defaultScores = slots.value.map((slot) => slot.score);

    // Switching presets must trigger a recompute without a refetch.
    profile.value = BUILT_IN_PROFILES["heat-sensitive"];
    await nextTick();

    const heatScores = slots.value.map((slot) => slot.score);
    expect(heatScores).not.toEqual(defaultScores);
    // No additional network calls — still the original 2 (forecast + AQI).
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
