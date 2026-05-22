import { describe, it, expect, vi } from "vitest";
import {
  buildForecastUrl,
  buildAirQualityUrl,
  parseForecastResponse,
  parseAirQualityResponse,
  mergeWeatherAndAqi,
  fetchWeatherData,
} from "./weather-service";
import type { UserLocation } from "../types";
import sampleWeather from "../../data/sample-weather.json";
import sampleAirQuality from "../../data/sample-air-quality.json";

const VIENNA: UserLocation = {
  latitude: 48.21,
  longitude: 16.37,
  name: "Vienna",
};

// --- URL builders ---

describe("buildForecastUrl", () => {
  it("should include latitude, longitude, and required params", () => {
    const url = buildForecastUrl(VIENNA);

    expect(url).toContain("api.open-meteo.com/v1/forecast");
    expect(url).toContain("latitude=48.21");
    expect(url).toContain("longitude=16.37");
    expect(url).toContain("temperature_2m");
    expect(url).toContain("apparent_temperature");
    expect(url).toContain("precipitation_probability");
    expect(url).toContain("sunrise");
    expect(url).toContain("sunset");
    expect(url).toContain("timezone=auto");
    expect(url).toContain("forecast_days=2");
  });
});

describe("buildAirQualityUrl", () => {
  it("should point to air quality API with european_aqi", () => {
    const url = buildAirQualityUrl(VIENNA);

    expect(url).toContain("air-quality-api.open-meteo.com");
    expect(url).toContain("european_aqi");
    expect(url).toContain("latitude=48.21");
  });
});

// --- Response parsing ---

describe("parseForecastResponse", () => {
  it("should parse all hours from sample data", () => {
    const conditions = parseForecastResponse(sampleWeather);

    expect(conditions).toHaveLength(6);
  });

  it("should map API fields to HourlyConditions correctly", () => {
    const conditions = parseForecastResponse(sampleWeather);
    const sixAm = conditions[0];

    expect(sixAm.time).toBe("2026-05-21T06:00");
    expect(sixAm.temperatureCelsius).toBe(12.0);
    expect(sixAm.apparentTemperatureCelsius).toBe(10.0);
    expect(sixAm.precipitationProbability).toBe(0);
    expect(sixAm.precipitationMm).toBe(0.0);
    expect(sixAm.relativeHumidity).toBe(65);
    expect(sixAm.windSpeedKmh).toBe(5.0);
    expect(sixAm.uvIndex).toBe(1.0);
  });

  it("should compute daylight correctly from sunrise/sunset", () => {
    const conditions = parseForecastResponse(sampleWeather);

    // 06:00 — after sunrise (05:07), before sunset (20:34) → daylight
    expect(conditions[0].isDaylight).toBe(true);

    // 12:00 — midday → daylight
    expect(conditions[3].isDaylight).toBe(true);

    // 18:00 — before sunset → daylight
    expect(conditions[4].isDaylight).toBe(true);

    // 22:00 — after sunset (20:34) → dark
    expect(conditions[5].isDaylight).toBe(false);
  });
});

describe("parseAirQualityResponse", () => {
  it("should return a map of time to AQI values", () => {
    const aqiMap = parseAirQualityResponse(sampleAirQuality);

    expect(aqiMap.size).toBe(6);
    expect(aqiMap.get("2026-05-21T06:00")).toBe(25);
    expect(aqiMap.get("2026-05-21T12:00")).toBe(80);
    expect(aqiMap.get("2026-05-21T18:00")).toBe(120);
  });

  it("should skip null AQI values", () => {
    const response = {
      hourly: {
        time: ["2026-05-21T06:00", "2026-05-21T07:00"],
        european_aqi: [25, null],
      },
    };
    const aqiMap = parseAirQualityResponse(response);

    expect(aqiMap.size).toBe(1);
    expect(aqiMap.has("2026-05-21T07:00")).toBe(false);
  });
});

// --- Merge ---

describe("mergeWeatherAndAqi", () => {
  it("should attach AQI values by matching timestamps", () => {
    const conditions = parseForecastResponse(sampleWeather);
    const aqiMap = parseAirQualityResponse(sampleAirQuality);
    const merged = mergeWeatherAndAqi(conditions, aqiMap);

    expect(merged).toHaveLength(6);
    expect(merged[0].conditions.time).toBe("2026-05-21T06:00");
    expect(merged[0].aqi).toBe(25);
    expect(merged[3].aqi).toBe(80);
  });

  it("should leave aqi undefined when AQI map is empty", () => {
    const conditions = parseForecastResponse(sampleWeather);
    const merged = mergeWeatherAndAqi(conditions, new Map());

    for (const hour of merged) {
      expect(hour.aqi).toBeUndefined();
    }
  });
});

// --- fetchWeatherData (integration with mock fetch) ---

describe("fetchWeatherData", () => {
  function mockResponse(data: unknown, ok = true, status = 200): Response {
    return {
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      json: () => Promise.resolve(data),
    } as Response;
  }

  it("should fetch and merge weather + AQI data", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(sampleWeather))
      .mockResolvedValueOnce(mockResponse(sampleAirQuality));

    const result = await fetchWeatherData(VIENNA, mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(6);
    expect(result[0].conditions.time).toBe("2026-05-21T06:00");
    expect(result[0].aqi).toBe(25);
  });

  it("should degrade gracefully when AQI API fails", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(sampleWeather))
      .mockResolvedValueOnce(mockResponse(null, false, 500));

    const result = await fetchWeatherData(VIENNA, mockFetch);

    expect(result).toHaveLength(6);
    // All AQI values should be undefined
    for (const hour of result) {
      expect(hour.aqi).toBeUndefined();
    }
  });

  it("should throw when forecast API fails", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(null, false, 503))
      .mockResolvedValueOnce(mockResponse(sampleAirQuality));

    await expect(fetchWeatherData(VIENNA, mockFetch)).rejects.toThrow(
      "Weather API request failed: 503",
    );
  });

  it("should fetch both APIs in parallel", async () => {
    const callOrder: string[] = [];
    const mockFetch = vi.fn((url: string) => {
      callOrder.push(url.includes("air-quality") ? "aqi" : "forecast");
      if (url.includes("air-quality")) {
        return Promise.resolve(mockResponse(sampleAirQuality));
      }
      return Promise.resolve(mockResponse(sampleWeather));
    });

    await fetchWeatherData(VIENNA, mockFetch);

    // Both should be called (order may vary since they're parallel)
    expect(callOrder).toContain("forecast");
    expect(callOrder).toContain("aqi");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
