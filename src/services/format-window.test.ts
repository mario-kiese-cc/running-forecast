import { describe, it, expect } from "vitest";
import { formatWindowRange } from "./format-window";

describe("formatWindowRange", () => {
  const TODAY = "2026-05-21";

  it("renders a same-day window with a single Today prefix", () => {
    expect(
      formatWindowRange("2026-05-21T08:00", "2026-05-21T12:00", TODAY),
    ).toBe("Today 08:00 – 12:00");
  });

  it("renders a same-day Tomorrow window with a single Tomorrow prefix", () => {
    expect(
      formatWindowRange("2026-05-22T06:00", "2026-05-22T09:00", TODAY),
    ).toBe("Tomorrow 06:00 – 09:00");
  });

  it("renders an end-of-day window with 24:00 on the start day", () => {
    expect(
      formatWindowRange("2026-05-21T20:00", "2026-05-22T00:00", TODAY),
    ).toBe("Today 20:00 – 24:00");
  });

  it("renders an early-morning Tomorrow window normally (no 24:00)", () => {
    expect(
      formatWindowRange("2026-05-22T00:00", "2026-05-22T02:00", TODAY),
    ).toBe("Tomorrow 00:00 – 02:00");
  });

  it("renders a cross-day window with non-midnight end using both prefixes", () => {
    expect(
      formatWindowRange("2026-05-21T22:00", "2026-05-22T03:00", TODAY),
    ).toBe("Today 22:00 – Tomorrow 03:00");
  });

  it("uses raw date strings for days beyond tomorrow", () => {
    expect(
      formatWindowRange("2026-05-25T10:00", "2026-05-25T12:00", TODAY),
    ).toBe("2026-05-25 10:00 – 12:00");
  });
});
