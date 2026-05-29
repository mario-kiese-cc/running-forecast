/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useRunType,
  __resetRunTypeForTests,
} from "./use-run-type";
import { DEFAULT_RUN_TYPE } from "../services/run-type";

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
  __resetRunTypeForTests();
});

describe("useRunType", () => {
  it("initialises to DEFAULT_RUN_TYPE when nothing is saved", () => {
    const { runType } = useRunType();
    expect(runType.value).toBe(DEFAULT_RUN_TYPE);
    expect(DEFAULT_RUN_TYPE).toBe("easy");
  });

  it("shares state across multiple calls (singleton)", () => {
    const first = useRunType();
    const second = useRunType();
    expect(first.runType).toBe(second.runType);
  });

  it("setRunType updates the ref and persists to localStorage", () => {
    const { runType, setRunType } = useRunType();
    setRunType("intervals");
    expect(runType.value).toBe("intervals");
    expect(storage.get("running-forecast:run-type")).toBe("intervals");
  });

  it("subsequent calls read the persisted value", () => {
    const { setRunType } = useRunType();
    setRunType("long");
    __resetRunTypeForTests();
    const { runType } = useRunType();
    expect(runType.value).toBe("long");
  });

  it("reset clears storage and returns to the default", () => {
    const { setRunType, reset, runType } = useRunType();
    setRunType("recovery");
    reset();
    expect(runType.value).toBe(DEFAULT_RUN_TYPE);
    expect(storage.get("running-forecast:run-type")).toBeUndefined();
  });

  it("ignores an unrecognised persisted value and falls back to default", () => {
    storage.set("running-forecast:run-type", "not-a-run-type");
    const { runType } = useRunType();
    expect(runType.value).toBe(DEFAULT_RUN_TYPE);
  });
});
