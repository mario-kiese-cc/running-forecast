# ADR-007: Multi-Day Comparison View (Week Heatmap)

**Status:** Accepted
**Date:** 2026-05-29
**Decision Makers:** Mario

## Context

The *Multi-day comparison view* feature (see
[`specs/multi-day-comparison-view.md`](../../specs/multi-day-comparison-view.md))
adds a "week-at-a-glance" heatmap — rows = days, columns = hours — alongside the
existing Timeline. It consumes the same scored `TimeSlot[]` produced by
`scoreAllHours`, so there is no scoring or data-model change. The implementation
questions were:

1. How is the grid built timezone-correctly?
2. How are the two views mounted so each keeps its own scroll position?
3. Where does the forecast horizon come from (the app only fetched 2 days)?

See the approved plan:
[`docs/plans/multi-day-comparison-view.md`](../plans/multi-day-comparison-view.md).

## Options Considered

### Q1 — Grid build / timezone strategy

1. **ISO string slicing** — derive date/hour from the local ISO strings
   Open-Meteo returns (`timezone=auto`), comparing against `now` in device-local
   time. Matches `slot-builder`, `night-hours`, `format-window`, `day-label`.
2. **`Intl` + explicit IANA `timeZone`** (the spec's literal signature) —
   reintroduces Date-parsing timezone hazards the codebase has deliberately
   avoided, and the app does not currently parse an IANA zone from the API.

### Q2 — View mounting

1. **`v-show` both views mounted** — cheap (168 cells), preserves each view's
   scroll position and the popover state across toggles.
2. **`v-if` + `<KeepAlive>`** — also preserves state, more moving parts.
3. **`v-if` only** — simplest, but loses scroll position (fails an acceptance
   criterion).

### Q3 — Forecast horizon

1. **Raise `FORECAST_DAYS` from 2 to 7** — one constant; the Week view becomes
   useful for weekend planning. Side effect: the Timeline now spans up to 7 days.
2. **Fetch 7 days only for the Week view** — a second request / branching fetch
   path; more complexity for no real benefit since one response covers both.

## Decision

- **Q1: ISO string slicing.** `buildWeekGrid(slots, now)` works on local ISO
  strings and drops the spec's `timeZone` parameter (no dead plumbing). It
  assumes device-local == location-local, exactly as `getTodayString` /
  `dateToLabel` already do. A cell is `isPast` when its `YYYY-MM-DDTHH` key is
  strictly less than the current hour; the current hour stays actionable. Past
  and out-of-horizon cells carry a `null` slot.
- **Q2: `v-show` both views mounted.** `App.vue` renders both `TimelineView` and
  `WeekGridView` when weather is ready, toggling visibility with `v-show`.
- **Q3: `FORECAST_DAYS = 7`.** One Open-Meteo response powers both views; the
  Timeline spanning the full week is an acceptable, even desirable, side effect.

Additional resolved spec open questions:

- **OQ-1 deep-link:** clicking a cell switches to Timeline, scrolls the matching
  card into view, and pulses it for ~1.5 s (`prefers-reduced-motion` swaps the
  pulse for a static outline and disables smooth scroll).
- **OQ-5 best cell:** the single highest-scoring future cell gets an accent ring
  (`findBestFutureCellTime`, ties resolve to the earliest time).
- **OQ-2 / OQ-3 / OQ-4:** cell-level night treatment only (no sunrise overlay);
  hourly granularity with horizontal scroll on mobile; toggle sits above the
  content, not in the header.

## Consequences

- The Week view re-colours instantly on profile / run-type changes for free —
  it reads the same reactive `slots` computed (ADR-005 / ADR-006).
- Keyboard navigation is a `role="grid"` with roving tabindex; arrows move among
  interactive cells, Enter/Space deep-links, Escape closes the popover. A single
  teleported popover follows the focused/hovered cell.
- The Timeline now renders up to 7 days. If that proves noisy, a future change
  could cap the Timeline independently of the Week horizon.
- `buildWeekGrid` ignoring an explicit timezone is correct today but would need
  revisiting if the app ever supports viewing a remote location in a different
  zone from the device.
