/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WeekGridView from "./week-grid-view.vue";
import { buildWeekGrid } from "../services/week-grid";
import type { ScoreFactors, TimeSlot } from "../types";

function makeSlot(time: string, score = 70): TimeSlot {
  const factors: ScoreFactors = {
    precipitation: 100,
    temperature: 100,
    wind: 100,
    humidity: 100,
    airQuality: 100,
    daylight: 100,
  };
  return {
    time,
    score,
    rating: score >= 80 ? "great" : score >= 60 ? "good" : "fair",
    factors,
    conditions: {
      time,
      temperatureCelsius: 14,
      apparentTemperatureCelsius: 13,
      precipitationProbability: 0,
      precipitationMm: 0,
      relativeHumidity: 50,
      windSpeedKmh: 5,
      uvIndex: 3,
      isDaylight: true,
    },
  };
}

function fullDay(dateIso: string): TimeSlot[] {
  return Array.from({ length: 24 }, (_, h) =>
    makeSlot(`${dateIso}T${String(h).padStart(2, "0")}:00`),
  );
}

describe("WeekGridView", () => {
  it("renders an empty message with no rows", () => {
    const wrapper = mount(WeekGridView, { props: { rows: [] } });
    expect(wrapper.text()).toContain("No forecast data available.");
  });

  it("renders 24 column headers and one row per day", () => {
    const rows = buildWeekGrid(
      [...fullDay("2026-05-21"), ...fullDay("2026-05-22")],
      new Date(2026, 4, 21, 0, 0, 0),
    );
    const wrapper = mount(WeekGridView, { props: { rows } });
    expect(wrapper.findAll('[role="columnheader"]')).toHaveLength(25); // corner + 24
    expect(wrapper.findAll('[role="rowheader"]')).toHaveLength(2);
    expect(wrapper.findAll('[role="gridcell"]')).toHaveLength(48);
  });

  it("makes only future cells with data focusable", () => {
    const rows = buildWeekGrid(
      fullDay("2026-05-21"),
      new Date(2026, 4, 21, 8, 0, 0),
    );
    const wrapper = mount(WeekGridView, { props: { rows } });
    const focusable = wrapper
      .findAll('[role="gridcell"]')
      .filter((c) => c.attributes("tabindex") === "0");
    // Exactly one tab stop (roving tabindex).
    expect(focusable).toHaveLength(1);
    // Past cells are aria-disabled.
    const disabled = wrapper
      .findAll('[role="gridcell"]')
      .filter((c) => c.attributes("aria-disabled") === "true");
    expect(disabled.length).toBeGreaterThan(0);
  });

  it("emits selectSlot with the ISO time when an interactive cell is clicked", async () => {
    const rows = buildWeekGrid(
      fullDay("2026-05-21"),
      new Date(2026, 4, 21, 8, 0, 0),
    );
    const wrapper = mount(WeekGridView, { props: { rows } });
    const target = wrapper.find('[data-time="2026-05-21T15:00"]');
    await target.trigger("click");
    expect(wrapper.emitted("selectSlot")).toEqual([["2026-05-21T15:00"]]);
  });

  it("does not emit selectSlot for a past cell", async () => {
    const rows = buildWeekGrid(
      fullDay("2026-05-21"),
      new Date(2026, 4, 21, 8, 0, 0),
    );
    const wrapper = mount(WeekGridView, { props: { rows } });
    const past = wrapper.find('[data-time="2026-05-21T03:00"]');
    await past.trigger("click");
    expect(wrapper.emitted("selectSlot")).toBeUndefined();
  });

  it("renders the legend", () => {
    const rows = buildWeekGrid(
      fullDay("2026-05-21"),
      new Date(2026, 4, 21, 0, 0, 0),
    );
    const wrapper = mount(WeekGridView, { props: { rows } });
    expect(wrapper.find('[aria-label="Score legend"]').exists()).toBe(true);
  });
});
