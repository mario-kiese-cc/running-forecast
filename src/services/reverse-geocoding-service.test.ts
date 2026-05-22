import { describe, it, expect, vi } from "vitest";
import {
  buildReverseGeocodingUrl,
  reverseGeocode,
} from "./reverse-geocoding-service";

function makeFetchOk(body: unknown): typeof fetch {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  })) as unknown as typeof fetch;
}

function makeFetchHttpError(): typeof fetch {
  return vi.fn(async () => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    json: async () => ({}),
  })) as unknown as typeof fetch;
}

function makeFetchThrowing(): typeof fetch {
  return vi.fn(async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
}

function makeFetchBadJson(): typeof fetch {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => {
      throw new Error("bad json");
    },
  })) as unknown as typeof fetch;
}

describe("buildReverseGeocodingUrl", () => {
  it("includes latitude, longitude, and English language", () => {
    const url = buildReverseGeocodingUrl(48.21, 16.37);
    expect(url).toContain("latitude=48.21");
    expect(url).toContain("longitude=16.37");
    expect(url).toContain("localityLanguage=en");
  });

  it("uses the BigDataCloud host", () => {
    expect(buildReverseGeocodingUrl(0, 0)).toContain(
      "api.bigdatacloud.net/data/reverse-geocode-client",
    );
  });
});

describe("reverseGeocode", () => {
  it("returns the city when the API provides one", async () => {
    const fetchFn = makeFetchOk({
      city: "Vienna",
      countryName: "Austria",
    });

    const result = await reverseGeocode(48.21, 16.37, fetchFn);

    expect(result).toEqual({ city: "Vienna", country: "Austria" });
  });

  it("falls back to locality when city is missing", async () => {
    const fetchFn = makeFetchOk({
      city: "",
      locality: "Inner City",
      countryName: "Austria",
    });

    const result = await reverseGeocode(48.21, 16.37, fetchFn);

    expect(result?.city).toBe("Inner City");
  });

  it("falls back to principalSubdivision when city and locality are missing", async () => {
    const fetchFn = makeFetchOk({
      principalSubdivision: "Vienna",
      countryName: "Austria",
    });

    const result = await reverseGeocode(48.21, 16.37, fetchFn);

    expect(result?.city).toBe("Vienna");
  });

  it("trims whitespace from the chosen label", async () => {
    const fetchFn = makeFetchOk({ city: "  Vienna  " });
    const result = await reverseGeocode(48.21, 16.37, fetchFn);
    expect(result?.city).toBe("Vienna");
  });

  it("returns null when no usable label is present", async () => {
    const fetchFn = makeFetchOk({ city: "", locality: "", countryName: "X" });
    const result = await reverseGeocode(0, 0, fetchFn);
    expect(result).toBeNull();
  });

  it("returns null on HTTP error", async () => {
    const result = await reverseGeocode(0, 0, makeFetchHttpError());
    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    const result = await reverseGeocode(0, 0, makeFetchThrowing());
    expect(result).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    const result = await reverseGeocode(0, 0, makeFetchBadJson());
    expect(result).toBeNull();
  });

  it("omits country when the API does not provide it", async () => {
    const fetchFn = makeFetchOk({ city: "Vienna" });
    const result = await reverseGeocode(48.21, 16.37, fetchFn);
    expect(result).toEqual({ city: "Vienna", country: undefined });
  });
});
