# Plan: Personal Scoring Profiles

## Status: Approved

Approved 2026-05-29 by repo owner.

**Decisions on open questions:**
1. Single big PR (not phased).
2. Preset numeric values proposed in ADR-005 (see Decisions below).
3. Header pill entry point — confirmed.
4. Modal sheet UI shape — confirmed.
5. Spec OQ-2 (temperature curve shape tunable) — out of v1.
6. Spec OQ-4 (precipitation thresholds tunable) — out of v1.
7. Live-preview debounce — skipped (recompute is microsecond-cheap).

Spec: [`specs/personal-scoring-profiles.md`](../../specs/personal-scoring-profiles.md)

## Context

`src/services/run-scorer.ts` currently uses a module-level `WEIGHTS` constant and hard-coded ideal ranges (apparent temperature 8–18 °C, darkness score 20). The spec asks us to make these tunable per user, persist the choice in `localStorage`, and re-score the displayed forecast on every change without a network refetch.

The scorer is called from one place (`useWeather` → `scoreAllHours`), so the blast radius of a signature change is limited to one composable and its tests, plus the scorer's own ~30-assertion test file.

## Goal

Replace the hard-coded scoring constants with a `ScoringProfile` value that flows from a new `useScoringProfile()` composable through `useWeather` into the scorer, with five presets and (in phase 3) a custom-edit UI.

## Files

### New

| File | Purpose |
|---|---|
| `src/services/scoring-profile.ts` | `loadProfile`, `saveProfile`, `normalizeWeights`, `withCustomEdit` helpers; `STORAGE_KEY` constant |
| `src/services/scoring-profile-presets.ts` | The five preset constants (split out for the 300-line file-size limit) |
| `src/services/scoring-profile.test.ts` | Unit tests: load/save round-trip, invalid blob → default, weight normalisation, label derivation |
| `src/services/scoring-profile-presets.test.ts` | Invariants: each preset's weights sum to 1.0, ideal range valid, "heat-sensitive scores a hot afternoon lower than default" |
| `src/composables/use-scoring-profile.ts` | Module-level singleton `profile` ref + actions: `setPreset`, `updateWeight`, `updateIdealRange`, `updateDarknessScore`, `reset`. Persists on every change. |
| `src/composables/use-scoring-profile.test.ts` | Composable tests with mocked localStorage; reset hook for test isolation |
| `src/components/profile-pill.vue` | Header pill: "Profile: Heat-sensitive". Click opens panel. |
| `src/components/profile-panel.vue` | Settings sheet: preset picker, weight sliders, ideal-range slider, darkness slider, reset & close |
| `src/components/profile-panel.test.ts` | Renders, emits events, keyboard navigable, reset restores default |
| `docs/decisions/005-scoring-profile-model.md` | ADR — profile-as-parameter design and reactive recompute strategy |

### Modified

| File | Change |
|---|---|
| `src/types.ts` | Add `ScoringWeights`, `ScoringProfile`, `ScoringProfilePreset` |
| `src/services/run-scorer.ts` | Inject tunables into helpers (Approach C — see below); export `DEFAULT_PROFILE`; remove module-level `WEIGHTS` / `RATING_THRESHOLDS` stay |
| `src/services/run-scorer.test.ts` | Pass an explicit profile/tunables to each scoring call; add a non-default-profile regression test |
| `src/composables/use-weather.ts` | Store raw `HourlyData[]`, expose `slots` as a `computed` over `(rawData, profile)` so profile changes re-score automatically. Signature gains a `profile: Ref<ScoringProfile>` parameter. |
| `src/composables/use-weather.test.ts` | Pass a profile ref; assert re-scoring on profile change |
| `src/App.vue` | Wire `useScoringProfile()` → `useWeather`; mount `ProfilePill` in the header; mount `ProfilePanel` as overlay |
| `src/components/icon/icons.ts` | Add `sliders` icon for the profile pill |
| `CHANGELOG.md` | Unreleased entry per phase |
| `TODO.md` | Move to Done when complete |

**Total:** ~10 new files, 8 modified. No new packages.

## Design choices

### 1. Scorer parameterisation — Approach C (recommended)

Three options were considered:

- **A — Spec-literal:** every helper takes the full `ScoringProfile`. Uniform but couples wind/humidity/etc. to a fat type they don't use.
- **B — Top-level only:** only `scoreHour`/`scoreAllHours`/`computeOverallScore` take the profile. Minimal test churn but `scoreTemperature` and `scoreDaylight` would have to either keep hard-coded tunables (defeating the feature) or be inlined.
- **C — Hybrid (chosen):** helpers take only the primitives they actually need; the profile is destructured at the `scoreHour`/`scoreAllHours` boundary.

```ts
scoreTemperature(apparentTempC: number, idealRange: { low: number; high: number }): number
scoreDaylight(isDaylight: boolean, darknessScore: number): number
scoreWind(speed): number                    // unchanged
scoreHumidity(rh): number                   // unchanged
scorePrecipitation(prob, mm): number        // unchanged
scoreAirQuality(aqi): number                // unchanged
computeOverallScore(factors, weights): number
scoreHour(hourly, profile): TimeSlot
scoreAllHours(hours, profile): TimeSlot[]
```

Rationale: helpers stay testable in isolation; existing helper tests update narrowly (`scoreTemperature(14, { low: 8, high: 18 })` instead of fabricating a whole profile). Matches the spec's *intent* (FR-1) without over-coupling.

### 2. Reactivity — derived state (recommended)

