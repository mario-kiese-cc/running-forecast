import { describe, it, expect } from "vitest";
import { isUnsociableHour, NIGHT_START_HOUR, NIGHT_END_HOUR } from "./night-hours";

describe("isUnsociableHour", () => {
  it("returns true at the start of the night window (21:00)", () => {
    expect(isUnsociableHour("2026-05-21T21:00")).toBe(true);
  });

  it("returns true just before sunrise (05:59 hour bucket)", () => {
    expect(isUnsociableHour("2026-05-21T05:00")).toBe(true);
  });

  it("returns true at midnight", () => {
    expect(isUnsociableHour("2026-05-21T00:00")).toBe(true);
  });

  it("returns false at the end of the night window (06:00)", () => {
    expect(isUnsociableHour("2026-05-21T06:00")).toBe(false);
  });

  it("returns false just before the night window (20:00)", () => {
    expect(isUnsociableHour("2026-05-21T20:00")).toBe(false);
  });

  it("returns false at noon", () => {
    expect(isUnsociableHour("2026-05-21T12:00")).toBe(false);
  });
});

describe("night boundary constants", () => {
  it("are set to 21 and 6", () => {
    expect(NIGHT_START_HOUR).toBe(21);
    expect(NIGHT_END_HOUR).toBe(6);
  });
});
