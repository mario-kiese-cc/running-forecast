<script setup lang="ts">
import type { ScoreRating } from "../types";

interface LegendItem {
  readonly rating: ScoreRating;
  readonly label: string;
}

const ITEMS: ReadonlyArray<LegendItem> = [
  { rating: "great", label: "Great" },
  { rating: "good", label: "Good" },
  { rating: "fair", label: "Fair" },
  { rating: "avoid", label: "Avoid" },
];
</script>

<template>
  <ul class="legend" aria-label="Score legend">
    <li v-for="item in ITEMS" :key="item.rating" class="legend__item">
      <span
        class="legend__swatch"
        :class="`legend__swatch--${item.rating}`"
        aria-hidden="true"
      />
      <span class="legend__label">{{ item.label }}</span>
    </li>
  </ul>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  list-style: none;
  margin-top: var(--space-4);
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.legend__swatch {
  width: 14px;
  height: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.legend__swatch--great {
  background: var(--color-rating-great);
}
.legend__swatch--good {
  background: var(--color-rating-good);
}
.legend__swatch--fair {
  background: var(--color-rating-fair);
}
.legend__swatch--avoid {
  background: var(--color-rating-avoid);
}
</style>
