# Spec: Sun & UV Exposure

## Status

Draft — not yet planned. Partially supported in the data model (`uvIndex` already exists on `HourlyConditions`), but not used in scoring or UI.

## Summary

Incorporate the UV index (already fetched from Open-Meteo and present on `HourlyConditions`) into both the run score and the UI, so that bright midday slots in summer are appropriately penalised for runs longer than ~45 minutes, and so the user can see at a glance which windows are exposed vs sun-safe.

## Motivation

Currently `uvIndex` is fetched but never read by `run-scorer.ts`. For long-duration runs in summer this is a significant gap: a window with UV 9 and clear skies can be genuinely unsafe for a 90-minute run, even if temperature and humidity are acceptable. Surfacing UV improves the recommendation quality and is a small extension because the data is already in-hand.

This feature also pairs naturally with *Run-type aware scoring* — UV matters more for `long` runs than for `recovery` jogs.

## User stories

- As a fair-skinned runner, I want windows with UV ≥ 8 to be visibly flagged so I can plan to cover up or pick a different hour.
- As a long-run planner, I want sustained high UV to reduce a slot's score, not just be informational.
- As a winter user in northern latitudes, I want UV to *not* affect my score, because it's effectively always low.
- As a curious user, I want to see the UV value in the slot detail, so I can decide for myself whether to apply sunscreen.

## Scope

**In scope**

- New scoring factor `uv` added to `ScoreFactors` (seventh factor).
- Default weight low (~5%) so existing rankings are not destabilised; weight grows for long-run modifier.
- A new `condition-badge` variant for UV, with three tiers: `low` (0–3), `moderate` (4–6), `high` (7+).
- UV value shown in the slot detail/tooltip.
- Plain-language guidance string included in the tooltip for `high` UV (e.g. "Strong sun — sunscreen and a cap recommended").

**Out of scope**

- Cloud-cover modulation of UV (Open-Meteo's UV already accounts for clouds; we do not need to combine them).
- Personalised skin-type / sensitivity setting (could be a future extension of the personal profile).
- Notifications or alerts based on UV.
- Calculating cumulative UV exposure across a slot's duration (future enhancement).

## Functional requirements

- **FR-1** `ScoreFactors` MUST gain a `uv: number` field (0–100, higher is better, i.e. lower UV scores higher).
- **FR-2** `scoreUv(uvIndex: number)` MUST return:
  - `100` for UV 0–2 (low),
  - linear decline 100 → 60 for UV 2–5,
  - linear decline 60 → 0 for UV 5–10,
  - `0` for UV ≥ 10.
- **FR-3** The default `WEIGHTS` (the `default` personal profile) MUST allocate a small weight to UV (proposed 0.05) and re-balance other weights so they still sum to 1.0.
- **FR-4** When the *Personal scoring profiles* feature is implemented, all five presets MUST include a `uv` weight. Heat-sensitive and Long-run-oriented presets MAY assign higher UV weight.
- **FR-5** `HourlyConditions.uvIndex` MUST be displayed in the slot detail view, with a label like "UV 7".
- **FR-6** A new `condition-badge` variant MUST be available, rendered in slots with UV ≥ 4. UV ≥ 7 MUST use a distinct, more prominent style (matching the design system's warning palette).
- **FR-7** UV scoring MUST gracefully treat missing/invalid UV data (`undefined`, `NaN`, negative) as `100` (no penalty), mirroring how `scoreAirQuality` handles missing AQI.
- **FR-8** Nighttime hours (`isDaylight === false`) MUST score UV as `100` regardless of the reported UV value, since sun exposure is not a concern.

## Non-functional requirements

- **NFR-1 — Backward compatibility:** existing tests for the scorer must continue to pass with only minor weight-rebalancing updates. The qualitative ranking of slots in tests using realistic data should not flip wildly.
- **NFR-2 — Internationalisation readiness:** UV labels and guidance strings live in a single module to make later translation straightforward.
- **NFR-3 — Accessibility:** the UV badge MUST not rely on colour alone — include the icon and numeric value.
- **NFR-4 — Determinism:** the new scoring function is pure and total over the real-number domain.

## UX notes

- In each `time-slot-card`, when UV ≥ 4, a small sun-icon badge appears next to existing condition badges: `☀ UV 7`. UV ≥ 7 styled with the warning accent.
- In the slot's detail/tooltip, a new row shows: `UV index: 7 (high) — sunscreen recommended for runs over 30 min.` The guidance line only appears for `moderate`/`high` tiers.
- No new top-level UI — UV is a per-slot detail, not a dedicated panel.

## Data model impact

`src/types.ts`:

```ts
export interface ScoreFactors {
  readonly precipitation: number;
  readonly temperature: number;
  readonly wind: number;
  readonly humidity: number;
  readonly airQuality: number;
  readonly daylight: number;
  readonly uv: number; // NEW
}
```

`src/services/run-scorer.ts`:

- Add `scoreUv(uvIndex: number, isDaylight: boolean): number`.
- Add `uv` to `computeFactors` and to the weighted sum in `computeOverallScore`.
- Default `WEIGHTS` updated (proposal: precip 0.30, temp 0.28, wind 0.10, humidity 0.10, airQuality 0.10, daylight 0.07, uv 0.05).

`src/services/weather-service.ts`:

- No change. `uvIndex` is already in the hourly request.

New module `src/services/uv.ts` (optional, but recommended):

- Exports `uvTier(uvIndex: number): "low" | "moderate" | "high"` and `uvGuidance(tier): string`. Keeps strings out of the scorer.

Component changes:

- `condition-badge.vue` gains a `uv` variant (or a new dedicated `uv-badge.vue` if cleaner).
- `time-slot-card.vue` renders the UV badge when applicable.

## Open questions

- **OQ-1** Exact default weight for UV. Proposal: 0.05. *(Need to verify it does not significantly perturb existing user expectations.)*
- **OQ-2** Should UV penalty depend on run duration? Without a duration input we cannot do this directly — defer to *Run-type aware scoring*, where `long` increases the UV weight.
- **OQ-3** Should the UV tier thresholds match the WHO scale (0–2 low, 3–5 moderate, 6–7 high, 8–10 very high, 11+ extreme) exactly, or be simplified to three tiers for UI clarity? *(Proposal: three tiers for badges; tooltip shows the raw number for transparency.)*
- **OQ-4** Should UV badges only show on slots that are also otherwise viable (rating ≥ `fair`)? *(Proposal: no — show whenever UV ≥ 4. Suppression hides information.)*
- **OQ-5** Cloud cover is not currently fetched; should we add `cloudCover` to `HourlyConditions` to refine the displayed guidance? *(Proposal: not in this spec; Open-Meteo's UV already accounts for clouds.)*

## Acceptance criteria

- [ ] `scoreUv` exists, is pure, and is unit-tested for low/moderate/high/extreme values and the nighttime-bypass case.
- [ ] Overall scores incorporate UV with the documented default weight, and existing scorer tests pass (after a one-time rebalance).
- [ ] UV badge renders for slots with UV ≥ 4 and matches design-system styling.
- [ ] Slot detail shows the numeric UV value plus tier label.
- [ ] Guidance text appears for `moderate` and `high` UV only.
- [ ] Missing/invalid UV data does not crash the scorer or the UI.
- [ ] `CHANGELOG.md` updated.
