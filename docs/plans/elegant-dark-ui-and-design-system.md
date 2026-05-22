# Plan: Elegant Dark UI + Design System

## Status: Approved

**Decision date:** 2026-05-22

**Resolved answers:**
1. Icons — Option A1 (hand-rolled inline SVGs, no new dep).
2. Dark mode — Option B1 (dark-only, no toggle).
3. Accent — single **cyan** brand accent for focus / primary CTA.
4. Location pin — keep a tiny SVG pin on the badge.
5. `prefers-reduced-motion` + visible focus styles — defer to follow-up.

## Motivation

The current UI uses decorative emoji in header, badges, and status messages
(🏃, 📍, 🌡, 🌧, 💨, 💧, 🌫, 🌙, ⚠️, ↻) and ships a light theme defined
ad-hoc inside `src/App.vue`. The user wants:

- Remove childish emoji, especially the 🏃 before "Running Forecast".
- Plainer, more elegant chrome.
- Dark mode.
- A reusable **design pattern library** future work must follow.

## Affected & new files

### Modified

| File | Change |
|---|---|
| `src/App.vue` | Drop 🏃 / ⚠️ / ↻; move tokens out of `:root` into shared stylesheet; adopt dark surfaces. |
| `src/components/time-slot-card.vue` | Replace 5 emoji `icon` props with SVG icon names. |
| `src/components/condition-badge.vue` | Accept an icon component / name instead of emoji string. |
| `src/components/timeline-view.vue` | Drop 🌙 in late-night hint; rephrase or use SVG. |
| `src/components/location-badge.vue` | Drop 📍 (or replace with thin SVG pin — see Q4). |
| `src/components/location-prompt.vue` | Drop 📍 in title. |
| `src/components/score-bar.vue` | Re-tune fill colors for dark surface contrast. |
| `index.html` | `<meta name="color-scheme" content="dark">` + dark `<html>` bg. |
| `src/main.ts` | Import the new tokens stylesheet. |

### New

| File | Purpose |
|---|---|
| `src/styles/tokens.css` | Single source of truth for color / spacing / radii / type / elevation / motion tokens. |
| `src/components/icon/icon.vue` | Generic SVG wrapper (size, stroke, `currentColor`). |
| `src/components/icon/icons.ts` | Named inline SVG path data: thermometer, droplet, wind, rain, haze, location, moon, refresh, alert. |
| `src/components/icon/icon.test.ts` | Renders requested icon; sets size; defaults to `currentColor`. |
| `docs/design-system.md` | The design pattern library (tokens, components, voice, do/don't). |
| `docs/decisions/004-dark-theme-and-design-system.md` | ADR for dark-first + centralized tokens. |
| `docs/plans/elegant-dark-ui-and-design-system.md` | This plan. |

## Design system outline (`docs/design-system.md`)

- **Tokens**
  - Color: `--color-bg`, `--color-surface`, `--color-surface-elevated`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-text-subtle`. Rating: `--color-rating-{great,good,fair,avoid}` retuned for dark. Accent: `--color-accent` for focus / primary CTA only.
  - Spacing: 4-px base scale `--space-1`..`--space-8`.
  - Radii: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`.
  - Type: `--font-size-xs`..`--font-size-2xl`; weights 400 / 600; numerics `tabular-nums`.
  - Elevation: subtle `--shadow-sm`, `--shadow-md`.
  - Motion: `--ease-standard`, `--duration-fast` (120ms), `--duration-base` (200ms).
- **Components catalogue**: Card, Badge, Pill, Button (primary/secondary/ghost), Icon, ScoreBar.
- **Voice**: sentence case; no decorative emoji; status uses words plus optional 16-px SVG.
- **Do / Don't**: explicit "no Unicode emoji in UI chrome — use `src/components/icon`".

## Design choices

### A. Icons
1. **Hand-rolled inline SVGs** (recommended) — zero deps, ~9 small icons.
2. Add `lucide-vue-next` — requires user approval per AGENTS.md.
3. Text-only — most plain but reduces condition-badge scannability.

### B. Dark mode
1. **Dark-only** (recommended) — matches the request "use a dark mode".
2. Dark by default + toggle — extra UI surface; out of scope.
3. Follow `prefers-color-scheme` — doubles token surface.

### C. Token location
1. **CSS variables in `src/styles/tokens.css`** (recommended) — works directly in scoped styles, zero build cost.
2. TS constants + CSS — duplication, no current need.

## Dependencies & risks

- **Dependencies:** none added under recommended options.
- **Tests:** `App.test.ts` asserts only "Running Forecast" text → still passes. No snapshot tests (forbidden by AGENTS.md).
- **Contrast:** existing `color-mix(... in srgb, ... %, transparent)` alphas in `timeline-view.vue` need re-tuning against the dark surface.
- **Globals:** moving `:root` tokens out of `App.vue` into `tokens.css` imported from `main.ts` is functionally equivalent.

## Execution order

1. Add `src/styles/tokens.css` + import in `main.ts` with current light values; tests.
2. Flip tokens to dark; update `index.html`; manual check + tests.
3. Add `icon/` directory + unit test; tests.
4. Replace emoji in `time-slot-card.vue` + extend `condition-badge.vue`; tests.
5. Replace emoji in `App.vue` header / error / refresh, `timeline-view.vue`, `location-badge.vue`, `location-prompt.vue`; tests.
6. Retune `score-bar.vue` and best-window background alphas for dark; tests.
7. Write `docs/design-system.md` and ADR `004`. Update `CHANGELOG.md` and `TODO.md`.

## Complexity

**Medium** — mechanical but spans every component and introduces a shared pattern future work must respect.

## Open questions (awaiting user)

1. Icons: confirm **Option A1** (hand-rolled inline SVG, no new dep)?
2. Dark mode: confirm **Option B1** (dark-only, no toggle)?
3. Accent: introduce a single brand accent for focus / primary CTA, or rely solely on the rating colors?
4. Location pin: keep a tiny SVG pin on the badge, or drop the icon entirely?
5. Include `prefers-reduced-motion` and visible focus styles in this change, or defer?
