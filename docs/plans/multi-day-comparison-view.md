# Plan: Multi-Day Comparison View (Week Heatmap)

## Status: Approved

Approved 2026-05-29 by repo owner. **Decisions on open questions:**
1. OQ-1 — deep-link = scroll + 1.5 s outline-pulse, no card expand.
2. OQ-5 — add subtle ring on top future cell.
3. Extend `day-label.ts` with localised weekday labels ("Wed") for days 2–6.
4. Keep both views mounted via `v-show` for per-view scroll preservation.
5. Grid build strategy A1 (ISO string slices, timezone-safe).

Spec: [`specs/multi-day-comparison-view.md`](../../specs/multi-day-comparison-view.md)
Builds on: [`docs/plans/run-type-aware-scoring.md`](./run-type-aware-scoring.md),
[`docs/plans/personal-scoring-profiles.md`](./personal-scoring-profiles.md),
[`docs/design-system.md`](../design-system.md)

## Context

The app scores hourly weather into `TimeSlot[]` (`useWeather` → `scoreAllHours`),
groups them into `DayForecast[]` (`slot-builder.ts`), and renders them in
`timeline-view.vue`. Scoring is a `computed` over `(rawHourly, effectiveProfile)`,
so profile/run-type changes re-score with **no network call** — FR-9 is already
satisfied by the existing seam.

This feature adds a second view (a 7×24 heatmap) toggled alongside the timeline,
consuming the **same** `slots` data. No data-model changes (FR per spec
"Data model impact").

## Files to create

| File | Purpose |
|---|---|
| `src/services/week-grid.ts` | Pure `buildWeekGrid(slots, now, timeZone)` → `WeekGridRow[]`. Maps slots into a 7-day × 24-hour matrix; marks past/out-of-horizon cells as `null` + `isPast`. |
| `src/services/week-grid.test.ts` | Full week, partial horizon, past hours, empty input, timezone/DST edges, best-future-cell detection. |
| `src/services/view-mode.ts` | `ViewMode = "timeline" \| "week"`; `load/save/clearViewMode` against `localStorage` key `running-forecast:view-mode` (mirrors `run-type.ts`). |
| `src/services/view-mode.test.ts` | Persistence + invalid-value fallback. |
| `src/composables/use-view-mode.ts` | Module-level singleton `Ref<ViewMode>` + `setViewMode` (mirrors `use-run-type.ts`). |
| `src/composables/use-view-mode.test.ts` | Singleton/persistence + `__resetForTests`. |
| `src/components/view-mode-toggle.vue` | Two-segment `[Timeline][Week]` control; `role="tablist"`, emits `select`. |
| `src/components/week-grid-view.vue` | `role="grid"` heatmap: rows/cells, hour-column header, keyboard nav, popover state, legend, best-cell ring. Emits `select-slot(time)`. |
| `src/components/week-grid-cell.vue` | `role="gridcell"`: colour by rating, opacity for past, night glyph, ARIA label, focus. |
| `src/components/week-grid-popover.vue` | Condensed `time-slot-card`-style popover (time, score, rating, 3 badges, temp). |
| `src/components/week-grid-legend.vue` | Four rating swatches + labels. |

## Files to modify

| File | Change |
|---|---|
| `src/App.vue` | Add `useViewMode`; render `ViewModeToggle` above content; conditionally show `TimelineView`/`WeekGridView` via `v-show`; hold `highlightSlotTime` ref for deep-linking; build week grid from `slots`. |
| `src/components/timeline-view.vue` | Accept optional `highlightTime` prop; scroll matching card into view + outline-pulse (respect `prefers-reduced-motion`). |
| `src/components/time-slot-card.vue` | Add stable `data-time` anchor + transient highlight class hook. |
| `src/styles/tokens.css` | Add tokens only if strictly needed (prefer reuse; design system forbids ad-hoc palette). |
| `CHANGELOG.md` | New entry. |
| `TODO.md` | Move feature to Done. |
| `docs/decisions/00X-*.md` | ADR if a non-trivial choice is locked in (see Design choices). |

## Dependencies & risks

- **`FORECAST_DAYS` is currently 2** in `weather-service.ts`. The week view needs
  ~7 days to be useful (weekend planning). Step 3 raises `FORECAST_DAYS` to 7;
  this also makes the timeline show up to 7 days (acceptable behaviour change).
  `week-grid.ts` stays horizon-agnostic and renders only available days (FR-2).
- **No IANA timezone** is parsed from Open-Meteo today. The whole codebase
  assumes device-local == location-local (`getTodayString`). `buildWeekGrid`
  follows the same assumption and drops the spec's `timeZone` param (avoids dead
  plumbing); past/future is derived from `now` in device-local time.

- **No new npm dependencies** (CSS grid only; NFR-1).
- **Timezone correctness** — codebase is "timezone-safe via string slicing"
  (`slot.time` already in location-local time). The spec's `timeZone` param is
  slightly at odds with this. Recommendation: build from ISO slices
  (`time.slice(0,10)` / `time.slice(11,13)`) like `slot-builder`/`night-hours`.
- **Scroll-position preservation per view** (acceptance criterion) conflicts with
  `v-if`. Needs `v-show` or `<KeepAlive>`.
- **Deep-link timing** — switch view then scroll needs `nextTick` + post-render
  scroll; brittle for long timelines, manageable with a watch.
- **Keyboard grid nav** (NFR-2) is the heaviest part: roving tabindex, arrows,
  Enter to deep-link, Escape to close popover, skipping past/null cells.
- **`day-label` reuse** — `dateToLabel` only yields Today/Tomorrow/raw date; the
  mock shows "Wed". May extend `day-label.ts` with a localised weekday formatter.

## Open questions (mirror spec OQs)

1. **OQ-1 deep-link** — scroll + 1.5 s outline-pulse, no expand. Accept?
2. **OQ-5 best-cell ring** — add subtle ring on top future cell? (adds
   best-future-cell logic to `week-grid.ts`).
3. **Weekday labels** — OK to extend `day-label.ts` with localised weekday
   (e.g. "Wed") for days beyond tomorrow?
4. **Scroll preservation** — OK to keep both views mounted via `v-show`?

## Design choices

**A. Grid build strategy** — recommend **A1**.
- A1 String-slice based (matches `slot-builder`, `night-hours`, `format-window`):
  timezone-safe, consistent, simplest. Signature deviates slightly from spec.
- A2 `Intl`/`Date` + `timeZone` exactly per spec: literal match, but reintroduces
  Date-parsing timezone hazards the codebase avoids.

**B. View mounting** — recommend **B1**.
- B1 `v-show` both views mounted: cheap, preserves scroll + popover state, meets
  acceptance criteria. 168 cells is trivial.
- B2 `v-if` + `<KeepAlive>`: also preserves state, more moving parts.
- B3 `v-if` only: simplest but FAILS scroll-preservation criterion.

**C. Toggle placement** — above content, not header (spec OQ-4 proposal).

## Complexity

**Medium–large.** Pure logic (`week-grid`, `view-mode`, composable) is small and
well-precedented. Bulk is the heatmap component family with accessible keyboard
grid nav + popover + deep-link scroll/highlight + sticky mobile column.

Build order (test-as-you-go per AGENTS.md):
1. `week-grid.ts` + tests
2. `view-mode.ts` + `use-view-mode.ts` + tests
3. `view-mode-toggle.vue` + wire into `App.vue` (`v-show`)
4. static `week-grid-view` + cell + legend
5. popover (hover/focus)
6. keyboard nav
7. deep-link to timeline (highlight/scroll)
8. mobile sticky column
9. ADR + CHANGELOG + TODO
