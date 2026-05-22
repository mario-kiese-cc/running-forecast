# Plan: Vue Running Time-Slot Recommender

## Status: Approved

**Date:** 2026-05-21

## Goal

Build a Vue web app that shows time slots for today/tomorrow, scored and color-coded by how good the conditions are for running. A "running weather forecast."

## Data Sources

| Factor | Impact | Source |
|--------|--------|--------|
| Rain (probability + intensity) | High | Open-Meteo |
| Temperature (feels-like) | High | Open-Meteo |
| Wind speed | Medium | Open-Meteo |
| Humidity | Medium | Open-Meteo |
| UV index | Low-Medium | Open-Meteo |
| Air quality (AQI) | Medium | Open-Meteo |
| Daylight | Low-Medium | Sunrise/sunset from Open-Meteo |

## Tech Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** (build tool)
- **TypeScript** (strict mode)
- **pnpm** (package manager)
- **Vitest** (test runner)
- **Open-Meteo** (free weather API, no key required)
- **Plain CSS / CSS modules** (styling)

## Architecture

```
src/
├── App.vue
├── main.ts
├── types.ts
├── services/
│   ├── weather-service.ts (+test)
│   ├── run-scorer.ts (+test)
│   ├── slot-builder.ts (+test)
│   ├── location-service.ts
│   └── daylight.ts
├── composables/
│   ├── use-weather.ts
│   └── use-location.ts
├── components/
│   ├── timeline-view.vue
│   ├── time-slot-card.vue
│   ├── condition-badge.vue
│   ├── score-bar.vue
│   └── location-prompt.vue
└── index.html
```

## Scoring Model

Each hour scored 0–100:

| Factor | Weight | Ideal | Unrunnable |
|--------|--------|-------|------------|
| Precipitation probability | 30% | 0% | >70% |
| Temperature (feels-like) | 25% | 12°C | <-5°C or >35°C |
| Wind speed | 15% | 0–10 km/h | >50 km/h |
| Humidity | 10% | 40–60% | >90% |
| AQI | 10% | 0–50 | >150 |
| Daylight | 10% | full daylight | full darkness |

Thresholds: <30 "Avoid", 30–60 "Fair", 60–80 "Good", 80+ "Great"

## Design Choices

1. **Time granularity**: Start hourly, add smart window merging later
2. **Location**: Browser geolocation with manual city fallback
3. **API**: Open-Meteo (free, keyless)

## Implementation Order

1. Scaffold (Vite + Vue + TS + Vitest)
2. Types + scoring engine (pure logic, tested)
3. Weather service (Open-Meteo fetch, mock tests)
4. Location service + composable
5. Slot builder (merge + rank)
6. UI components
7. Polish (responsive, loading, errors)

## Dependencies

- `vue`, `vite`, `@vitejs/plugin-vue`, `typescript`, `vitest`, `@vue/test-utils`

## Risks

- Open-Meteo rate limits → cache, fetch once per session
- Geolocation denied → manual fallback
- Scoring feels wrong → make weights configurable
- Scope creep → start with today+tomorrow only

## Complexity: Medium

~15 files, 1 external API, meaningful scoring logic, standard Vue SPA.

## Decisions from Review

1. **Time range**: Today + tomorrow
2. **Layout**: Mobile-first, responsive up to desktop
3. **Location**: Persist in localStorage
4. **Visual style**: Cards with color-coding, minimal/clean aesthetic
