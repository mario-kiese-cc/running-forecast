# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Multi-day comparison view (Week heatmap):** a new view toggle above the forecast switches between **Timeline** (the existing ranked hourly cards) and **Week** — a colour-coded grid of days × hours so you can compare slots across the whole forecast horizon at a glance (e.g. is Saturday or Sunday morning better for the long run?). Cells reuse the rating palette; past hours are de-emphasised and non-interactive, nighttime hours are subtly desaturated, and the single best future hour gets an accent ring. Hover or keyboard-focus shows a condensed popover (time, score, rating, conditions); clicking a cell jumps to the Timeline and pulses the matching card. The grid is a `role="grid"` with arrow-key navigation, scrolls horizontally on mobile with a sticky day-label column, and the view choice persists in `localStorage`. It reuses the same scored slots, so profile / run-type changes re-colour it instantly with no network refetch. New files: `src/services/week-grid.ts`, `src/services/view-mode.ts`, `src/composables/use-view-mode.ts`, `src/components/view-mode-toggle.vue`, `week-grid-view.vue`, `week-grid-cell.vue`, `week-grid-popover.vue`, `week-grid-legend.vue`, plus `list` / `grid` icons. See [ADR-007](docs/decisions/007-week-grid-view.md).

### Changed
- **Forecast horizon extended from 2 to 7 days** (`FORECAST_DAYS`) to power the Week view; the Timeline now also spans the full week.
- `day-label` gains `weekdayLabel` / `gridDayLabel` for localised short weekday names (e.g. "Wed") used by the Week grid.
- `time-slot-card` accepts a `highlighted` prop and exposes a `data-time` anchor so the Timeline can scroll-to and pulse a deep-linked slot (respecting `prefers-reduced-motion`).

### Added
- **Run-type aware scoring:** pick one of five run types (Easy, Long, Tempo, Intervals, Recovery) from a segmented selector above the timeline. Each run type adjusts the active personal profile via multiplicative weight factors and an additive ideal-temperature shift, then re-scores the visible forecast instantly with no network refetch. Recovery additionally softens the `good` rating threshold (60 → 50) so most non-rainy slots qualify. Selection persists in `localStorage`; default is Easy. The selector is keyboard-operable (arrow keys + Home/End), screen-reader-announced (`role="radiogroup"` + `aria-checked`), and renders an icon + label per option with a one-line caption describing the active choice. New files: `src/services/run-type.ts`, `src/composables/use-run-type.ts`, `src/components/run-type-selector.vue`, plus five run-type icons in `src/components/icon/icons.ts`. See [ADR-006](docs/decisions/006-run-type-modifiers.md).

### Changed
- `ScoringProfile` gains an optional `goodThresholdOverride` field, only ever set by `applyRunTypeModifier` and explicitly stripped by `withCustomEdit` so it never persists on a personal profile.
- `scoreToRating` accepts an optional `RatingThresholdOverrides` argument; the override is clamped within the surrounding thresholds.

### Added
- **Personal scoring profiles:** the forecast can now be tuned to the runner instead of one global default. Pick from five presets (Default, Heat-sensitive, Cold-averse, Winter runner, Urban air quality) or customise the per-factor weights, ideal apparent-temperature range, and darkness tolerance. The active profile lives in a header pill; clicking it opens a settings panel that re-scores the visible timeline live, with no network refetch. Profiles persist in `localStorage` (schema-versioned, with graceful fallback to Default on invalid data). New files: `src/services/scoring-profile.ts`, `src/services/scoring-profile-presets.ts`, `src/composables/use-scoring-profile.ts`, plus `ProfilePill`, `ProfilePanel`, `ProfilePresetList`, `ProfileWeightsEditor`, `ProfileRangeEditor`. See [ADR-005](docs/decisions/005-scoring-profile-model.md).

### Changed
- **`run-scorer` is now profile-aware:** `scoreTemperature` accepts an ideal range, `scoreDaylight` accepts a darkness score, and `scoreHour` / `scoreAllHours` / `computeFactors` / `computeOverallScore` accept a `ScoringProfile` (default-parameterised so existing callers stay byte-compatible).
- **`useWeather` reactivity:** raw hourly data is now cached separately from scored slots; `slots` is a `computed` over `(rawHourly, profile)` so profile changes recompute instantly without re-fetching from Open-Meteo.

### Added
- **App logo in header:** the stadium-track mark now appears next to the “Running Forecast” title (`src/components/app-logo.vue`). Colors come from design tokens so the mark stays in sync with the theme.
- **App icon (favicon):** geometric stadium-track mark (`public/favicon.svg`). Single SVG, theme-aware via `prefers-color-scheme` so it stays legible on both dark and light browser chrome. Outer pill in foreground color, inner lane in the cyan accent. Wired into `index.html` via `<link rel="icon" type="image/svg+xml">`.

