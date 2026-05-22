import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveLocation, loadLocation, clearLocation } from "./location-service";
import type { UserLocation } from "../types";

// Mock localStorage for node/jsdom test environment
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  clear: vi.fn(() => {
    storage.clear();
  }),
  get length() {
    return storage.size;
  },
  key: vi.fn(() => null),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const VIENNA: UserLocation = {
  latitude: 48.21,
  longitude: 16.37,
  name: "Vienna",
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

describe("saveLocation", () => {
  it("should save a location to localStorage", () => {
    saveLocation(VIENNA);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "running-forecast:location",
      JSON.stringify(VIENNA),
    );
  });
});

describe("loadLocation", () => {
  it("should return a previously saved location", () => {
    saveLocation(VIENNA);
    const loaded = loadLocation();

    expect(loaded).toEqual(VIENNA);
  });

  it("should return undefined when nothing is saved", () => {
    expect(loadLocation()).toBeUndefined();
  });

  it("should return undefined for invalid JSON", () => {
    storage.set("running-forecast:location", "not-json{{{");
    expect(loadLocation()).toBeUndefined();
  });

  it("should return undefined for invalid location data (missing latitude)", () => {
    storage.set(
      "running-forecast:location",
      JSON.stringify({ longitude: 16.37 }),
    );
    expect(loadLocation()).toBeUndefined();
  });

  it("should return undefined for out-of-range latitude", () => {
    storage.set(
      "running-forecast:location",
      JSON.stringify({ latitude: 91, longitude: 16.37 }),
    );
    expect(loadLocation()).toBeUndefined();
  });

  it("should return undefined for out-of-range longitude", () => {
    storage.set(
      "running-forecast:location",
      JSON.stringify({ latitude: 48.21, longitude: 181 }),
    );
    expect(loadLocation()).toBeUndefined();
  });

  it("should accept a location without a name", () => {
    const noName: UserLocation = { latitude: 48.21, longitude: 16.37 };
    saveLocation(noName);
    expect(loadLocation()).toEqual(noName);
  });

  it("should reject location with non-string name", () => {
    storage.set(
      "running-forecast:location",
      JSON.stringify({ latitude: 48.21, longitude: 16.37, name: 42 }),
    );
    expect(loadLocation()).toBeUndefined();
  });
});

describe("clearLocation", () => {
  it("should remove the saved location", () => {
    saveLocation(VIENNA);
    clearLocation();

    expect(loadLocation()).toBeUndefined();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "running-forecast:location",
    );
  });
});
