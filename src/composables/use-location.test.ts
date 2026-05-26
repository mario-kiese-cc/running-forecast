/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useLocation } from "./use-location";
import type { UserLocation } from "../types";

// ---------- localStorage mock ----------

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

// ---------- geolocation mock ----------

type SuccessCallback = (pos: GeolocationPosition) => void;
type ErrorCallback = (err: GeolocationPositionError) => void;

let geolocationImpl: (success: SuccessCallback, error: ErrorCallback) => void =
  (_s, error) => error({ message: "default-deny", code: 1 } as GeolocationPositionError);

Object.defineProperty(globalThis, "navigator", {
  value: {
    ...globalThis.navigator,
    geolocation: {
      getCurrentPosition: vi.fn(
        (success: SuccessCallback, error: ErrorCallback) =>
          geolocationImpl(success, error),
      ),
    },
  },
  writable: true,
});

// ---------- reverse-geocoding mock ----------
// The composable enriches detected locations asynchronously. Stub it to a
// no-op so tests stay deterministic.

vi.mock("../services/reverse-geocoding-service", () => ({
  reverseGeocode: vi.fn(async () => undefined),
}));

// ---------- helpers ----------

/** Mount a tiny harness so onMounted runs and we can drive the composable. */
function mountComposable() {
  let api!: ReturnType<typeof useLocation>;
  const Harness = defineComponent({
    setup() {
      api = useLocation();
      return () => h("div");
    },
  });
  const wrapper = mount(Harness);
  return { wrapper, api: () => api };
}

const VIENNA_GEO: UserLocation = {
  latitude: 48.21,
  longitude: 16.37,
  source: "detected",
};

const BERLIN_MANUAL: UserLocation = {
  latitude: 52.52,
  longitude: 13.405,
  name: "Berlin",
  source: "manual",
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  // Default geolocation: deny so the initial mount lands on "prompt".
  geolocationImpl = (_s, error) =>
    error({ message: "denied", code: 1 } as GeolocationPositionError);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLocation – detectLocation", () => {
  it("replaces the current location with a fresh geolocation result", async () => {
    // Start with a saved manual location.
    storage.set("running-forecast:location", JSON.stringify(BERLIN_MANUAL));

    const { api } = mountComposable();
    await nextTick();
    expect(api().location.value).toEqual(BERLIN_MANUAL);

    // Switch geolocation to succeed.
    geolocationImpl = (success) =>
      success({
        coords: { latitude: 48.21, longitude: 16.37 },
      } as GeolocationPosition);

    await api().detectLocation();

    expect(api().location.value).toEqual(VIENNA_GEO);
    expect(api().detectionStatus.value).toBe("idle");
    expect(api().detectionError.value).toBeNull();

    // Persisted to localStorage.
    const saved = JSON.parse(
      storage.get("running-forecast:location") ?? "null",
    );
    expect(saved).toEqual(VIENNA_GEO);
  });

  it("surfaces an error when geolocation is denied without clobbering the current location", async () => {
    storage.set("running-forecast:location", JSON.stringify(BERLIN_MANUAL));

    const { api } = mountComposable();
    await nextTick();

    geolocationImpl = (_s, error) =>
      error({ message: "User denied", code: 1 } as GeolocationPositionError);

    await api().detectLocation();

    expect(api().detectionStatus.value).toBe("error");
    expect(api().detectionError.value).toContain("User denied");
    // Existing location is preserved.
    expect(api().location.value).toEqual(BERLIN_MANUAL);
  });

  it("transitions through 'detecting' while the request is in flight", async () => {
    storage.set("running-forecast:location", JSON.stringify(BERLIN_MANUAL));

    const { api } = mountComposable();
    await nextTick();

    let resolveGeo: (() => void) | null = null;
    geolocationImpl = (success) => {
      resolveGeo = () =>
        success({
          coords: { latitude: 48.21, longitude: 16.37 },
        } as GeolocationPosition);
    };

    const pending = api().detectLocation();
    // Synchronously after kick-off we should be detecting.
    expect(api().detectionStatus.value).toBe("detecting");

    resolveGeo?.();
    await pending;

    expect(api().detectionStatus.value).toBe("idle");
  });

  it("drops a stale geolocation result if the user manually picked a different location in the meantime", async () => {
    storage.set("running-forecast:location", JSON.stringify(BERLIN_MANUAL));

    const { api } = mountComposable();
    await nextTick();

    // Defer the geolocation callback so we can race a manual set against it.
    let triggerGeo: (() => void) | null = null;
    geolocationImpl = (success) => {
      triggerGeo = () =>
        success({
          coords: { latitude: 48.21, longitude: 16.37 },
        } as GeolocationPosition);
    };

    const pending = api().detectLocation();

    // Simulate the user typing a different city while detection is pending.
    const PARIS: UserLocation = {
      latitude: 48.8566,
      longitude: 2.3522,
      name: "Paris",
    };
    api().setManualLocation(PARIS);

    triggerGeo?.();
    await pending;

    // Manual choice wins.
    expect(api().location.value?.name).toBe("Paris");
  });

  it("clears prior detection error when the user manually sets a location", async () => {
    storage.set("running-forecast:location", JSON.stringify(BERLIN_MANUAL));

    const { api } = mountComposable();
    await nextTick();

    geolocationImpl = (_s, error) =>
      error({ message: "denied", code: 1 } as GeolocationPositionError);
    await api().detectLocation();
    expect(api().detectionStatus.value).toBe("error");

    api().setManualLocation({
      latitude: 48.8566,
      longitude: 2.3522,
      name: "Paris",
    });

    expect(api().detectionStatus.value).toBe("idle");
    expect(api().detectionError.value).toBeNull();
  });
});
