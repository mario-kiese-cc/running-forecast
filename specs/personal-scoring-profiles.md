# Spec: Personal Scoring Profiles

## Status

Implemented (2026-05-29). See [plan](../docs/plans/personal-scoring-profiles.md) and [ADR-005](../docs/decisions/005-scoring-profile-model.md).

## Summary

Let users tune how the run-scorer weighs each weather factor — and optionally select a preset profile (e.g. "Heat-sensitive", "Winter runner", "Cold-averse") — so that the recommended time windows reflect their personal preferences rather than a single hard-coded default.

## Motivation

`src/services/run-scorer.ts` currently uses a single global `WEIGHTS` constant and fixed ideal ranges (e.g. apparent temperature 8–18 °C). Real runners differ widely:

- A heat-acclimated runner is happy at 22 °C; a heat-sensitive runner suffers above 16 °C.
- Some runners actively dislike strong wind even when it's cool; others ignore it.
- Air quality matters more in some cities than others.

Without personalisation, "best window" recommendations feel generic and erode trust. Profiles also lay the groundwork for the future *Run-type aware scoring* feature (per-workout overrides build on the same underlying mechanism).

## User stories

- As a heat-sensitive runner, I want to mark myself as such so that warm afternoons are deprioritised, even when other conditions are perfect.
- As a winter runner, I want darkness to penalise a slot less, because I'm comfortable running with a head torch.
- As a curious user, I want to fine-tune the underlying weights/ideal ranges, so I can experiment without waiting for a new preset.
- As a returning visitor, I want my profile to persist between sessions on the same device, without an account.

## Scope

**In scope**

- A small set of curated **presets**: `default`, `heat-sensitive`, `cold-averse`, `winter-runner`, `urban-air-quality`.
- A **custom profile** that exposes weights for the six existing factors (`precipitation`, `temperature`, `wind`, `humidity`, `airQuality`, `daylight`) and the ideal temperature range.
- LocalStorage persistence of the active profile (mirroring how `UserLocation` is persisted today).
- A settings panel/sheet accessible from the main view.
- Re-scoring of the current forecast whenever the active profile changes (no network refetch — weights are applied client-side to cached `HourlyData`).

**Out of scope**

- Multiple named saved profiles (a single "active" profile is enough for v1).
- Cloud sync / multi-device.
- Per-workout overrides (covered by *Run-type aware scoring*).
- Automatic profile inference from past run logs.

## Functional requirements

- **FR-1** A `ScoringProfile` is composed of: factor weights summing to 1.0, an ideal apparent-temperature range `[idealLow, idealHigh]`, and a `darknessScore` (currently hard-coded to 20 in `scoreDaylight`).
- **FR-2** Five presets MUST be shipped with the application as immutable constants.
- **FR-3** The user MAY select any preset or switch to "Custom" and edit weights and the ideal range directly.
- **FR-4** Custom weight inputs MUST be re-normalised so the six weights always sum to 1.0; the UI MUST show normalised values, not raw input.
- **FR-5** The active profile MUST be persisted in `localStorage` under a single key. Loading on app start MUST gracefully fall back to `default` if the stored value is missing or invalid.
- **FR-6** Changing the active profile MUST re-score the currently displayed forecast within 100 ms without a network request.
- **FR-7** The currently active profile name (e.g. "Heat-sensitive") MUST be visible somewhere in the main view header area, with a single click/tap to open the settings panel.
- **FR-8** If the user selects a preset and then edits a weight, the active profile MUST be marked as "Custom (based on Heat-sensitive)".
- **FR-9** A "Reset to defaults" affordance MUST restore the `default` preset.

## Non-functional requirements

- **NFR-1 — Privacy:** profile data stays on-device. No analytics on weight values.
- **NFR-2 — Performance:** profile changes re-score all currently displayed hours (~48–96 hours) in a single synchronous pass.
- **NFR-3 — Accessibility:** all controls reachable by keyboard; sliders/inputs have associated labels; settings panel is announced when opened.
- **NFR-4 — Versioning:** the stored profile MUST include a schema version so future changes can migrate or invalidate gracefully.
- **NFR-5 — Testability:** scoring functions remain pure and accept the profile as an argument; no module-level singleton.

