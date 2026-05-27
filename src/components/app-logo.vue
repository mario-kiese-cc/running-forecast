<script setup lang="ts">
/**
 * App brand mark — a stadium-track outline.
 *
 * Mirrors `public/favicon.svg` but adapted for in-app use:
 *  - colors come from design tokens (no media queries), since the app is
 *    dark-themed throughout per ADR-004;
 *  - sized via the `size` prop (pixel height/width) so the consumer
 *    controls dimensions, matching the `<Icon>` component's API.
 *
 * Kept as a dedicated component (not an entry in `icons.ts`) because the
 * mark uses two distinct colors, which doesn't fit the single-stroke
 * `<Icon>` model.
 */
withDefaults(
  defineProps<{
    /** Pixel size; sets both width and height. */
    size?: number;
    /** Accessible label. Decorative by default — pair with adjacent text. */
    label?: string;
  }>(),
  { size: 32 },
);
</script>

<template>
  <svg
    class="app-logo"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <!-- Outer track: pill outline -->
    <rect
      class="app-logo__track"
      x="3"
      y="9"
      width="26"
      height="14"
      rx="7"
      ry="7"
      stroke-width="3"
    />
    <!-- Inner lane: accent-colored inset -->
    <rect
      class="app-logo__lane"
      x="8"
      y="13"
      width="16"
      height="6"
      rx="3"
      ry="3"
      stroke-width="1.75"
    />
  </svg>
</template>

<style scoped>
.app-logo {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}

.app-logo__track {
  stroke: var(--color-text);
}

.app-logo__lane {
  stroke: var(--color-accent);
  opacity: 0.85;
}
</style>
