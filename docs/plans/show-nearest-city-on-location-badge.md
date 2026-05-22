# Plan: Show Nearest City Name on the Location Badge

## Status: Approved

**Resolved questions:**
1. Add BigDataCloud as a network dependency — yes.
2. Show `"📍 Detecting city…"` placeholder while resolving — yes.
3. Do not re-enrich manually-entered locations.
4. Write an ADR documenting the provider choice — yes (ADR-003).

## Problem Analysis

`LocationBadge.displayName` currently falls back to `lat, lon` when `location.name` is unset:

```ts
return `${props.location.latitude.toFixed(2)}, ${props.location.longitude.toFixed(2)}`;
```

`location.name` is only populated when the user picks a city via the manual prompt (`candidateToLocation`). The **detected** path (`requestGeolocation` in `location-service.ts`) returns `{ latitude, longitude, source: "detected" }` with no `name`, so the badge falls back to coordinates. That's the case to fix.

## What Open-Meteo Provides

The Open-Meteo geocoding API (already wired in `geocoding-service.ts`) is a **forward** geocoder (name → coords). It **does not** offer reverse geocoding. So we need either a different free API, or accept the limitation.

## Approaches Considered

### A. Add reverse geocoding via a free API — **recommended**

Use **BigDataCloud's free reverse-geocoding endpoint** (`https://api.bigdatacloud.net/data/reverse-geocode-client`). No API key, CORS-friendly, returns `city`, `locality`, `principalSubdivision`, `countryName`.

Alternatives (also keyless): **Nominatim** (OSM) — rate-limited, requires User-Agent, less browser-friendly. **GeoNames** — requires free account.

### B. Reverse-search via Open-Meteo geocoding
Not viable; the forward API can't map coordinates to a city without a bundled dataset.

### C. Stop showing coordinates, show `"Detected location"` until the user types one
Cheapest but doesn't satisfy the request.

**Going with A.**

## Design Details (Approach A)

### New module: `src/services/reverse-geocoding-service.ts`

```ts
export interface ReverseGeocodingResult {
  readonly city: string;        // city ?? locality ?? principalSubdivision
  readonly country?: string;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  fetchFn: FetchFn = fetch,
): Promise<ReverseGeocodingResult | null>;
```

- Returns `null` (not throws) on failure — this is enrichment, not critical-path data.
- Picks the most specific available label: `city` → `locality` → `principalSubdivision`.

### `use-location.ts` integration

After we have a location without a `name`, kick off `reverseGeocode` and patch `location.name`. Save the enriched location back to localStorage so we don't re-query on every page load.

Implementation sketch:
- Extract a helper `enrichWithCityName(loc)` returning either the same `loc` or `{ ...loc, name }`.
- Call it inside `onMounted` after both the localStorage hit *and* the geolocation hit, but only when `loc.name` is missing.
- Briefly the badge will show coordinates, then update once the promise resolves.

### `LocationBadge` change

While `name` is missing, optionally show `"📍 Detecting city…"` instead of raw coordinates. (Pending confirmation.)

### Tests

- `reverse-geocoding-service.test.ts` — mocked `fetch`: success returns `city`, missing `city` falls back to `locality`, total fail returns `null`, network error returns `null`.
- No existing `use-location.test.ts`; skipping unless requested.

## Files to Modify / Create

| File | Change |
|---|---|
| `src/services/reverse-geocoding-service.ts` *(new)* | API call + result normalization. |
| `src/services/reverse-geocoding-service.test.ts` *(new)* | Mocked fetch tests for success/partial/failure. |
| `src/composables/use-location.ts` | Enrich nameless locations via reverse geocode and persist. |
| `src/components/location-badge.vue` | Optional: friendlier placeholder while `name` is missing. |
| `CHANGELOG.md` | Note the behavior change. |
| `docs/decisions/ADR-003-reverse-geocoding-provider.md` *(optional)* | Document the provider choice. |

## Dependencies & Risks

- **External service (BigDataCloud)** — free tier, no key, but a third party. AGENTS.md says to ask before adding dependencies. Mitigations: failure is non-fatal; we cache the resolved name.
- **Privacy** — coordinates leave the app for a third-party host (in addition to Open-Meteo).
- **Stale cache** — once enriched + saved, the name persists. Acceptable.
- **No npm packages added.** Pure `fetch`.

## Out of Scope

- Letting the user pick from multiple nearby cities.
- Offline / on-device geocoding.
- Refreshing the name on re-detection.

## Complexity

**Small.** New service (~30 LOC) + tests, one helper in the composable, optional one-line UI tweak.

## Open Questions

1. OK to add BigDataCloud as a network dependency? (Alternatives: Nominatim, or Approach C with no API.)
2. Fallback text while resolving: `"📍 Detecting city…"` or keep coordinates?
3. Re-check manually-entered locations? Plan says no — they already have curated names from Open-Meteo.
4. Write an ADR for the provider choice?
