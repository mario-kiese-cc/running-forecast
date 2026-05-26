/**
 * Inline SVG path data for the project's icon set.
 *
 * Each icon is designed on a 24×24 viewBox using stroke-based rendering so
 * sizing and color are controlled by the consumer via `currentColor`.
 *
 * Style: 1.5-px stroke, round caps, round joins — matches the "elegant,
 * plain" voice of the design system. Avoid filled shapes here; the
 * `<Icon>` wrapper sets `fill="none"`.
 *
 * Add new icons by adding an entry to ICONS and an `IconName` union member.
 * Keep the path list small: a large icon set is a smell that we're using
 * icons where words would do.
 */

export type IconName =
  | "thermometer"
  | "droplet"
  | "wind"
  | "rain"
  | "haze"
  | "location"
  | "crosshair"
  | "moon"
  | "refresh"
  | "alert";

/** Inline SVG path content. Strings are rendered verbatim inside `<svg>`. */
export const ICONS: Record<IconName, string> = {
  thermometer:
    '<path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z"/>' +
    '<path d="M12 9v6"/>',
  droplet:
    '<path d="M12 3.5s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z"/>',
  wind:
    '<path d="M3 8h11a3 3 0 1 0-3-3"/>' +
    '<path d="M3 12h16a3 3 0 1 1-3 3"/>' +
    '<path d="M3 16h9"/>',
  rain:
    '<path d="M16 13a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A4 4 0 0 0 5 14"/>' +
    '<path d="M8 17v3"/>' +
    '<path d="M12 17v3"/>' +
    '<path d="M16 17v3"/>',
  haze:
    '<path d="M3 7h18"/>' +
    '<path d="M3 12h18"/>' +
    '<path d="M3 17h18"/>',
  location:
    '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z"/>' +
    '<circle cx="12" cy="9" r="2.5"/>',
  crosshair:
    '<circle cx="12" cy="12" r="8"/>' +
    '<circle cx="12" cy="12" r="2.5"/>' +
    '<path d="M12 2v3"/>' +
    '<path d="M12 19v3"/>' +
    '<path d="M2 12h3"/>' +
    '<path d="M19 12h3"/>',
  moon:
    '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  refresh:
    '<path d="M20 12a8 8 0 1 1-2.34-5.66"/>' +
    '<path d="M20 4v4h-4"/>',
  alert:
    '<path d="M12 4 2.5 20h19L12 4Z"/>' +
    '<path d="M12 10v4"/>' +
    '<path d="M12 17.5h0.01"/>',
};
