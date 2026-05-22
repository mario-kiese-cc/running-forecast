<script setup lang="ts">
import type { ScoreRating } from "../types";

const props = defineProps<{
  score: number;
  rating: ScoreRating;
}>();

const ratingColors: Record<ScoreRating, string> = {
  great: "var(--color-great)",
  good: "var(--color-good)",
  fair: "var(--color-fair)",
  avoid: "var(--color-avoid)",
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
  gap: 8px;
}

.score-bar__track {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.score-bar__fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.score-bar__label {
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}
</style>
