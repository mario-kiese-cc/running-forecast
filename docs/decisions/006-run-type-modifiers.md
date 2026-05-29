# ADR-006: Run-Type Modifier Composition

**Status:** Accepted
**Date:** 2026-05-29
**Decision Makers:** Mario

## Context

The *Run-type aware scoring* feature (see [`specs/run-type-aware-scoring.md`](../../specs/run-type-aware-scoring.md)) lets the user pick one of five run types (`easy`, `long`, `tempo`, `intervals`, `recovery`) above the timeline. Each run type adjusts the active personal scoring profile so the displayed forecast reflects how that workout actually responds to weather — intervals punish heat much more than an easy jog; recovery tolerates almost any non-rainy slot.

This sits on top of [ADR-005](./005-scoring-profile-model.md). The scorer already accepts a full `ScoringProfile`; `useWeather` already re-scores reactively when the profile changes. The questions here are:

1. How does a run type combine with the personal profile — replace or delta?
2. Where does the "soften the *good* threshold for recovery" requirement (spec FR-8) live, given that `scoreToRating` is a pure function of a number?
3. How is the run-type state shared across components?

## Options Considered

### Q1 — Modifier shape

1. **Absolute profile** — each run type defines a full `ScoringProfile`. Simplest to reason about, but throws away the user's personal weighting choices the moment they pick a run type. Violates the spec ("applied on top of the personal profile").
2. **Delta (multiplicative weights + temperature shift)** — `RunTypeModifier` carries `Partial<ScoringWeights>` factors and `idealShiftCelsius`. `applyRunTypeModifier(profile, runType)` multiplies, renormalises, and clamps. Composable; respects the personal profile; one pure function to test.

### Q2 — `goodThresholdOverride` location

1. **Extend `ScoringProfile`** with optional `goodThresholdOverride?: number`. One-line type change; the value rides the existing profile-passing plumbing.
2. **Separate `RatingContext` parameter** alongside the profile in `scoreHour`. Avoids touching `ScoringProfile`; adds a parameter to a hot signature.
3. **Resolve thresholds outside the scorer** (post-process slots in `App.vue`). Leaks domain logic into the view; brittle.

### Q3 — Shared state

1. **Prop-drill** the run type from `App.vue` to every consumer.
2. **Module-level singleton** in `use-run-type.ts`, mirroring `use-scoring-profile.ts`.

## Decision

- **Q1: Delta.** A `RunTypeModifier` carries weight multipliers (missing keys default to 1.0), an additive ideal-temperature shift, an optional `goodThresholdOverride`, and a reserved `uvImpactMultiplier`. The combiner:
  ```
  applyRunTypeModifier(profile, runType):
    1. raw weights      = profile.weights × modifier.weightMultipliers
    2. weights          = normalizeWeights(raw)                 // sums to 1.0
    3. idealLow         = clamp(profile.low  + shift.low,  -10, 25)
    4. idealHigh        = clamp(profile.high + shift.high, -10, 25)
    5. swap low/high if inverted
    6. copy preset / basedOn / darknessScore / schemaVersion
    7. attach goodThresholdOverride from the modifier (if any)
  ```
  All inputs are immutable; the combiner is a pure function (NFR-1).

- **Q2: Extend `ScoringProfile`.** Added optional `goodThresholdOverride?: number`. The field is set *only* by `applyRunTypeModifier` and *only* on the effective profile that flows into the scorer. `withCustomEdit` explicitly strips it; the persistence validator ignores unknown extras, so even if a stale value somehow leaks into `localStorage` (e.g. across schema migrations) it has no effect on the persisted personal profile. `scoreToRating` gains an optional `RatingThresholdOverrides` parameter and clamps the override to `[fair, great]` so an unreachable rating cannot be produced.

- **Q3: Module-level singleton.** `use-run-type.ts` owns a lazy `ref<RunType>` returned by every `useRunType()` call. A `__resetRunTypeForTests()` export keeps test isolation. Mirrors ADR-005 Q3 exactly.

### Composition order (matters)

`App.vue` computes `effectiveProfile = computed(() => applyRunTypeModifier(profile.value, runType.value))` and passes the *effective* profile (not the personal one) into `useWeather`. This way both `profile` and `runType` changes participate in the same reactive recompute, and `useWeather`'s signature stays unchanged from ADR-005.

### Starter modifier values

Spec OQ-1 values, shipped as-is per the approved plan:

| Run type   | temp × | humid × | wind × | ideal shift (low / high) | good override | UV (reserved) |
|------------|--------|---------|--------|--------------------------|---------------|---------------|
| easy       | 1.0    | 1.0     | 1.0    | 0 / 0                    | —             | —             |
| long       | 1.2    | 1.2     | 1.0    | -1 / -2                  | —             | 1.3           |
| tempo      | 1.3    | 1.2     | 1.1    | -1 / -2                  | —             | —             |
| intervals  | 1.5    | 1.3     | 1.2    | -2 / -3                  | —             | —             |
| recovery   | 0.8    | 0.8     | 0.8    | +1 / +2                  | 50            | —             |

These are starter values; they may be tuned after user feedback — modifiers are pure data, not API.

### UV multiplier

`uvImpactMultiplier` is included on the `RunTypeModifier` type now (decision 2 in the plan) so the shape is stable when a UV factor is added later. The v1 scorer ignores it; only the `long` modifier carries a non-default value (`1.3`). TODO removal once UV becomes its own scoring factor.

## Consequences

**Easier**
- Adding a new run type is one object literal in `src/services/run-type.ts` plus an icon.
- The personal-profile system and the run-type system stay independent and combine through one well-tested pure function (NFR-1).
- The scorer's signature is unchanged from ADR-005; `useWeather` is unchanged.
- A future "context score" (e.g. distance, duration) can layer on the same way: `applyXModifier(effectiveProfile, x)` before the scorer.

**Harder**
- `ScoringProfile` now carries an optional field that must never be persisted on personal profiles. Mitigation: `withCustomEdit` explicitly drops it; `scoring-profile.test.ts` has a regression test guarding the rule.
- Stacking modifiers ("Heat-sensitive" personal profile × "Intervals" run type) can drive the ideal range to its clamp limits. Mitigation: the `[-10, 25]` °C clamp (FR-4) plus a unit test for the worst-case combination.
- Two singletons now (`use-scoring-profile`, `use-run-type`). Acceptable: each owns one concern, each has a `__resetForTests` hook.
