<script setup lang="ts">
import type { ScoreRating } from "../types";

const props = defineProps<{
  score: number;
  rating: ScoreRating;
}>();

const ratingColors: Record<ScoreRating, string> = {
  great: "var(--color-rating-great)",
  good: "var(--color-rating-good)",
  fair: "var(--color-rating-fair)",
  avoid: "var(--color-rating-avoid)",
};

const ratingLabels: Record<ScoreRating, string> = {
  great: "Great",
  good: "Good",
  fair: "Fair",
  avoid: "Avoid",
};
</script>

<template>
  <div class="score-bar">
    <div class="score-bar__track">
      <div
        class="score-bar__fill"
        :style="{
          width: `${props.score}%`,
          backgroundColor: ratingColors[props.rating],
        }"
      />
    </div>
    <span
      class="score-bar__label"
      :style="{ color: ratingColors[props.rating] }"
    >
      {{ ratingLabels[props.rating] }}
    </span>
  </div>
</template>

<style scoped>
.score-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.score-bar__track {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.score-bar__fill {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width var(--duration-base) var(--ease-standard);
}

.score-bar__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-strong);
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
