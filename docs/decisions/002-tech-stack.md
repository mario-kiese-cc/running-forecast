# ADR-002: Tech Stack — Vue + Vite + Open-Meteo

**Status:** Accepted
**Date:** 2026-05-21
**Decision Makers:** Mario

## Context

The project needs a frontend framework, build tool, test runner, and weather data source. The app is a mobile-first SPA that shows running time-slot recommendations based on weather conditions.

## Options Considered

### Framework
1. **Vue 3** — Composition API, lightweight, good TS support, user's explicit choice
2. **React** — Larger ecosystem, but not requested
3. **Svelte** — Minimal boilerplate, but smaller ecosystem

### Build Tool
1. **Vite** — Fast, native Vue support via plugin, modern defaults
2. **Webpack** — Battle-tested but slower, more config

### Weather API
1. **Open-Meteo** — Free, no API key, hourly forecasts, includes AQI, sunrise/sunset
2. **OpenWeatherMap** — Requires API key, free tier limited
3. **WeatherAPI** — Requires API key, generous free tier

### Test Runner
1. **Vitest** — Native Vite integration, same config, fast
2. **Jest** — Mature but needs separate config for Vite/TS

## Decision

- **Vue 3** — user's explicit choice, fits the project well
- **Vite** — standard for Vue, zero-config, fast HMR
- **TypeScript strict** — per AGENTS.md principles
- **pnpm** — per AGENTS.md preference
- **Vitest** — native Vite integration, no config duplication
- **Open-Meteo** — no API key removes a whole class of problems (secrets, .env, rate-limit key management)
- **Plain CSS / CSS modules** — simplicity first, no framework until needed

## Consequences

- No API key management needed (Open-Meteo is keyless)
- Vite + Vitest share config — less maintenance
- Vue Composition API + `<script setup>` keeps components concise
- Open-Meteo has a 10,000 req/day limit — must cache responses
- If we need a paid weather API later, only `weather-service.ts` changes