## UX notes

- Entry point: a "Profile: Default" pill/text in the header (near the location badge). Click → opens a settings panel (sheet on mobile, side panel on desktop).
- Panel sections:
  1. **Preset picker** — radio list of the five presets + "Custom".
  2. **Weights** — six sliders (0–100). Each slider's value is normalised live; helper text shows the normalised percentage.
  3. **Ideal temperature range** — dual-handle slider or two numeric inputs (°C).
  4. **Darkness tolerance** — single slider 0–100.
  5. **Reset** + **Close** buttons.
- Feedback: when a slider is moved, the timeline behind the panel re-renders so the user can see the impact immediately (debounce 50 ms).
- The active profile name shown in the header updates live.

## Data model impact

Add to `src/types.ts`:

```ts
export type ScoringProfilePreset =
  | "default"
  | "heat-sensitive"
  | "cold-averse"
  | "winter-runner"
  | "urban-air-quality"
  | "custom";

export interface ScoringWeights {
  readonly precipitation: number;
  readonly temperature: number;
  readonly wind: number;
  readonly humidity: number;
  readonly airQuality: number;
  readonly daylight: number;
}

export interface ScoringProfile {
  readonly schemaVersion: 1;
  readonly preset: ScoringProfilePreset;
  /** Human-readable derived label, e.g. "Custom (based on Heat-sensitive)" */
  readonly label: string;
  readonly weights: ScoringWeights;
  readonly idealApparentTempCelsius: { readonly low: number; readonly high: number };
  /** Score applied to `!isDaylight` hours, 0–100 */
  readonly darknessScore: number;
}
```

Refactor `run-scorer.ts`:

- `scoreTemperature`, `scoreDaylight`, `computeOverallScore`, `computeFactors`, `scoreHour`, `scoreAllHours` MUST accept a `ScoringProfile` parameter (last argument, no default — explicit at every call site).
- The current `WEIGHTS` constant becomes the `default` preset.

New module `src/services/scoring-profile.ts`:

- Exports the preset definitions, `loadProfile()`, `saveProfile()`, `normalizeWeights()`, and helpers to derive the "Custom (based on …)" label.

New composable `src/composables/use-scoring-profile.ts`:

- Wraps load/save and exposes a reactive `profile` ref + `setPreset`, `updateWeights`, `updateIdealRange`, `reset` actions. `useWeather` reads from this composable to re-score on change.

## Open questions

- **OQ-1** Should the "Heat-sensitive" preset also nudge `humidity` weight up, since heat + humidity compound? *(Default proposal: yes, slight bump.)*
- **OQ-2** Should the temperature *curve shape* (gentle vs steep) also be tunable, or only the ideal range? *(Default proposal: only the range — keep v1 surface small.)*
- **OQ-3** Is the settings entry point a header pill, a gear icon, or an item inside the existing location prompt? *(Default proposal: dedicated profile pill in header.)*
- **OQ-4** Should we expose `precipitationProbability` and `precipitationMm` thresholds, or keep precipitation a single tunable weight? *(Default proposal: weight only in v1.)*

## Acceptance criteria

- [ ] A user can switch between all five presets and see the timeline re-rank within a perceptibly-instant delay.
- [ ] A custom profile survives a full page reload.
- [ ] Selecting a preset and editing a single weight relabels the active profile to "Custom (based on …)".
- [ ] All scoring functions are pure and accept the profile explicitly; existing unit tests are updated to pass an explicit `default` profile.
- [ ] New unit tests cover: weight normalisation, profile persistence (load/save/invalid), and "heat-sensitive lowers afternoon-summer scores compared to default".
- [ ] "Reset to defaults" restores the original behaviour byte-for-byte.
- [ ] Keyboard-only operation of the settings panel is verified.
- [ ] `CHANGELOG.md` updated; `TODO.md` item moved to Done.
