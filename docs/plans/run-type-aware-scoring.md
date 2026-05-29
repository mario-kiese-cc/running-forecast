# Plan: Run-Type Aware Scoring

## Status: Approved

Approved 2026-05-29 by repo owner.

**Decisions on open questions:**
1. Ship spec OQ-1 starter modifier values as-is.
2. Include the UV multiplier field in `RunTypeModifier` now (no-op until UV scoring lands) to avoid type churn later.
3. Recovery threshold override applies to `good` only (60 → 50). `great` stays at 80.
4. Add a per-run-type icon (selector renders icon + label).
5. Caption beneath the selector — confirmed.

Spec: [`specs/run-type-aware-scoring.md`](../../specs/run-type-aware-scoring.md)
Builds on: [`docs/plans/personal-scoring-profiles.md`](./personal-scoring-profiles.md), [ADR-005](../decisions/005-scoring-profile-model.md)

## Context

The just-shipped Personal Scoring Profiles work already gives us the seam
this feature needs:

- `scoreAllHours(hours, profile)` accepts a full `ScoringProfile`.
- `useWeather` keeps `slots` as a `computed` over `(rawHourly, profile)` — a
  profile change re-scores without a network refetch.
- `use-scoring-profile.ts` establishes the module-level singleton pattern for
  cross-component reactive state.

The new feature composes on top: introduce a `RunType` selector that
produces a `RunTypeModifier` (weight multipliers + ideal-range shift +
optional `goodThresholdOverride`). At render time:

```
effectiveProfile = applyRunTypeModifier(personalProfile, runType)
useWeather(location, effectiveProfile)
```

No scorer signature change beyond adding optional threshold-override
plumbing; no network refetch.

## Goal

Let the user pick one of five run types (`easy`, `long`, `tempo`,
`intervals`, `recovery`) above the timeline. The selection adjusts scoring
weights and the ideal-temperature range on top of the active personal
profile, and re-scores the displayed forecast within 100 ms.

## Files

### New

| File | Purpose |
|---|---|
| `src/services/run-type.ts` | `RUN_TYPE_MODIFIERS` map, `applyRunTypeModifier(profile, runType)`, `loadRunType`/`saveRunType`/`clearRunType`, `runTypeLabel`. Pure data + pure functions. |
| `src/services/run-type.test.ts` | Modifier definitions valid, weights renormalise to 1.0, ideal-range clamp to [-10, 25] °C, persistence round-trip, invalid blob → `easy`, composition with multiple personal profiles. |
| `src/composables/use-run-type.ts` | Singleton `ref<RunType>` mirroring `use-scoring-profile.ts`. Exports `useRunType()` and `__resetRunTypeForTests()`. |
| `src/composables/use-run-type.test.ts` | Default `easy`, persists on change, reset hook works. |
| `src/components/run-type-selector.vue` | Segmented control: 5 options (icon + label), keyboard nav (arrow keys, Home/End), `role="radiogroup"`, mobile = horizontal-scroll chip row. Emits `select`. Renders one-line caption beneath. |
| `src/components/run-type-selector.test.ts` | Renders 5 options, click emits, arrow keys move active, caption updates, `aria-checked` reflects selection, each option has an icon. |
| `docs/decisions/006-run-type-modifiers.md` | ADR — modifier-as-delta design, threshold-override mechanism, composition order. |

### Modified

| File | Change |
|---|---|
| `src/types.ts` | Add `RunType`, `RunTypeModifier`. Add optional `goodThresholdOverride?: number` to `ScoringProfile` (see Q1 below). |
| `src/services/run-scorer.ts` | `scoreToRating` gains optional `thresholdOverrides?: { good?: number }`. `scoreHour` reads `profile.goodThresholdOverride` and forwards it. |
| `src/services/run-scorer.test.ts` | Recovery's lowered `good` threshold reclassifies a 52-score from `fair` → `good`. |
| `src/services/scoring-profile.ts` | Validator tolerates the new optional field; `withCustomEdit` does **not** propagate it (modifier-only). |
| `src/composables/use-weather.ts` | No signature change — caller passes the *effective* profile ref. |
| `src/App.vue` | Use `useRunType()`; compute `effectiveProfile = computed(() => applyRunTypeModifier(profile.value, runType.value))`; pass to `useWeather`. Mount `<RunTypeSelector>` above the timeline. Update header subtitle/`ProfilePill` context to mention the active run type. |
| `src/components/icon/icons.ts` | Add five run-type icons (proposed glyphs: `easy` → footprints/shoe, `long` → road/horizon, `tempo` → metronome/stopwatch, `intervals` → bolt, `recovery` → leaf). Final glyph names finalised during the icons step. |
| `CHANGELOG.md` | Unreleased entry. |
| `TODO.md` | Add to High Priority, then move to Done when complete. |

**Total:** 7 new files, 6 modified. No new packages.

## Data shapes

```ts
// src/types.ts (additions)
export type RunType = "easy" | "long" | "tempo" | "intervals" | "recovery";

export interface RunTypeModifier {
  readonly runType: RunType;
  readonly label: string;
  readonly description: string;
  /** Per-key multipliers; missing keys are treated as 1.0. */
  readonly weightMultipliers: Partial<ScoringWeights>;
  readonly idealShiftCelsius: { readonly low: number; readonly high: number };
  /** Optional override for the "good" rating threshold (default 60). */
  readonly goodThresholdOverride?: number;
}

// Extend ScoringProfile
export interface ScoringProfile {
  // ...existing fields...
  /** Only set by `applyRunTypeModifier`; never persisted on personal profiles. */
  readonly goodThresholdOverride?: number;
}
```

