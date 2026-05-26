# TODO — Running Forecast

> This file tracks all open tasks. Keep it updated. Completed items move to the bottom under "Done".
> Format: `- [ ] description (#ref, @owner, priority)`

## 🔴 High Priority

- [x] Define types (TimeSlot, WeatherData, RunScore, HourlyConditions)
- [x] Implement run-scorer (score each hour 0–100 based on weather conditions)
- [x] Implement weather-service (fetch hourly forecast from Open-Meteo)
- [x] Implement location-service (geolocation + manual fallback + localStorage)
- [x] Implement slot-builder (group hours, rank time windows)
- [x] Build UI components (timeline-view, time-slot-card, score-bar, condition-badge)
- [x] Wire composables (use-weather, use-location) into App.vue

## 🟡 Medium Priority

- [ ] Define core data models (Runner, Race, TrainingSession, Prediction)
- [ ] Implement basic Riegel race equivalence calculator
- [ ] Design input format for training data (CSV? JSON? API?)
- [ ] Research additional prediction models beyond Riegel (Cameron, VO2max-based)
- [x] Set up CI/CD pipeline (GitHub Actions → GitHub Pages)

## 🟢 Low Priority

- [ ] Add visualization for predicted vs actual race times
- [ ] Support multiple runners / profiles
- [ ] Export predictions to common formats
- [ ] Visible focus styles applied across all interactive elements (deferred from ADR-004)
- [ ] `prefers-reduced-motion` overrides (deferred from ADR-004)
- [ ] Light-mode palette behind `prefers-color-scheme: light` (deferred from ADR-004)

---

## ✅ Done

<!-- Move completed items here with completion date -->
<!-- - [x] (2025-05-21) Set up project harness and agent instructions -->
- [x] (2026-05-22) Dark theme + remove decorative emoji + establish design system (`docs/design-system.md`, ADR-004)
- [x] (2026-05-22) GitHub Pages deployment via GitHub Actions
- [x] (2026-05-26) Manual “Use my current location” re-detect button in `LocationBadge` (`docs/plans/manual-trigger-auto-relocation.md`)
