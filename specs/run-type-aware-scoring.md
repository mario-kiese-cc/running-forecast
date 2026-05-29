# Spec: Run-Type Aware Scoring

## Status

Draft — not yet planned. Builds on *Personal scoring profiles*.

## Summary

Let the user pick a **run type** (Easy, Long, Tempo, Intervals, Recovery) above the timeline. Each run type adjusts the scoring weights and ideal ranges to reflect how that workout responds to weather — e.g. an Easy run tolerates heat better than an Interval session, a Long run cares more about UV and hydration.

## Motivation

A single global score answers "is this hour good for running?" but real runners ask "is this hour good for *this workout*?" High-intensity sessions degrade rapidly with heat and humidity; easy efforts barely notice. Surfacing the best window per workout type is far more useful than one universal ranking and turns the app from a weather toy into a planning tool.

This also creates a natural pairing with the personal profile: the run-type modifier is applied **on top of** the active personal profile.

## User stories

- As a runner planning intervals tomorrow, I want to see the best **cool, calm** window, even if a hotter slot has a higher overall score.
- As someone scheduling a 2-hour long run, I want UV and sustained heat to weigh more heavily than for a 30-minute easy jog.
- As a recovery-day runner, I want the scorer to be lenient — almost any non-rainy slot is fine.
- As a user without a strong preference, I want the app to default to "Easy" and stay out of my way.

## Scope

**In scope**

- Five built-in run types: `easy`, `long`, `tempo`, `intervals`, `recovery`.
- Each run type defines a **delta** applied to the active personal profile (weight multipliers + temperature-range shifts), not an absolute profile.
- A run-type selector visible above the timeline.
- Re-scoring the current forecast on selection change, with no network refetch.
- Persisting the last-chosen run type per device (LocalStorage).

**Out of scope**

- User-defined custom run types (v2).
- Distance/duration inputs that auto-pick a run type.
- Calendar integration ("schedule this run").
- Interaction with training-load logic (separate future feature).

## Functional requirements

- **FR-1** The application MUST expose a `RunType` selector — five options — placed prominently above the timeline.
- **FR-2** Each `RunType` MUST map to a deterministic `RunTypeModifier` (weight multipliers + ideal-range shift + optional UV penalty multiplier).
- **FR-3** Effective scoring weights MUST be computed as `normalize(profile.weights * modifier.weightMultipliers)`. Final weights still sum to 1.0.
- **FR-4** Effective ideal temperature range MUST be computed as `[profile.idealLow + modifier.idealShiftLow, profile.idealHigh + modifier.idealShiftHigh]`, clamped to a sane domain (e.g. -10 to 25 °C).
- **FR-5** Switching run type MUST re-score the visible forecast within 100 ms with no network request.
- **FR-6** The last-chosen run type MUST persist in `localStorage`; default on first visit is `easy`.
- **FR-7** The selector MUST show a short tooltip/hover describing how each type changes the scoring (e.g. "Intervals — penalises heat & humidity more").
- **FR-8** When `recovery` is selected, the rating thresholds MAY be softened so that more slots qualify as "good" (proposal: shift the `good` threshold from 60 to 50). This MUST be configurable in the modifier definition rather than hard-coded.
- **FR-9** Run-type modifiers MUST be defined declaratively in one place (`src/services/run-type.ts`) and covered by unit tests.

## Non-functional requirements

- **NFR-1 — Composability:** run-type and personal-profile logic MUST be independent and combine in a single, well-tested pure function `applyRunTypeModifier(profile, runType) → ScoringProfile`.
- **NFR-2 — Performance:** same constraints as Personal Profiles (synchronous re-score on change).
- **NFR-3 — Accessibility:** selector is keyboard navigable (arrow keys between options) and announces the active selection.
- **NFR-4 — Discoverability:** the selector is visible without scrolling on mobile.
- **NFR-5 — Testability:** modifiers are pure data; the combiner is a pure function.

