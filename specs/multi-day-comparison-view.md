# Spec: Multi-Day Comparison View

## Status

Draft — not yet planned.

## Summary

Add a "week-at-a-glance" heatmap that shows score per hour across the full forecast horizon (next ~7 days × 24 hours), so the user can plan ahead — especially for weekend long runs — instead of only seeing the next ranked slots.

## Motivation

The current `timeline-view` excels at "what should I do today/tomorrow?" but obscures multi-day patterns. Runners with structured plans (e.g. long run on Saturday, intervals on Tuesday) want to compare slots across days at a glance: *is Saturday morning or Sunday morning better for the long run?*

A heatmap exposes this at-a-glance. It also makes the underlying data feel richer without requiring new API calls — the existing Open-Meteo response already includes up to ~7 days of hourly data.

## User stories

- As a weekly planner, I want to see all hours of the next 7 days as a colour-coded grid so I can spot the best day for my long run.
- As a quick-decision user, I want to keep the existing ranked-slot list as the default view, and only opt into the heatmap when I want it.
- As a mobile user, I want the heatmap to be readable on a phone, even if it requires horizontal scroll.
- As a keyboard user, I want to navigate the heatmap with arrow keys and hear the score, time, and key conditions read out for the focused cell.

## Scope

**In scope**

- A toggle/tab to switch between **Timeline** (current view) and **Week** (heatmap).
- A grid: rows = days, columns = hours (00–23). Cell colour reflects the score. Empty cells for past hours and beyond the forecast horizon.
- Hover/focus on a cell shows a popover with the same info shown in `time-slot-card` (compact form).
- Clicking a cell jumps back to the Timeline view and scrolls/highlights that slot.
- Respect of the active personal profile and run type (the heatmap reuses the same `TimeSlot` data).
- Day labels (localised) and "today"/"tomorrow" emphasis using existing `day-label` service.

**Out of scope**

- A 14-day or 30-day extended view (depends on a paid weather tier or alternative API).
- Comparing locations side-by-side.
- Exporting the heatmap as an image.
- Custom day-start hour (week always starts at 00:00 local).

## Functional requirements

- **FR-1** The main view MUST offer two modes: `timeline` (default) and `week`. Toggling is a single, prominent control.
- **FR-2** The week view MUST render a grid of up to 7 rows × 24 columns. The number of rows reflects the forecast horizon; if fewer days are available, render only those days.
- **FR-3** Each cell MUST be colour-coded using the same palette as the score bar / rating: `great`, `good`, `fair`, `avoid`. The cell MUST also encode the numeric score for screen readers.
- **FR-4** Past hours (before "now") MUST be visually de-emphasised (e.g. 30% opacity) and MUST NOT be interactive.
- **FR-5** Nighttime hours (`!isDaylight`) MAY use a subtle visual treatment (e.g. small moon glyph, slightly desaturated) to distinguish them, but the score still applies.
- **FR-6** Hover/focus on a cell MUST open a popover showing: local time, score, rating, the three most relevant condition badges, and temperature.
- **FR-7** Clicking a cell MUST switch to the Timeline view and scroll the corresponding slot card into view, with a brief highlight.
- **FR-8** The user's mode preference (`timeline` / `week`) MUST persist in `localStorage` and restore on next visit.
- **FR-9** The week view MUST update reactively when the active personal profile or run type changes, with no network refetch.
- **FR-10** On mobile widths (<640 px), the grid MUST allow horizontal scrolling with day labels (the first column) sticky-pinned to the left edge.

## Non-functional requirements

- **NFR-1 — Performance:** rendering 168 cells must stay under one frame (16 ms) on a mid-range mobile device. Use plain CSS grid, no per-cell virtualisation needed at this scale.
- **NFR-2 — Accessibility:** the grid is a `role="grid"` with proper `role="row"`/`role="gridcell"`. Arrow keys navigate cells; focused cell announces a structured label ("Saturday 07:00, score 84, great, 12°C, low wind").
- **NFR-3 — Reduced motion:** the scroll-to-and-highlight on click respects `prefers-reduced-motion`.
- **NFR-4 — Internationalisation readiness:** day labels and time formatting use the existing `day-label` / `format-window` services and locale-aware APIs.
- **NFR-5 — Visual coherence:** cells reuse colours/tokens from the design system (see `docs/design-system.md`); no new ad-hoc palette.

