# Running Forecast — Design System

> The single source of truth for visual decisions. **All new UI must
> conform to this document.** When in doubt, change this document first and
> the components second.

## Status

Active. Established 2026-05-22 alongside the dark-theme refresh
(see [ADR-004](decisions/004-dark-theme-and-design-system.md)).

## Voice & visual principles

1. **Elegant over playful.** No decorative emoji in UI chrome — not in
   headers, buttons, labels, status messages, or hints. Where a glyph is
   genuinely helpful (e.g. compact metric pills), use an icon from
   `src/components/icon`.
2. **Dark-first.** The palette is tuned for a dark surface. Light mode is
   explicitly out of scope; if added later it will be a parallel layer of
   tokens, not a rewrite.
3. **Calm color.** One brand accent (cyan), four rating colors, neutrals.
   Don't introduce new hues — extend the existing scale.
4. **Sentence case.** "Set your location", not "Set Your Location".
5. **Tabular numerals** everywhere numbers can shift (times, temps, scores).
6. **Words first, icons second.** Icons accompany labels; they never carry
   the meaning alone.

## Tokens

All tokens live in [`src/styles/tokens.css`](../src/styles/tokens.css) and
are imported once from `src/main.ts`. Components reference them via
`var(--token)`. **Never hard-code a color, radius, or spacing value in a
component.**

### Color — surfaces

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0b0d10` | Page background |
| `--color-surface` | `#14181d` | Cards, badges, pills |
| `--color-surface-elevated` | `#1a1f25` | Hover states, nested surfaces |
| `--color-border` | `#232930` | Default hairline |
| `--color-border-strong` | `#2e353d` | Hover / focused hairline |

### Color — text

| Token | Use |
|---|---|
| `--color-text` | Primary body text |
| `--color-text-muted` | Secondary text, labels |
| `--color-text-subtle` | Placeholders, icon defaults |

### Color — rating

| Token | Meaning |
|---|---|
| `--color-rating-great` | Excellent running window |
| `--color-rating-good` | Good window |
| `--color-rating-fair` | Acceptable window |
| `--color-rating-avoid` | Poor conditions; also used for errors |

### Color — accent

| Token | Use |
|---|---|
| `--color-accent` | Focus ring, primary CTA background, location pin |
| `--color-accent-strong` | Primary CTA hover |
| `--color-accent-contrast` | Text on accent backgrounds |

Use the accent **only** for focus, the primary CTA, and the location pin.
Anywhere else it becomes visual noise.

### Spacing

4-px base: `--space-1` (4) · `--space-2` (8) · `--space-3` (12) ·
`--space-4` (16) · `--space-5` (20) · `--space-6` (24) · `--space-7` (32) ·
`--space-8` (48).

### Radii

`--radius-sm` (6) for inputs and small chips · `--radius-md` (10) for
cards · `--radius-lg` (14) for the location prompt and larger surfaces ·
`--radius-pill` for pills and the score-bar track.

### Typography

| Token | Size |
|---|---|
| `--font-size-xs` | 11 px — labels, source tags |
| `--font-size-sm` | 12 px — badge values, hints |
| `--font-size-base` | 14 px — body text |
| `--font-size-md` | 16 px — inputs, CTAs |
| `--font-size-lg` | 18 px — section headings |
| `--font-size-xl` | 20 px — prompt headings |
| `--font-size-2xl` | 24 px — page title |

Weights: `--font-weight-regular` (400), `--font-weight-medium` (500),
`--font-weight-strong` (600). **No bold (700)** — it reads heavy on dark.

### Motion

Use `var(--duration-fast) var(--ease-standard)` for color / border
transitions, `var(--duration-base) var(--ease-standard)` for layout changes
(width, opacity).

## Components

### Icon — `src/components/icon/icon.vue`

Generic SVG wrapper. Always pass a `name` from `IconName`. Decorative by
default (`aria-hidden`); pass `label` only when the icon stands alone.

```vue
<Icon name="thermometer" :size="14" />
<Icon name="alert" :size="16" label="Error" />
```

To add an icon: add a `<path>` snippet to `ICONS` in
[`icons.ts`](../src/components/icon/icons.ts) and extend the `IconName`
union. Keep the set small.

### Button — primary / secondary / ghost

- **Primary** — solid `--color-accent` background, `--color-accent-contrast`
  text, `--radius-sm`. One per surface.
- **Secondary** — transparent background, `--color-border` outline, body
  text. Used for Cancel and tertiary actions.
- **Ghost / pill** — transparent background, `--radius-pill`. Used for the
  toolbar refresh and the location-badge "Change" action.

### Card

`background: var(--color-surface)`, `border: 1px solid var(--color-border)`,
`border-radius: var(--radius-md)`, padding `var(--space-3) var(--space-4)`.
Rating cards add a 3-px left border in the rating color.

### Pill / Badge

`--radius-pill`, `--space-1`/`--space-2` padding, `--font-size-sm` or
`--font-size-xs`. Used for location, source tag, and metric badges.

### ScoreBar

6-px pill track, `--color-border` background, fill in the matching rating
color, transitions on width.

## Do / Don't

✅ **Do**
- Reference tokens (`var(--…)`) in every component style.
- Use sentence case in all user-facing text.
- Use an `Icon` for glyphs.
- Keep one primary CTA per surface.
- Use `tabular-nums` for any value that updates in place.

❌ **Don't**
- Use Unicode emoji in headers, labels, buttons, errors, hints.
- Introduce new colors without adding them to `tokens.css`.
- Use the accent color for body text or backgrounds outside CTA / focus.
- Use `font-weight: 700` or heavier — too heavy on dark surfaces.
- Hard-code pixel values for spacing or radii in components.

## Future work (intentionally deferred)

- Visible focus ring tokens applied across all interactive elements.
- `prefers-reduced-motion` overrides.
- Light-mode palette behind `prefers-color-scheme: light`.
- Component playground / Storybook.
