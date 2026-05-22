<script setup lang="ts">
import type { DayForecast } from "../services/slot-builder";
import { formatWindowRange } from "../services/format-window";
import TimeSlotCard from "./time-slot-card.vue";

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
          🌙 Only late-night windows look good today.
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
  gap: 24px;
}

.timeline__day-label {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.timeline__best {
  background: var(--color-card-bg);
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-bottom: 12px;
}

.timeline__best-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
  margin-bottom: 8px;
}

.timeline__best-hint {
  font-size: 0.8125rem;
  color: var(--color-muted);
  margin-bottom: 8px;
  font-style: italic;
}

.timeline__best-window {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.timeline__best-window--great {
  background: color-mix(in srgb, var(--color-great) 12%, transparent);
}

.timeline__best-window--good {
  background: color-mix(in srgb, var(--color-good) 12%, transparent);
}

.timeline__best-window--fair {
  background: color-mix(in srgb, var(--color-fair) 12%, transparent);
}

.timeline__best-window--avoid {
  background: color-mix(in srgb, var(--color-avoid) 12%, transparent);
}

.timeline__best-range {
  font-weight: 600;
  font-size: 0.9375rem;
}

.timeline__best-score {
  font-size: 0.8125rem;
  color: var(--color-muted);
}

.timeline__slots {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline__empty {
  text-align: center;
  color: var(--color-muted);
  padding: 40px 0;
}
</style>
