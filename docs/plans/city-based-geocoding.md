# Plan: City-Based Geocoding

## Status: Approved

**Date:** 2026-05-21

## Goal

Replace manual lat/lon input with a single city name field. Geocode to coordinates via Open-Meteo Geocoding API.

## API

Open-Meteo Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=Vienna`
- Free, no API key, consistent with existing weather API choice.

## Files

| Action | File | What |
|--------|------|------|
| Create | `src/services/geocoding-service.ts` | `geocodeCity()` — fetch + parse candidates |
| Create | `src/services/geocoding-service.test.ts` | Mock fetch tests |
| Modify | `src/components/location-prompt.vue` | Single city field, candidate picker |

## UX Flow

1. User types city name → submits
2. 1 result → auto-select
3. Multiple results → show picker with city + country
4. 0 results → "City not found" error

## Complexity: Small
