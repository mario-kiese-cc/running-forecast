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
  | "sliders"
  | "alert"
  // Run-type icons — see src/services/run-type.ts.
  | "footprint"
  | "road"
  | "stopwatch"
  | "bolt"
  | "leaf"
  // View-mode toggle icons — see src/components/view-mode-toggle.vue.
  | "list"
  | "grid";

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
  sliders:
    '<path d="M4 7h10"/>' +
    '<path d="M18 7h2"/>' +
    '<circle cx="16" cy="7" r="2"/>' +
    '<path d="M4 17h2"/>' +
    '<path d="M10 17h10"/>' +
    '<circle cx="8" cy="17" r="2"/>',
  alert:
    '<path d="M12 4 2.5 20h19L12 4Z"/>' +
    '<path d="M12 10v4"/>' +
    '<path d="M12 17.5h0.01"/>',
  // Easy — stylised footprint (sole + four toe pads).
  footprint:
    '<path d="M9 13c0 4 1 6 3 6s3-2 3-6c0-3-1-5-3-5s-3 2-3 5Z"/>' +
    '<circle cx="7.5" cy="7.5" r="1"/>' +
    '<circle cx="10.5" cy="5.5" r="1"/>' +
    '<circle cx="13.5" cy="5.5" r="1"/>' +
    '<circle cx="16.5" cy="7" r="1"/>',
  // Long — road receding to the horizon.
  road:
    '<path d="M3 12h18"/>' +
    '<path d="M9 20 10.5 12"/>' +
    '<path d="M15 20 13.5 12"/>' +
    '<path d="M12 14v2"/>' +
    '<path d="M12 18v2"/>',
  // Tempo — stopwatch face with crown and hand.
  stopwatch:
    '<path d="M10 3h4"/>' +
    '<path d="M12 3v2"/>' +
    '<circle cx="12" cy="14" r="7"/>' +
    '<path d="M12 14 15 11"/>',
  // Intervals — lightning bolt.
  bolt:
    '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>',
  // Recovery — leaf with central vein.
  leaf:
    '<path d="M20 4c-9 0-15 5-15 12 0 2 1 4 3 4 7 0 12-6 12-16Z"/>' +
    '<path d="M20 4 8 16"/>',
  // Timeline view — stacked rows.
  list:
    '<path d="M8 6h12"/>' +
    '<path d="M8 12h12"/>' +
    '<path d="M8 18h12"/>' +
    '<path d="M4 6h0.01"/>' +
    '<path d="M4 12h0.01"/>' +
    '<path d="M4 18h0.01"/>',
  // Week view — grid of cells.
  grid:
    '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
    '<path d="M3 9h18"/>' +
    '<path d="M3 15h18"/>' +
    '<path d="M9 3v18"/>' +
    '<path d="M15 3v18"/>',
};
