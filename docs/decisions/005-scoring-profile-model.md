# ADR-005: Scoring Profile Model

**Status:** Accepted
**Date:** 2026-05-29
**Decision Makers:** Mario

## Context

`run-scorer.ts` originally used a module-level `WEIGHTS` constant and hard-coded ideal ranges (apparent temperature 8–18 °C, darkness score 20). The *Personal scoring profiles* feature (see [`specs/personal-scoring-profiles.md`](../../specs/personal-scoring-profiles.md)) requires these to become user-tunable, with presets, persistence in `localStorage`, and live re-scoring of the displayed forecast.

Three design questions drove this ADR:

1. How invasive should the scorer signature change be?
2. How does the displayed timeline react to profile changes?
3. How is the active profile shared across UI surfaces (header pill, settings panel, weather composable)?

## Options Considered

### Q1 — Scorer signature

1. **Spec-literal** — every scoring helper takes the full `ScoringProfile`. Uniform, but couples `scoreWind`/`scoreHumidity`/etc. to a fat type they don't use.
2. **Top-level only** — only `scoreHour`/`scoreAllHours`/`computeOverallScore` accept the profile; helpers keep hard-coded ideal ranges. Defeats the feature (FR-1 needs `scoreTemperature`'s ideal range and `scoreDaylight`'s darkness score tunable).
3. **Hybrid** — helpers take only the primitives they need; the profile is destructured at the `scoreHour`/`scoreAllHours` boundary.

### Q2 — Reactivity

1. **Imperative re-score** — keep `slots` as a `ref` and re-run `scoreAllHours` from a watcher on the profile.
2. **Derived state** — `useWeather` stores raw `HourlyData[]`; `slots` is a `computed` over `(rawHourly, profile)`. Vue re-runs automatically.

### Q3 — Shared state

1. Inject the profile ref from `App.vue` into every consumer (props drilling).
2. Module-level lazy `ref` inside `use-scoring-profile.ts`, returned by every `useScoringProfile()` call (singleton).

## Decision

- **Q1: Hybrid.** Helpers take their own primitives, `scoreHour`/`scoreAllHours`/`computeOverallScore` take the profile / weights.
  - `scoreTemperature(apparentTempC, idealRange)`
  - `scoreDaylight(isDaylight, darknessScore)`
  - `scorePrecipitation`, `scoreWind`, `scoreHumidity`, `scoreAirQuality` — unchanged (no v1 tunables)
  - `computeOverallScore(factors, weights)`
  - `scoreHour(hourly, profile)`, `scoreAllHours(hours, profile)`

- **Q2: Derived state.** `useWeather` stores raw hourly data; `slots = computed(() => scoreAllHours(rawHourly.value, profile.value))`. 6 weights × ~96 hours is sub-millisecond, so no debouncing is required even during slider drag.

- **Q3: Module-level singleton.** `use-scoring-profile.ts` owns a lazy module-level `ref<ScoringProfile>`. `useScoringProfile()` returns the same ref to every caller. A `__resetForTests()` export restores defaults for test isolation.

### Profile shape

```ts
export interface ScoringProfile {
  readonly schemaVersion: 1;
  readonly preset: ScoringProfilePreset;
  /** When preset === "custom", the preset this custom profile was forked from. */
  readonly basedOn?: Exclude<ScoringProfilePreset, "custom">;
  readonly weights: ScoringWeights; // sums to 1.0
  readonly idealApparentTempCelsius: { readonly low: number; readonly high: number };
  readonly darknessScore: number; // 0–100
}
```

**Deviation from spec:** the spec listed `label: string` as a stored field. We compute the label on the fly via `profileLabel(profile)` instead — purely derivable values should not be persisted. The user-visible behaviour is identical.

### Temperature curve

The curve *shape* stays hard-coded (per spec OQ-2 default: out of v1). Only the ideal range translates the curve. With default `idealLow = 8`, `idealHigh = 18` the function is byte-for-byte identical to the previous behaviour:

- `[idealLow, idealHigh]` → 100
- cold zone of width 13 °C below `idealLow` → linear 100 → 0
- warm zone: 2 °C above `idealHigh` → linear 100 → 80 (gentle), then 8 °C → linear 80 → 0 (steep)

### Initial preset values

| Preset | Ideal °C | Weights (precip / temp / wind / hum / aq / day) | Darkness |
|---|---|---|---|
| default | 8 – 18 | 0.30 / 0.30 / 0.10 / 0.10 / 0.10 / 0.10 | 20 |
| heat-sensitive | 6 – 14 | 0.25 / 0.40 / 0.05 / 0.15 / 0.05 / 0.10 | 20 |
| cold-averse | 12 – 22 | 0.30 / 0.35 / 0.15 / 0.05 / 0.05 / 0.10 | 20 |
| winter-runner | -2 – 10 | 0.30 / 0.25 / 0.15 / 0.05 / 0.10 / 0.15 | 70 |
| urban-air-quality | 8 – 18 | 0.25 / 0.25 / 0.10 / 0.05 / 0.25 / 0.10 | 20 |

These are starter values. They may be tuned post-launch based on user feedback — preset definitions are pure data, not API, so iteration is cheap.

## Consequences

**Easier**
- Adding a new preset is a single object literal in `scoring-profile-presets.ts`.
- Future *Run-type aware scoring* composes by passing a modified profile through the same scorer signature — no new plumbing.
- The scorer remains pure and unit-testable; helpers can be tested in isolation with primitive inputs.
- Profile changes never trigger a network refetch — `useWeather` already separates fetch from score.

**Harder**
- The scorer's signature change ripples to `run-scorer.test.ts` and `use-weather.ts` (one consumer). One-time churn.
- The module-level singleton must be reset in tests to avoid state leaking between cases. Mitigated by `__resetForTests()`.
- `localStorage` must be schema-versioned (`schemaVersion: 1`) so future shape changes can migrate or invalidate safely. Invalid blobs silently fall back to the `default` preset.
