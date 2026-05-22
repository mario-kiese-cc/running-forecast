import { describe, it, expect } from "vitest";
import { dateToLabel, addDays, getTodayString } from "./day-label";

describe("dateToLabel", () => {
  const TODAY = "2026-05-21";

  it("labels today's date as 'Today'", () => {
    expect(dateToLabel("2026-05-21", TODAY)).toBe("Today");
  });

  it("labels tomorrow's date as 'Tomorrow'", () => {
    expect(dateToLabel("2026-05-22", TODAY)).toBe("Tomorrow");
  });

  it("falls back to the raw date string for other days", () => {
    expect(dateToLabel("2026-05-25", TODAY)).toBe("2026-05-25");
  });

  it("handles month rollover for tomorrow", () => {
    expect(dateToLabel("2026-06-01", "2026-05-31")).toBe("Tomorrow");
  });

  it("handles year rollover for tomorrow", () => {
    expect(dateToLabel("2027-01-01", "2026-12-31")).toBe("Tomorrow");
  });
});

describe("addDays", () => {
  it("adds a single day", () => {
    expect(addDays("2026-05-21", 1)).toBe("2026-05-22");
  });

  it("handles month rollover", () => {
    expect(addDays("2026-05-31", 1)).toBe("2026-06-01");
  });

  it("handles leap year (Feb 28 → Feb 29)", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("handles non-leap year (Feb 28 → Mar 1)", () => {
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("supports zero", () => {
    expect(addDays("2026-05-21", 0)).toBe("2026-05-21");
  });
});

describe("getTodayString", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the current local date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(getTodayString()).toBe(expected);
  });
});