## UX notes

- A segmented control above the timeline:
  `[ Easy ] [ Long ] [ Tempo ] [ Intervals ] [ Recovery ]`
  Active option highlighted using the existing accent colour from the design system.
- On mobile (narrow widths) the control becomes a horizontally-scrolling chip row; tap to select.
- Below the control, a one-line caption explains the current choice: e.g. "Intervals — prefers cool, low-humidity, low-wind windows."
- When the user changes the run type, the timeline re-orders/re-colours with a subtle transition (respect `prefers-reduced-motion`).
- The interaction with personal profile is implicit — no extra UI — but the settings panel header should display: "Profile: Heat-sensitive · Run type: Intervals" so the user understands both layers are active.

## Data model impact

Add to `src/types.ts`:

```ts
export type RunType = "easy" | "long" | "tempo" | "intervals" | "recovery";

export interface RunTypeModifier {
  readonly runType: RunType;
  readonly label: string;
  readonly description: string;
  readonly weightMultipliers: Partial<ScoringWeights>;
  readonly idealShiftCelsius: { readonly low: number; readonly high: number };
  /** Optional override for the "good" rating threshold */
  readonly goodThresholdOverride?: number;
}
```

New module `src/services/run-type.ts`:

- Exports the five `RunTypeModifier` definitions.
- Exports `applyRunTypeModifier(profile: ScoringProfile, runType: RunType): ScoringProfile`.
- Exports `loadRunType()` / `saveRunType()` helpers.

New composable `src/composables/use-run-type.ts`:

- Reactive `runType` ref + setter; persists on change; default `easy`.

Refactor in `run-scorer.ts`:

- Already accepts a `ScoringProfile` (after the Personal Profiles change), so no further signature change here — the combined profile is passed in.

## Open questions

- **OQ-1** Concrete modifier values for each run type. Initial proposal:
  | Run type   | temp ×weight | humidity ×weight | wind ×weight | UV impact     | ideal-temp shift |
  |------------|--------------|------------------|--------------|---------------|------------------|
  | Easy       | 1.0          | 1.0              | 1.0          | normal        | 0 / 0            |
  | Long       | 1.2          | 1.2              | 1.0          | higher        | -1 / -2          |
  | Tempo      | 1.3          | 1.2              | 1.1          | normal        | -1 / -2          |
  | Intervals  | 1.5          | 1.3              | 1.2          | normal        | -2 / -3          |
  | Recovery   | 0.8          | 0.8              | 0.8          | normal        | +1 / +2          |
  Needs at least one running-coach sanity check before shipping.
- **OQ-2** Should the run-type also influence **slot length** in `slot-builder` (e.g. show 3-hour windows for "Long")? *(Proposal: defer to a follow-up; keep v1 score-only.)*
- **OQ-3** Should Recovery's softer threshold also relabel slots, or just shade them? *(Proposal: yes, relabel — be consistent with thresholds elsewhere.)*
- **OQ-4** Naming: "Run type" vs "Workout" vs "Effort"? *(Proposal: "Run type" — least jargon.)*
- **OQ-5** Does this feature depend on UV exposure being implemented first? *(Proposal: yes for the UV-related modifiers; without UV, "Long" can still shift the ideal temperature, but the UV multiplier becomes a no-op until that feature lands.)*

## Acceptance criteria

- [ ] Selecting each run type changes the timeline ranking in a way consistent with its description.
- [ ] Combined profile = personal profile × run-type modifier, verified by a unit test for at least three combinations.
- [ ] Weight multipliers never produce a weight vector that fails to sum to 1.0 after normalisation.
- [ ] Last-chosen run type persists across reloads.
- [ ] Default on first ever load is `easy`.
- [ ] Selector is fully keyboard-operable and screen-reader-announced.
- [ ] Tooltip/caption text is present for every option.
- [ ] `CHANGELOG.md` updated; `TODO.md` item moved to Done.
