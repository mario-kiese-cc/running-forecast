# ADR-003: Reverse-Geocoding Provider — BigDataCloud

**Status:** Accepted
**Date:** 2026-05-22
**Decision Makers:** Mario

## Context

The `LocationBadge` should display a human-readable city name for locations obtained via browser geolocation (which only yields raw coordinates). Open-Meteo, our primary geo/weather provider (see ADR-002), exposes a **forward** geocoder only (`name → coords`) — no reverse lookup. We therefore need a second service.

Requirements:
- **No API key.** Aligns with ADR-002's rationale ("no key removes a whole class of problems").
- **CORS-enabled** for direct browser use; we have no backend.
- **Free for typical client-side use** without account creation.
- **Coordinate → city/country** with reasonable global coverage.

## Options Considered

### 1. BigDataCloud — *Free Client Reverse Geocoding API*
- Endpoint: `https://api.bigdatacloud.net/data/reverse-geocode-client`
- No API key, no account, CORS-enabled, intended for browser use.
- Returns `city`, `locality`, `principalSubdivision`, `countryName`, etc.
- Free tier explicitly covers the client-side endpoint.

### 2. Nominatim (OpenStreetMap)
- Free, no key.
- **Usage policy** requires a custom `User-Agent` and limits to ~1 req/s. Browsers cannot set `User-Agent`, putting us in policy gray zone.
- Heavy responses; less browser-friendly.

### 3. GeoNames
- Free, but requires user account + username param.
- Adds a configuration step we wanted to avoid (see ADR-002).

### 4. Bundle a city dataset client-side
- Largest cities + Haversine nearest-neighbour.
- No network call, but ships ~hundreds of KB of data and only covers populated places coarsely.

## Decision

**Use BigDataCloud's free reverse-geocoding client endpoint.**

Rationale:
- Only option that satisfies all three constraints (no key, CORS, no account) cleanly.
- Open-Meteo + BigDataCloud is a thin two-provider footprint, both keyless.
- Failure is non-fatal: `reverseGeocode` returns `null` and the badge falls back to a placeholder, so an outage at BigDataCloud never blocks the running forecast.

## Consequences

### Positive
- Detected locations now display real city names.
- No secrets, no `.env`, no rate-limit key management.
- Results are cached in `localStorage` (via `saveLocation`), so subsequent page loads don't re-query.

### Negative / Trade-offs
- Adds a third party that sees the user's coordinates (in addition to Open-Meteo). Documented; acceptable for this use case.
- BigDataCloud's free tier carries no SLA. Mitigated by non-fatal failure handling.
- Label quality can be coarse outside major cities — we explicitly fall back through `city → locality → principalSubdivision`.

## Revisit If
- BigDataCloud removes or rate-limits the free client endpoint → consider bundling a city dataset (option 4) or switching to Nominatim via a thin proxy.
- We add a backend → could route through it and use Nominatim with a compliant `User-Agent`.
