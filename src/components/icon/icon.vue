<script setup lang="ts">
import { computed } from "vue";
import { ICONS, type IconName } from "./icons";

/**
 * Generic SVG icon. Uses `currentColor` so the consumer controls color via
 * the surrounding text color (or an explicit `color:` style).
 *
 * `aria-hidden` defaults to true because icons in this app are decorative —
 * the adjacent label carries the meaning. Pass a `label` to expose an
 * accessible name when the icon stands alone.
 */
const props = withDefaults(
  defineProps<{
    name: IconName;
    /** Pixel size; sets both width and height. */
    size?: number;
    /** Stroke width on the 24×24 viewBox. */
    strokeWidth?: number;
    /** Accessible label. When provided, the icon is exposed to AT. */
    label?: string;
  }>(),
  { size: 16, strokeWidth: 1.5 },
);

const path = computed(() => ICONS[props.name]);
const isLabeled = computed(() => typeof props.label === "string" && props.label.length > 0);
</script>

<template>
  <svg
    class="icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="isLabeled ? 'img' : undefined"
    :aria-label="isLabeled ? props.label : undefined"
    :aria-hidden="isLabeled ? undefined : 'true'"
    focusable="false"
    v-html="path"
  />
</template>

<style scoped>
.icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