### `applyRunTypeModifier` semantics

```
1. raw weights      = profile.weights × modifier.weightMultipliers (per-key)
2. weights          = normalizeWeights(raw)                        (sums to 1.0)
3. idealLow         = clamp(profile.idealLow  + shift.low,  -10, 25)
4. idealHigh        = clamp(profile.idealHigh + shift.high, -10, 25)
5. if idealLow > idealHigh → swap                                  (defensive)
6. goodThresholdOverride = modifier.goodThresholdOverride
7. preset / basedOn / darknessScore / schemaVersion: copied from `profile`
```

## Non-obvious design choices

### Q1 — Where does `goodThresholdOverride` live?

The spec asks recovery to soften the `good` threshold (60 → 50, `great`
left at 80 per decision 3). Three options:

- **A. Extend `ScoringProfile`** with optional `goodThresholdOverride`.
  Cleanest; future-proof for fully tunable thresholds; one-line type
  change; small validator update.
- **B. Carry on a separate `RatingContext` parameter** alongside the
  profile in `scoreHour`. Avoids touching `ScoringProfile` shape; adds a
  parameter to a hot signature.
- **C. Resolve thresholds outside the scorer** in `App.vue`. Leaks domain
  logic into the view.

→ **Decision: A.** The field is optional, `withCustomEdit` and the
persistence validator explicitly do not propagate it from the personal
profile, so a stale value can't leak across reloads.

### Q2 — `weightMultipliers` as deltas vs absolutes

Spec is explicit: deltas on top of personal profile, then re-normalised.
Multiply per-key, renormalise via existing `normalizeWeights`. Missing
keys in the modifier default to `1.0`. Satisfies FR-3.

### Q3 — Singleton vs prop-drilled state

Mirror `use-scoring-profile.ts`: module-level lazy `ref`,
`__resetRunTypeForTests()` export. Same trade-offs and justification as
ADR-005 Q3.

### Q4 — Selector UX shape

- **A. CSS-grid 5-up segmented control**, becomes `overflow-x: auto` flex
  row below ~480 px. Single component, one CSS file.
- **B. Native `<select>`** on mobile, segmented control on desktop. More
  accessible by default but two render paths.

→ **Decision: A** for consistency with existing pill/badge styling.
Keyboard nav handled via `role="radiogroup"` + arrow keys.

## Dependencies & risks

No new dependencies.

- **R1 — Threshold override leak.** `goodThresholdOverride` on
  `ScoringProfile` could be persisted accidentally. Mitigation:
  `withCustomEdit` strips it; persistence validator ignores it on load.
- **R2 — UV multiplier is a no-op today** (UV scoring isn't a separate
  factor yet — folded into apparent temperature). Mitigation per
  decision 2: include the field in `RunTypeModifier` now so the type is
  stable, but it is unused by the scorer until UV becomes its own
  factor. Document the no-op in ADR-006 and add a TODO.
- **R3 — Cumulative composition surprises.** "Intervals" + "Heat-sensitive"
  yields a very narrow ideal range. Mitigation: clamp to [-10, 25] °C
  (FR-4); unit test the combo.
- **R4 — Re-render thrash.** Both `profile` and `runType` changes re-run
  `applyRunTypeModifier` and re-score ~96 hours. Sub-millisecond per
  ADR-005 measurements; no debouncing needed.
- **R5 — Visual noise above timeline.** Mitigation: compact selector,
  reuse design tokens, no large heading.

## Open questions for the user

All resolved — see the Decisions block at the top of this file.

## Complexity

**Medium.** Additive on the ADR-005 foundation. New service + composable +
component are each well under 200 lines. Two touch-points outside the new
code: `scoreHour`/`scoreToRating` for the threshold override, and
`App.vue` to wire the composable + selector. Estimate ~600 LOC including
tests.

## Step order

Each step ends with `pnpm test` per AGENTS.md §9.

1. Types (`src/types.ts`).
2. `run-type.ts` + tests (modifiers, `applyRunTypeModifier`, persistence).
3. `use-run-type.ts` + tests.
4. `run-scorer.ts` threshold-override plumbing + regression test.
5. `scoring-profile.ts` validator/`withCustomEdit` updates so the
   override never persists on personal profiles.
6. Add five run-type icons to `src/components/icon/icons.ts`.
7. `run-type-selector.vue` + tests.
8. Wire into `App.vue`; minor header/profile-pill copy adjustments.
9. ADR-006.
10. CHANGELOG + TODO.

## Acceptance (mirrors spec)

- [ ] Selecting each run type changes timeline ranking consistent with
      its description.
- [ ] Combined profile verified for ≥3 (profile × run-type) combinations
      in unit tests.
- [ ] Weight vector always sums to 1.0 after `normalizeWeights`.
- [ ] Last-chosen run type persists across reloads; default on first
      visit is `easy`.
- [ ] Selector is keyboard-operable (arrow keys + Home/End) and
      screen-reader-announced (`role="radiogroup"` + `aria-checked`).
- [ ] Tooltip/caption text present for every option.
- [ ] `CHANGELOG.md` updated; `TODO.md` item moved to Done.