### Added
- **Manual re-detect button:** the location badge now exposes a “Use my current location” button (crosshair icon) that re-triggers the browser Geolocation API on demand. Useful when you’ve moved to a different city and want the forecast to follow. Detection is non-destructive — if the user denies or the request fails, the previously set location stays put and an inline error is shown under the badge. New composable API: `detectLocation()`, `detectionStatus`, `detectionError` on `useLocation`.

### Changed
- **Run scoring — sharper heat penalty:** temperature weight raised from 0.25 → 0.30 (taken from wind, 0.15 → 0.10), and the warm-side curve in `scoreTemperature` is now two-segment: gentle 18–20°C taper (100 → 80) followed by a steep 20–28°C decline (80 → 0). Hours above 20°C now drop noticeably in the overall score so cooler hours rank clearly higher (e.g. an otherwise-perfect 25°C hour now scores ~79 instead of ~90).

### Added
- **GitHub Pages deployment:** `.github/workflows/deploy.yml` builds, tests, and deploys `dist/` to GitHub Pages on every push to `main`. Site URL: https://mario-kiese-cc.github.io/running-forecast/

### Changed
- `vite.config.ts` now sets `base: "/running-forecast/"` for production builds so assets resolve correctly under the GitHub Pages sub-path. Dev server (`pnpm dev`) continues to use `/`.

### Changed
- **UI redesign:** dark theme, removed decorative emoji from header (🏃), location badge / prompt (📍), condition badges (🌡🌧💨💧🌫), late-night hint (🌙), error (⚠️), and refresh button (↻). Replaced with a small hand-rolled inline SVG icon set (`src/components/icon`). Cyan accent reserved for focus / primary CTA / location pin. See ADR-004 and `docs/design-system.md`.
- Centralized design tokens in `src/styles/tokens.css` (imported once from `src/main.ts`). Components reference tokens by name; legacy aliases preserved for incremental migration.
- Detected locations now display the nearest city name on the badge instead of raw coordinates (powered by BigDataCloud reverse geocoding; see ADR-003). Coordinates are briefly replaced with a “Detecting city…” placeholder while the lookup is in flight, and the resolved name is cached in localStorage.
- Location toolbar replaced with a pill-style `LocationBadge` that shows the resolved location plus a `detected` / `manual` source tag
- `LocationPrompt` can now be re-opened at any time via the badge's "Change" button (with Cancel to back out)
- `UserLocation` gains an optional `source: "detected" | "manual"` field, stamped automatically by `use-location`
- Best-window display now includes day prefix (`Today` / `Tomorrow`) and renders end-of-day midnight as `24:00` (e.g. `Today 20:00 – 24:00` instead of `08:00 – 00:00`)
- Hourly time-slot cards between 21:00 and 05:59 are visually de-emphasized (50% opacity, neutral border) to reflect their impracticality
- Best-window recommendations now exclude nighttime hours (21:00–05:59) by default; if only night windows look good, the UI shows a moon-icon "late-night" hint instead of silently recommending them

### Added
- `docs/design-system.md` — the project's design pattern library (tokens, components, voice, do/don't). New UI work must conform to it.
- ADR-004: Dark theme and centralized design system.
- `src/components/icon/{icon.vue,icons.ts}` — generic SVG wrapper with a small named icon set (thermometer, droplet, wind, rain, haze, location, moon, refresh, alert).

### Added
- Project scaffolding: AGENTS.md, TODO.md, CHANGELOG.md, README.md
- Agent harness: prompt templates, skills, and Pi configuration
- Architecture Decision Records structure
- Tech stack: Vue 3 + Vite + TypeScript (strict) + Vitest + pnpm
- Minimal App.vue with mobile-first CSS variables and global reset
- ADR-002: Tech stack decision (Vue + Vite + Open-Meteo)
- Smoke test for App component
- Core types: HourlyConditions, HourlyData, TimeSlot, ScoreFactors, UserLocation
- Run scorer: weighted scoring engine (precipitation, temperature, wind, humidity, AQI, daylight)
- Daylight service: sunrise/sunset detection from Open-Meteo daily data
- Weather service: Open-Meteo forecast + air quality fetching with parallel requests
- Location service: localStorage persistence, browser geolocation, validation
- Slot builder: time window grouping, best-window ranking, day labeling
- Composables: use-location (auto-detect → prompt fallback), use-weather (reactive fetch + score)
- UI components: timeline-view, time-slot-card, score-bar, condition-badge, location-prompt
- Wired App.vue: full flow from location → fetch → score → display
- Sample mock data for weather and air quality API responses
- Geocoding service: city name → coordinates via Open-Meteo Geocoding API
- Location prompt now accepts a city name instead of manual lat/lon
- Candidate picker for ambiguous city names (e.g. Vienna, Austria vs Vienna, Virginia)
- Reverse-geocoding service (`reverse-geocoding-service.ts`) calling BigDataCloud's keyless client endpoint, with graceful `null` fallback on any failure
- ADR-003: Reverse-geocoding provider decision
- Pure helpers: `day-label.ts` (Today/Tomorrow labelling), `night-hours.ts` (unsociable-hour detection), `format-window.ts` (window range presentation)
