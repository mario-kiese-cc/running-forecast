# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
