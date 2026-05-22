<script setup lang="ts">
import type { DayForecast } from "../services/slot-builder";
import { formatWindowRange } from "../services/format-window";
import TimeSlotCard from "./time-slot-card.vue";
import Icon from "./icon/icon.vue";

const props = defineProps<{
  forecasts: DayForecast[];
  today: string;
}>();
</script>

<template>
  <div class="timeline">
    <section
      v-for="day in props.forecasts"
      :key="day.date"
      class="timeline__day"
    >
      <h2 class="timeline__day-label">{{ day.label }}</h2>

      <!-- Best windows summary -->
      <div
        v-if="day.bestWindows.length > 0"
        class="timeline__best"
      >
        <p class="timeline__best-title">Best time to run</p>
        <p v-if="day.bestWindowsAreLateNight" class="timeline__best-hint">
          <Icon name="moon" :size="14" />
          <span>Only late-night windows look good today.</span>
        </p>
        <div
          v-for="(window, index) in day.bestWindows.slice(0, 3)"
          :key="index"
          class="timeline__best-window"
          :class="`timeline__best-window--${window.rating}`"
        >
          <span class="timeline__best-range">
            {{ formatWindowRange(window.startTime, window.endTime, props.today) }}
          </span>
          <span class="timeline__best-score">
            {{ window.averageScore }} · {{ window.hours }}h
          </span>
        </div>
      </div>

      <!-- Hourly cards -->
      <div class="timeline__slots">
        <TimeSlotCard
          v-for="slot in day.slots"
          :key="slot.time"
          :slot="slot"
        />
      </div>
    </section>

    <p v-if="props.forecasts.length === 0" class="timeline__empty">
      No forecast data available.
    </p>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.timeline__day-label {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-strong);
  color: var(--color-text);
  margin-bottom: var(--space-3);
}

.timeline__best {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
}

.timeline__best-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-strong);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.timeline__best-hint {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.timeline__best-window {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-1);
  border: 1px solid transparent;
}

.timeline__best-window--great {
  background: color-mix(in srgb, var(--color-rating-great) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-rating-great) 28%, transparent);
}

.timeline__best-window--good {
  background: color-mix(in srgb, var(--color-rating-good) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-rating-good) 24%, transparent);
}

.timeline__best-window--fair {
  background: color-mix(in srgb, var(--color-rating-fair) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-rating-fair) 24%, transparent);
}

.timeline__best-window--avoid {
  background: color-mix(in srgb, var(--color-rating-avoid) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-rating-avoid) 24%, transparent);
}

.timeline__best-range {
  font-weight: var(--font-weight-strong);
  font-size: var(--font-size-base);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.timeline__best-score {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.timeline__slots {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.timeline__empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: var(--space-8) 0;
}
</style>
