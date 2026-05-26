# Plan: Manual Trigger for Automatic Relocation

## Status: Implemented (2026-05-26)

**Decisions:**
1. Button placement: **Option B** — direct button in `LocationBadge`.
2. Label: **"Use my current location"** (with crosshair icon).
3. Auto-close prompt on detection success: **yes**.


## Context

Today, browser geolocation only runs **once** — on first mount when no location is in `localStorage`. After that, the only way to update the location is to type a city name in `LocationPrompt`. There is no UI affordance to say "re-detect where I am now". A user who has moved (or whose initial detection was wrong) is stuck with manual text entry.

## Goal

Let the user explicitly re-trigger the browser Geolocation API at any time, replace the stored location with the result, and refresh the forecast.

## Files to Modify

| File | Change |
|---|---|
| `src/composables/use-location.ts` | Add a `detectLocation()` action + a `detectionStatus` ref (`idle` / `detecting` / `error`) and `detectionError` ref. Reuse `requestGeolocation`, `saveLocation`, and the existing `enrichAndPersist` flow. |
| `src/composables/use-location.test.ts` *(new)* | Unit tests for `detectLocation` (success, denial, no-support, race with concurrent change). No test file currently exists for this composable. |
| `src/components/location-badge.vue` | Add a "Use my current location" icon-button next to the existing "Change" button. New props: `isDetecting: boolean`, `detectionError: string \| null`. Emits a new `detect` event. Show spinner + inline error state. |
| `src/components/location-badge.test.ts` *(new if missing)* | Test the new button emits `detect`, disables while detecting, and surfaces error state. |
| `src/components/icon/` | Add a `crosshair` (or `locate`) icon if not already present. |
| `src/App.vue` | Wire the new `detect` event from `LocationBadge` to `detectLocation()` from the composable. Pass `isDetecting` / `detectionError` down. Auto-close `LocationPrompt` if open on success (already implicit: success updates `location`, but verify `isChangingLocation` is also cleared). |
| `CHANGELOG.md` | New entry under Unreleased. |
| `TODO.md` | Mark done. |

No changes needed in `location-service.ts` — `requestGeolocation()` already does exactly what we need. `LocationPrompt` stays untouched.

## UX Decision — Where Does the Button Live?

**Chosen: Option B — direct button in `LocationBadge`.**
Icon-button (crosshair) next to the existing "Change" button. One click re-detects.

Layout: `[ 📍 City, Country  DETECTED ]  [ ⊕ Use my current location ]  [ Change ]`

Both action buttons use the same pill style as the existing "Change" button. The new button shows a crosshair icon + the text "Use my current location". During detection it swaps to a spinner + "Detecting…" and is disabled. On error: inline error message rendered under the badge row (small, muted red). On success: badge updates, weather refetches automatically via the existing `watch` in `useWeather`.

Mobile consideration: `.location-badge` already uses `flex-wrap: wrap`, so the buttons drop to a new line on narrow widths.

## Composable API (proposed)

```ts
const {
  location,
  status,            // existing
  errorMessage,      // existing (initial-load error)
  setManualLocation, // existing
  detectLocation,    // NEW: () => Promise<void>
  detectionStatus,   // NEW: Ref<'idle' | 'detecting' | 'error'>
  detectionError,    // NEW: Ref<string | null>
} = useLocation();
```

`detectLocation` is **separate from initial-mount status** so we don't flip the whole app back to a `loading` skeleton just because the user pressed re-detect.

## Dependencies & Risks

- **No new packages.** Uses existing `requestGeolocation` and reverse-geocoding pipeline.
- **Permission denied path:** must surface a clear error inside the prompt ("Couldn't detect — please type your city"). Text input remains as fallback.
- **HTTPS requirement:** `navigator.geolocation` requires secure context. Already the case on GitHub Pages and local dev.
- **Race condition:** if user types a city while detection is in flight, the existing `enrichAndPersist` coordinate-equality check protects against stale reverse-geocoding overwrites. The detection result itself must also check that `location.value` hasn't been replaced by a manual entry before committing — add the same guard.
- **No silent retries:** detection must be user-initiated only (privacy + no permission spam).
- **Weather refetch:** `useWeather` already watches `location` so it should re-fetch automatically. Verify during implementation.

## Out of Scope

- Background/periodic relocation
- Map-pick UI
- Caching multiple saved locations / favorites

## Complexity

**Small.** ~50–80 lines of code across 3 files + tests. No new abstractions, no new services, no new dependencies.

## Resolved Questions

1. **Button placement** — Option B (direct in `LocationBadge`).
2. **Label text** — "Use my current location" (visible button text, with crosshair icon). Swaps to "Detecting…" while in-flight.
3. **Auto-close prompt on success** — yes.
