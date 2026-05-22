# Plan: Improve Best-Window Display & De-emphasize Nighttime Hours

## Status: Approved

**Resolved questions:**
1. If every good hour falls in 21:00–05:59 → fall back to the best night window with a "late night" hint.
2. Night-card styling: ~50% opacity + neutral border (no rating color accent).
3. Hour boundaries: `21:00` slot = night, `06:00` slot = day.

## Goals (revised)

1. Render a window that ends at midnight as `24:00` rather than `00:00`.
2. Prefix window ranges with `Today` / `Tomorrow` so the day is unambiguous (e.g. `Today 08:00 – 24:00`, `Tomorrow 00:00 – 02:00`).
3. Visually de-emphasize "unsociable" running hours (21:00–05:59) in the hourly timeline, and exclude them from "best window" recommendations so we don't suggest 3 a.m. runs.

## Problem Analysis

The "Best time to run" summary in `src/components/timeline-view.vue` currently renders ranges like:

- **Today:** `08:00 – 00:00`  ← end belongs to the next day (midnight)
- **Tomorrow:** `00:00 – 02:00`

Two root causes interact:

1. **`buildDayForecasts` (slot-builder.ts)** groups slots by calendar date, so a long evening window for "today" naturally ends at the next day's `T00:00`, and a separate "tomorrow" window starts at `T00:00`.
2. **`formatWindowRange` (timeline-view.vue)** does a naive `endTime.slice(11, 16)`, which renders `2026-05-22T00:00` as `00:00`, losing the "end of day" semantic and never showing which day either endpoint belongs to.

`computeEndTime` in `slot-builder.ts` already correctly rolls the date forward — that behavior is right and is asserted by an existing test (`slot-builder.test.ts:110`). We only need to **fix presentation**, not the data model.

Additionally, the hourly `TimeSlotCard` list shows every hour 00–23 with equal visual weight. Late-night / pre-dawn hours dominate scrolling and can produce best-window suggestions nobody will act on.

## Proposed Changes

### A. Window range formatting

Pure helper `formatWindowRange(startTime, endTime, today)`:

- Strip `HH:MM` from both ISO strings (no `Date` parsing, timezone-safe).
- Compute day labels (`Today` / `Tomorrow` / `YYYY-MM-DD`) using the same logic as `dateToLabel` in `slot-builder.ts` — extract that helper into a shared module so both files share one source of truth.
- If `endTime`'s date > `startTime`'s date **and** end time is `00:00`, treat the end as belonging to the start day at `24:00`.
- Output rules:
  - Same logical day → `Today 08:00 – 12:00` (single prefix, omitted on the end).
  - Ends at midnight on start day → `Today 08:00 – 24:00`.
  - Crosses to a different labelled day with a non-midnight end (theoretical given current grouping) → `Today 22:00 – Tomorrow 03:00`.

### B. Nighttime de-emphasis (21:00–05:59)

- New helper `isUnsociableHour(time: string): boolean` — parses the `HH` portion; returns `true` for `hour >= 21 || hour < 6`.
- **Visual:** `TimeSlotCard` gets a `--night` modifier class with reduced opacity / muted colors when `isUnsociableHour(slot.time)` is true.
- **Best windows:** `findBestWindows` (or a new pre-filter in `buildDayForecasts`) excludes slots in the unsociable range before grouping into windows. We keep these slots in `day.slots` (so the user still sees overnight conditions) but they no longer contribute to recommended windows.

Design choice — exact boundaries: `21:00–05:59` per your request. The `21:00` slot itself counts as nighttime (i.e. boundary is inclusive at start). I'll add this as a single `NIGHT_START_HOUR = 21`, `NIGHT_END_HOUR = 6` constants so it's trivially tweakable.

## Files to Modify / Create

