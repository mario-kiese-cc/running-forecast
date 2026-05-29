/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useViewMode, __resetViewModeForTests } from "./use-view-mode";
import { DEFAULT_VIEW_MODE } from "../services/view-mode";

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

beforeEach(() => {
  storage.clear();
  __resetViewModeForTests();
});

describe("useViewMode", () => {
  it("initialises to the default when nothing is saved", () => {
    const { viewMode } = useViewMode();
    expect(viewMode.value).toBe(DEFAULT_VIEW_MODE);
  });

  it("shares state across calls (singleton)", () => {
    expect(useViewMode().viewMode).toBe(useViewMode().viewMode);
  });

  it("setViewMode updates the ref and persists", () => {
    const { viewMode, setViewMode } = useViewMode();
    setViewMode("week");
    expect(viewMode.value).toBe("week");
    expect(storage.get("running-forecast:view-mode")).toBe("week");
  });

  it("restores the persisted value on a fresh singleton", () => {
    useViewMode().setViewMode("week");
    __resetViewModeForTests();
    expect(useViewMode().viewMode.value).toBe("week");
  });

  it("reset clears storage and returns to default", () => {
    const { setViewMode, reset, viewMode } = useViewMode();
    setViewMode("week");
    reset();
    expect(viewMode.value).toBe(DEFAULT_VIEW_MODE);
    expect(storage.get("running-forecast:view-mode")).toBeUndefined();
  });
});
