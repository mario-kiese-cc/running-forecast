/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "./App.vue";

// Mock localStorage for jsdom
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get length() { return storage.size; },
    key: vi.fn(() => null),
  },
  writable: true,
});

// Mock navigator.geolocation to avoid async side effects
Object.defineProperty(globalThis, "navigator", {
  value: {
    ...globalThis.navigator,
    geolocation: {
      getCurrentPosition: vi.fn((_success, error) => {
        // Simulate geolocation denied so we land on the "prompt" state
        error({ message: "Denied", code: 1 });
      }),
    },
  },
  writable: true,
});

beforeEach(() => {
  storage.clear();
});

describe("App", () => {
  it("should render the app title", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Running Forecast");
  });

  it("should render the subtitle", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Find the best time to run");
  });
});