## UX notes

- Toggle: two-segment control at the top of the main content area, near the location badge:
  `[ Timeline ] [ Week ]`
- Heatmap layout (desktop):
  ```
            00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23
  Today     . . . . . . . . . ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▣ ▣ ▢ ▢ . . . .
  Tomorrow  . . . . . . ▣ ▣ ▣ ▢ ▢ ▢ ▣ ▣ ▢ ▢ ▢ ▢ ▢ . . . . .
  Wed       . . . . . . ▢ ▢ ▢ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▢ ▢ ▢ . . . . .
  ...
  ```
- Cell aspect ratio roughly square; min size ~24×24 px desktop, ~32×32 px mobile (with horizontal scroll).
- Hour columns labelled at the top; major hours (06, 12, 18) slightly more prominent.
- The popover follows the existing `time-slot-card` visual language but condensed.
- A small legend below the grid: four colour swatches with rating labels.
- Empty/disabled cells use the muted background; do not render a "0" score for them.

## Data model impact

No changes to `HourlyConditions`, `HourlyData`, or `TimeSlot`. The week view consumes the same scored slots already produced by `scoreAllHours`.

New module `src/services/week-grid.ts`:

```ts
export interface WeekGridCell {
  readonly time: string;        // ISO 8601
  readonly hourOfDay: number;   // 0–23, local
  readonly slot: TimeSlot | null; // null = past or out-of-horizon
  readonly isPast: boolean;
}

export interface WeekGridRow {
  readonly dateIso: string;     // YYYY-MM-DD local
  readonly dayLabel: string;    // from `day-label`
  readonly cells: ReadonlyArray<WeekGridCell>; // length 24
}

export function buildWeekGrid(
  slots: ReadonlyArray<TimeSlot>,
  now: Date,
  timeZone: string,
): ReadonlyArray<WeekGridRow>;
```

New component `src/components/week-grid-view.vue` and supporting cell + legend components.

App state additions:

- `viewMode: "timeline" | "week"` ref, persisted in `localStorage`.
- The toggle component emits changes; `App.vue` conditionally renders `TimelineView` or `WeekGridView`.

## Open questions

- **OQ-1** When clicking a cell to deep-link to Timeline, do we expand a single slot card or just scroll? *(Proposal: scroll + 1.5 s outline-pulse highlight.)*
- **OQ-2** Should the heatmap also overlay sunrise/sunset markers per row, or is the night/day visual treatment per cell enough? *(Proposal: cell-level treatment only in v1, keep the grid clean.)*
- **OQ-3** Should we group cells into 3-hour buckets to reduce visual density on mobile? *(Proposal: no — keep hourly granularity, rely on horizontal scroll.)*
- **OQ-4** Should the toggle live in the header or directly above the timeline content? *(Proposal: above the content — it's view-specific, not app-global.)*
- **OQ-5** Does the heatmap need to highlight the single best cell of the week? *(Proposal: subtle ring around the top-scoring future cell; the ranked-slots list still lives on the Timeline view.)*

## Acceptance criteria

- [ ] Toggling between Timeline and Week is instantaneous and preserves scroll position separately for each view.
- [ ] The week view renders every available forecast hour, with past hours de-emphasised and non-interactive.
- [ ] Cell colours match the design-system tokens used elsewhere; legend is present.
- [ ] Hover, focus, and click on a cell all expose the same information.
- [ ] Click on a cell switches to Timeline and scrolls the matching slot into view.
- [ ] Personal profile and run-type changes re-colour the grid in <100 ms.
- [ ] Keyboard navigation (arrow keys, Enter to deep-link, Escape to close popover) works end-to-end.
- [ ] Mobile layout scrolls horizontally with sticky day-label column.
- [ ] View mode preference persists across reloads.
- [ ] `CHANGELOG.md` updated.