| File | Change |
|---|---|
| `src/services/day-label.ts` *(new)* | Extract `dateToLabel(date, today)` + `getTodayString()` from `slot-builder.ts` into a shared helper. |
| `src/services/day-label.test.ts` *(new)* | Tests for `Today` / `Tomorrow` / fallback. |
| `src/services/slot-builder.ts` | Import `dateToLabel` / `getTodayString` from `day-label.ts` (remove local copies). Pre-filter unsociable hours before window grouping; keep all slots in `day.slots`. |
| `src/services/slot-builder.test.ts` | Add tests: best windows skip 22:00 slot; midnight-ending behavior unchanged. |
| `src/services/format-window.ts` *(new)* | `formatWindowRange(startTime, endTime, today)` with `24:00` + `Today/Tomorrow` rules. |
| `src/services/format-window.test.ts` *(new)* | Same-day, ends-at-24:00, tomorrow-morning, cross-midnight non-zero end, fallback date. |
| `src/services/night-hours.ts` *(new)* | `isUnsociableHour(time)` + the two boundary constants. |
| `src/services/night-hours.test.ts` *(new)* | Boundary tests at 05:59, 06:00, 20:59, 21:00. |
| `src/components/timeline-view.vue` | Use `formatWindowRange`; pass `today` in. |
| `src/components/time-slot-card.vue` | Apply `slot-card--night` class when `isUnsociableHour(slot.time)`. Add muted styling. |

## Design Choices Considered

1. **Format-only fix in new util modules** *(chosen)* — clean separation, easy to test, no data-model changes. Aligns with AGENTS.md "single responsibility" and "testability".
2. **Inline everything in components** — smaller diff but harder to test and not reusable.
3. **Mutate `computeEndTime` to emit `"…T24:00"`** — rejected; violates ISO 8601 and pollutes data layer with presentation concerns.
4. **Nighttime: visual only, keep in best windows** — rejected; would still recommend 3 a.m. runs.
5. **Nighttime: drop slots entirely from `day.slots`** — rejected; user may still want to peek at overnight conditions, and removing them would create gaps in the hourly view.

## Dependencies & Risks

- **Dependencies:** None added.
- **Risks:** Low.
  - Need to update `slot-builder.test.ts` — existing test at line ~110 asserting `endTime === "2026-05-22T00:00"` stays valid (we don't change `computeEndTime`); but any test that asserts best windows include a 22:00-spanning range needs revisiting.
  - `App.test.ts` may snapshot the rendered timeline — I'll inspect and update if needed.
- **Edge case:** Timezones — formatter operates on raw ISO strings (string slicing only), avoiding `Date` parsing pitfalls.
- **Edge case:** A day where *every* good hour is in the night band → `findBestWindows` already falls back to "best of what's available"; I'll keep that fallback operating on the **unfiltered** windows so we don't show an empty state when only nighttime is decent (with a small note: this is debatable — see Open Questions).

## Out of Scope

- Letting the user customize the nighttime range.
- Merging today-evening with tomorrow-early-morning windows into a single cross-midnight entry (the day-prefix labelling makes the split self-explanatory).
- Changing the score algorithm itself for night hours (this is a filter/display concern, not a scoring concern).

## Complexity

**Medium.** Three new pure modules (each ~20 LOC + tests), one shared helper extraction, two component edits, and updates to existing slot-builder tests.

## Workflow After Approval

1. Extract `day-label.ts` + tests; update `slot-builder.ts` imports; run tests.
2. Add `night-hours.ts` + tests.
3. Add `format-window.ts` + tests.
4. Update `slot-builder.ts` to filter night hours from best-window candidates; update its tests.
5. Wire `timeline-view.vue` (pass `today`, use new formatter).
6. Wire `time-slot-card.vue` (night modifier + styling).
7. Run full `pnpm test` and `pnpm build`.
8. Update `CHANGELOG.md` (user-visible UI change).

## Open Questions

1. If literally every good hour on a given day is in 21:00–05:59, should we:
   (a) show no recommendation that day, or
   (b) fall back to showing the best night window with a "late night" notice?
   — Current plan: **(b)**, since the existing `findBestWindows` already falls back gracefully.
2. How muted should night cards be? Suggested: ~50% opacity + neutral border color (no rating accent). OK?
3. Confirm hour boundaries: a slot whose timestamp is `21:00` is considered night; a slot at `06:00` is considered day. Correct?
