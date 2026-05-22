import { describe, it, expect } from "vitest";
import { isDaylight, type DaylightWindow } from "./daylight";

const WINDOW: DaylightWindow = {
  sunrise: "2026-05-21T05:07",
  sunset: "2026-05-21T20:34",
};

describe("isDaylight", () => {
  it("should return true for mid-morning", () => {
    expect(isDaylight("2026-05-21T10:00", [WINDOW])).toBe(true);
  });

  it("should return true at exactly sunrise", () => {
    expect(isDaylight("2026-05-21T05:07", [WINDOW])).toBe(true);
  });

  it("should return false at exactly sunset", () => {
    // Sunset marks the end — the hour starting at sunset is dark
    expect(isDaylight("2026-05-21T20:34", [WINDOW])).toBe(false);
  });

  it("should return false for midnight", () => {
    expect(isDaylight("2026-05-21T00:00", [WINDOW])).toBe(false);
  });

  it("should return false before sunrise", () => {
    expect(isDaylight("2026-05-21T04:00", [WINDOW])).toBe(false);
  });

  it("should return false after sunset", () => {
    expect(isDaylight("2026-05-21T22:00", [WINDOW])).toBe(false);
  });

  it("should handle multiple days", () => {
    const windows: DaylightWindow[] = [
      { sunrise: "2026-05-21T05:07", sunset: "2026-05-21T20:34" },
      { sunrise: "2026-05-22T05:06", sunset: "2026-05-22T20:35" },
    ];

    // Day 1 evening: light
    expect(isDaylight("2026-05-21T19:00", windows)).toBe(true);
    // Day 1 night: dark
    expect(isDaylight("2026-05-21T23:00", windows)).toBe(false);
    // Day 2 morning: light
    expect(isDaylight("2026-05-22T08:00", windows)).toBe(true);
    // Day 2 before sunrise: dark
    expect(isDaylight("2026-05-22T04:00", windows)).toBe(false);
  });

  it("should return false when no windows provided", () => {
    expect(isDaylight("2026-05-21T12:00", [])).toBe(false);
  });
});