- **A — Imperative re-score:** keep `slots` as a ref; on profile change run `scoreAllHours` again via a watcher. Race-prone on initial mount.
- **B — Derived state (chosen):** `useWeather` stores raw `HourlyData[]`; `slots = computed(() => scoreAllHours(raw.value, profile.value))`. Vue's reactivity re-runs automatically when either input changes.

6 weights × ~96 hours is sub-millisecond, so no debouncing is required even during slider drag.

### 3. Settings UI shape — modal sheet (recommended)

- **A — Modal sheet (chosen)** consistent with `LocationPrompt`. Already supported by the design system; fastest to a11y-complete.
- B — Inline expandable section: more layout work, awkward live-preview with a tall panel.
- C — Side panel on desktop + sheet on mobile: nicer but more CSS; deferrable polish.

### 4. Dual-range temperature slider — two stacked native sliders

Native `<input type="range">` is single-value. Use two stacked range inputs with min/max clamping (~30 LOC, no deps). If interaction feels janky, fall back to two numeric inputs. **No new dependencies** (AGENTS.md forbids without approval).

### 5. Composable as module-level singleton

`useScoringProfile()` returns shared state so the header pill and the panel observe the same `profile` ref. Implemented as a lazy module-level `ref`, with a `__resetForTests()` export for isolation.

## Phased delivery

| Phase | Scope | User-visible change |
|---|---|---|
| **1 — Data + scorer + persistence** | Types, presets, `scoring-profile.ts`, scorer refactor (Approach C), `useScoringProfile()`, `useWeather` rewired, ADR-005, all existing tests pass | None |
| **2 — Preset picker UI** | `ProfilePill` in header, `ProfilePanel` with preset selection only (no sliders) | User can switch between five presets |
| **3 — Custom editing** | Weight sliders, dual-range temperature, darkness slider, reset, "Custom (based on …)" labelling | Full feature |

Each phase ends with a green test suite and a `CHANGELOG.md` entry.

## Risks

- **Test churn** in `run-scorer.test.ts` and `use-weather.test.ts`. Approach C minimises it; do the signature change and the test updates in the same commit.
- **`useWeather` signature change** ripples to `App.vue` and the App test. Only one consumer, low risk.
- **`localStorage` schema** — include `schemaVersion: 1`; on invalid/older blobs, silently fall back to `default` (mirrors `loadLocation`'s isValidLocation guard).
- **A11y** for the modal sheet (focus trap, Escape, restore focus). Reuse the pattern from `LocationPrompt`; if it lacks these, that's a small parallel cleanup, not a blocker.
- **File-length limit (300 lines)** — split presets into their own file pre-emptively; if `profile-panel.vue` grows past 250 lines, split into preset-list + weights-editor sub-components.
- **No new dependencies.**

## Out of scope (deferred)

- Multiple saved named profiles
- Cloud sync
- Per-workout overrides (covered by *Run-type aware scoring*)
- Temperature *curve shape* tunability (spec OQ-2 default: out)
- Per-factor precipitation thresholds (spec OQ-4 default: out)
- Live-preview debouncing (not needed at this scale)

## Open questions for the user

1. **Phased PRs or single PR?** Recommended: phased (1 → 2 → 3).
2. **Preset numeric values:** specify upfront or let me propose them in ADR-005 and iterate?
3. **Settings entry point:** confirm dedicated header pill (vs. gear icon next to location badge)?
4. **Settings UI shape:** confirm modal sheet (Approach A)?
5. **Spec OQ-2 (temperature curve shape tunable):** keep out of v1?
6. **Spec OQ-4 (precipitation thresholds tunable):** keep out of v1?
7. **Live-preview debounce:** OK to skip (recompute is microsecond-cheap)?

## Complexity

**Medium overall.**
- Phase 1: small (~1–2 sessions, mostly mechanical).
- Phase 2: small (~1 session).
- Phase 3: medium (~1–2 sessions; dual-range slider + a11y are the long pole).

## Acceptance criteria (mirrors spec)

- [x] A user can switch between all five presets and see the timeline re-rank within a perceptibly-instant delay (derived-state recompute in `useWeather`).
- [x] A custom profile survives a full page reload (`saveProfile` on every change, `loadProfile` rehydrates the singleton).
- [x] Selecting a preset and editing a single weight relabels the active profile to "Custom (based on …)" (`withCustomEdit` + `profileLabel`).
- [x] All scoring functions are pure and accept tunables/profile explicitly; existing unit tests still pass via default parameters and a new "profile recompute" test was added to `use-weather.test.ts`.
- [x] New unit tests cover: weight normalisation, profile persistence (load/save/invalid blob/wrong schema/inverted range), and "heat-sensitive lowers a hot afternoon vs default" (preset behavioural invariant).
- [x] "Reset to defaults" restores `DEFAULT_PROFILE` byte-for-byte and clears storage.
- [x] Keyboard support: Escape closes the panel, Tab is trapped within the dialog, focus returns to the previously-focused element on close.
- [x] `CHANGELOG.md` and `TODO.md` updated.
- [x] ADR-005 merged.

## Implementation notes

- **Panel split:** `profile-panel.vue` was extracted into three child components (`profile-preset-list.vue`, `profile-weights-editor.vue`, `profile-range-editor.vue`) to stay under AGENTS.md's 300-line file budget.
- **`label` field dropped from `ScoringProfile`:** labels are pure functions of `preset` + `basedOn`, so we compute them via `profileLabel()` instead of persisting them (see ADR-005).
- **One CHANGELOG entry under Unreleased** rather than per-phase (user opted for a single PR).
- **207 tests pass, build green** at completion.
