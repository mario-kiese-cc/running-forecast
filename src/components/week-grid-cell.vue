<script setup lang="ts">
import { computed } from "vue";
import type { WeekGridCell } from "../types";
import { isUnsociableHour } from "../services/night-hours";

const props = defineProps<{
  cell: WeekGridCell;
  dayLabel: string;
  /** True when this is the highest-scoring future cell of the week. */
  isBest: boolean;
  /** Roving-tabindex: only the active cell is in the tab order. */
  isTabStop: boolean;
}>();

const emit = defineEmits<{
  /** Pointer/keyboard focus entered an interactive cell. */
  activate: [cell: WeekGridCell, element: HTMLElement];
  /** Pointer/keyboard focus left this cell. */
  deactivate: [];
  /** User chose this cell (click / Enter / Space) to deep-link. */
  select: [cell: WeekGridCell];
}>();

/** Only future cells with data are interactive. */
const isInteractive = computed(() => props.cell.slot !== null);

const isNight = computed(() => isUnsociableHour(props.cell.time));

const hourLabel = computed(
  () => `${String(props.cell.hourOfDay).padStart(2, "0")}:00`,
);

/**
 * Structured screen-reader label (NFR-2). Empty for non-interactive cells
 * so they are skipped by assistive tech navigation.
 */
const ariaLabel = computed(() => {
  const slot = props.cell.slot;
  if (slot === null) return undefined;
  const temp = Math.round(slot.conditions.apparentTemperatureCelsius);
  const best = props.isBest ? ", best of the week" : "";
  return `${props.dayLabel} ${hourLabel.value}, score ${slot.score}, ${slot.rating}, ${temp} degrees${best}`;
});

function handleFocus(event: FocusEvent): void {
  if (!isInteractive.value) return;
  emit("activate", props.cell, event.currentTarget as HTMLElement);
}

function handlePointerEnter(event: PointerEvent): void {
  if (!isInteractive.value) return;
  emit("activate", props.cell, event.currentTarget as HTMLElement);
}

function handleSelect(): void {
  if (!isInteractive.value) return;
  emit("select", props.cell);
}
</script>

<template>
  <div
    class="cell"
    :class="[
      props.cell.slot ? `cell--${props.cell.slot.rating}` : 'cell--empty',
      {
        'cell--past': props.cell.isPast,
        'cell--night': isNight && isInteractive,
        'cell--best': props.isBest,
        'cell--interactive': isInteractive,
      },
    ]"
    role="gridcell"
    :tabindex="isInteractive && props.isTabStop ? 0 : -1"
    :aria-label="ariaLabel"
    :aria-disabled="isInteractive ? undefined : true"
    :data-time="props.cell.time"
    @focus="handleFocus"
    @blur="emit('deactivate')"
    @pointerenter="handlePointerEnter"
    @pointerleave="emit('deactivate')"
    @click="handleSelect"
    @keydown.enter.prevent="handleSelect"
    @keydown.space.prevent="handleSelect"
  >
    <span v-if="isNight && isInteractive" class="cell__night" aria-hidden="true"
      >·</span
    >
  </div>
</template>

<style scoped>
.cell {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: var(--cell-size, 24px);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  border: 1px solid transparent;
}

.cell--interactive {
  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

.cell--interactive:hover {
  transform: scale(1.08);
  z-index: 1;
}

.cell--interactive:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent);
  z-index: 2;
}

/* Rating fills — same palette as the score bar / rating cards. */
.cell--great {
  background: var(--color-rating-great);
}
.cell--good {
  background: var(--color-rating-good);
}
.cell--fair {
  background: var(--color-rating-fair);
}
.cell--avoid {
  background: var(--color-rating-avoid);
}

/* Empty = out-of-horizon future hour with no data. */
.cell--empty {
  background: var(--color-surface);
  border-color: var(--color-border);
  opacity: 0.4;
}

/* Past hours: de-emphasised and non-interactive (FR-4). */
.cell--past {
  background: var(--color-surface);
  opacity: 0.3;
}

/* Night: subtle desaturation + glyph (FR-5). */
.cell--night {
  filter: saturate(0.6) brightness(0.85);
}

.cell__night {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  color: var(--color-bg);
  opacity: 0.7;
}

/* Best future cell ring (OQ-5). */
.cell--best {
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent);
}

@media (prefers-reduced-motion: reduce) {
  .cell--interactive,
  .cell--interactive:hover {
    transition: none;
    transform: none;
  }
}
</style>
