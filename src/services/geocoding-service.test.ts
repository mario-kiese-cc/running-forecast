import { describe, it, expect, vi } from "vitest";
import {
  buildGeocodingUrl,
  geocodeCity,
  candidateToLocation,
  formatCandidate,
  type GeocodingCandidate,
} from "./geocoding-service";

function mockResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(data),
  } as Response;
}

const VIENNA_RESPONSE = {
  results: [
    {
      name: "Vienna",
      latitude: 48.20849,
      longitude: 16.37208,
      country: "Austria",
      admin1: "State of Vienna",
    },
    {
      name: "Vienna",
      latitude: 38.90122,
      longitude: -77.26526,
      country: "United States",
      admin1: "Virginia",
    },
  ],
};

// --- buildGeocodingUrl ---

describe("buildGeocodingUrl", () => {
  it("should include city name and count", () => {
    const url = buildGeocodingUrl("Vienna");

    expect(url).toContain("geocoding-api.open-meteo.com");
    expect(url).toContain("name=Vienna");
    expect(url).toContain("count=5");
  });

  it("should encode special characters in city name", () => {
    const url = buildGeocodingUrl("São Paulo");

    expect(url).toContain("name=S%C3%A3o+Paulo");
  });
});

// --- geocodeCity ---

describe("geocodeCity", () => {
  it("should return candidates for a valid city name", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockResponse(VIENNA_RESPONSE),
    );

    const candidates = await geocodeCity("Vienna", mockFetch);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].name).toBe("Vienna");
    expect(candidates[0].country).toBe("Austria");
    expect(candidates[0].admin1).toBe("State of Vienna");
    expect(candidates[0].latitude).toBeCloseTo(48.208, 2);
    expect(candidates[0].longitude).toBeCloseTo(16.372, 2);
  });

  it("should return empty array for no results", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockResponse({ results: [] }),
    );

    const candidates = await geocodeCity("xyznonexistent", mockFetch);

    expect(candidates).toEqual([]);
  });

  it("should return empty array when results key is missing", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockResponse({}),
    );

    const candidates = await geocodeCity("xyznonexistent", mockFetch);

    expect(candidates).toEqual([]);
  });

  it("should return empty array for empty input", async () => {
    const mockFetch = vi.fn();

    const candidates = await geocodeCity("", mockFetch);

    expect(candidates).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return empty array for whitespace-only input", async () => {
    const mockFetch = vi.fn();

    const candidates = await geocodeCity("   ", mockFetch);

    expect(candidates).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should throw when API request fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockResponse(null, false, 500),
    );

    await expect(geocodeCity("Vienna", mockFetch)).rejects.toThrow(
      "Geocoding API request failed: 500",
    );
  });

  it("should handle missing country gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockResponse({
        results: [{ name: "Test", latitude: 0, longitude: 0 }],
      }),
    );

    const candidates = await geocodeCity("Test", mockFetch);

    expect(candidates[0].country).toBe("Unknown");
    expect(candidates[0].admin1).toBeUndefined();
  });
});

// --- candidateToLocation ---

describe("candidateToLocation", () => {
  it("should convert a candidate with admin1 to a UserLocation", () => {
    const candidate: GeocodingCandidate = {
      name: "Vienna",
      country: "Austria",
      admin1: "State of Vienna",
      latitude: 48.20849,
      longitude: 16.37208,
    };

    const location = candidateToLocation(candidate);

    expect(location.latitude).toBeCloseTo(48.208, 2);
    expect(location.longitude).toBeCloseTo(16.372, 2);
    expect(location.name).toBe("Vienna, State of Vienna, Austria");
  });

  it("should handle candidates without admin1", () => {
    const candidate: GeocodingCandidate = {
      name: "Singapore",
      country: "Singapore",
      latitude: 1.28,
      longitude: 103.85,
    };

    const location = candidateToLocation(candidate);

    expect(location.name).toBe("Singapore, Singapore");
  });
});

// --- formatCandidate ---

describe("formatCandidate", () => {
  it("should format with admin1", () => {
    const candidate: GeocodingCandidate = {
      name: "Vienna",
      country: "Austria",
      admin1: "State of Vienna",
      latitude: 48.20849,
      longitude: 16.37208,
    };

    expect(formatCandidate(candidate)).toBe(
      "Vienna, State of Vienna, Austria",
    );
  });

  it("should format without admin1", () => {
    const candidate: GeocodingCandidate = {
      name: "Tokyo",
      country: "Japan",
      latitude: 35.68,
      longitude: 139.69,
    };

    expect(formatCandidate(candidate)).toBe("Tokyo, Japan");
  });
});
