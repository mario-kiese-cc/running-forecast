/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_VIEW_MODE,
  clearViewMode,
  loadViewMode,
  saveViewMode,
} from "./view-mode";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get length() {
      return storage.size;
    },
    key: vi.fn(() => null),
  },
  writable: true,
});

beforeEach(() => storage.clear());

describe("view-mode persistence", () => {
  it("defaults to timeline when nothing is saved", () => {
    expect(loadViewMode()).toBe("timeline");
    expect(DEFAULT_VIEW_MODE).toBe("timeline");
  });

  it("round-trips a saved mode", () => {
    saveViewMode("week");
    expect(loadViewMode()).toBe("week");
    expect(storage.get("running-forecast:view-mode")).toBe("week");
  });

  it("falls back to the default for an unrecognised value", () => {
    storage.set("running-forecast:view-mode", "calendar");
    expect(loadViewMode()).toBe(DEFAULT_VIEW_MODE);
  });

  it("clears the persisted mode", () => {
    saveViewMode("week");
    clearViewMode();
    expect(storage.get("running-forecast:view-mode")).toBeUndefined();
    expect(loadViewMode()).toBe(DEFAULT_VIEW_MODE);
  });
});
