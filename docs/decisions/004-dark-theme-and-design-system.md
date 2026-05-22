# ADR-004: Dark Theme and Centralized Design System

**Status:** Accepted
**Date:** 2026-05-22
**Decision Makers:** Mario

## Context

The UI accumulated decorative emoji (🏃 in the page title, 📍 on the
location badge, weather emoji on metric pills, ⚠️ on errors, ↻ on the
refresh button) and read more playful than the project intends. Design
tokens lived ad-hoc inside `src/App.vue`'s `<style>` block and were
re-referenced by ad-hoc names from each component. There was no shared
icon system and no documented visual language for future contributors
(human or agent) to follow.

The request: remove the emoji, make the app look elegant, adopt dark mode,
and establish a design pattern library to be used going forward.

## Options Considered

1. **Hand-rolled inline SVG icon set + dark-only tokens in CSS variables
   (chosen).** Zero new dependencies. ~9 small icons covering the current
   surface. Tokens centralized in `src/styles/tokens.css` and consumed via
   `var(--…)`. Single brand accent (cyan) for focus and primary CTA only.
2. **Add `lucide-vue-next` for icons.** Polished, consistent set, but
   `AGENTS.md` requires explicit user approval before adding dependencies,
   and the small surface (9 icons) doesn't justify the runtime cost.
3. **Strip icons entirely.** Cleanest, but condition badges devolve into a
   wall of unlabeled numbers; readability drops.
4. **Dark + light with `prefers-color-scheme`.** Doubles the token surface
   and complicates color-mix math. Out of scope for "use a dark mode".

## Decision

Adopt Option 1.

- All visual tokens live in [`src/styles/tokens.css`](../../src/styles/tokens.css)
  and are imported once from `src/main.ts`.
- Components reference tokens by name (`var(--color-surface)`, etc.) and
  never hard-code values.
- A small SVG icon system lives at `src/components/icon/` with a strict
  `IconName` union — adding an icon requires touching one file.
- The palette is dark-only. A single cyan accent (`--color-accent`) is the
  only non-rating brand color and is reserved for focus rings, the primary
  CTA, and the location pin.
- All visual rules and component conventions are documented in
  [`docs/design-system.md`](../design-system.md). Future UI work must read
  and conform to that file.
- Legacy aliases (`--color-card-bg`, `--color-great`, `--radius`, …) are
  preserved in `tokens.css` so older components compile during incremental
  migration. New code should prefer canonical names.

## Consequences

- The UI is visually quieter and conveys "running tool" rather than "kids'
  game".
- New components have a single, machine-checkable visual contract: read
  `design-system.md`, use tokens, use `<Icon>`.
- Adding a new color, radius, or icon is a deliberate, documented act.
- Light mode is now a future addition rather than a free side-effect; the
  token surface is structured to support it without component changes.
- Existing tests are unaffected — all 150 still pass.
