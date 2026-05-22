<script setup lang="ts">
import { computed } from "vue";
import type { TimeSlot } from "../types";
import { isUnsociableHour } from "../services/night-hours";
import ScoreBar from "./score-bar.vue";
import ConditionBadge from "./condition-badge.vue";

const props = defineProps<{
  slot: TimeSlot;
}>();

const isNight = computed(() => isUnsociableHour(props.slot.time));

/**
 * Format an ISO time string to a display hour, e.g. "2026-05-21T14:00" → "14:00"
 */
function formatHour(time: string): string {
  return time.slice(11, 16);
}

function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

function formatWind(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

function formatHumidity(percent: number): string {
  return `${Math.round(percent)}%`;
}

function formatPrecip(probability: number): string {
  return `${Math.round(probability)}%`;
}
</script>

<template>
  <div
    class="slot-card"
    :class="[
      `slot-card--${props.slot.rating}`,
      { 'slot-card--night': isNight },
    ]"
  >
    <div class="slot-card__header">
      <span class="slot-card__time">{{ formatHour(props.slot.time) }}</span>
      <span class="slot-card__score">{{ props.slot.score }}</span>
    </div>

    <ScoreBar :score="props.slot.score" :rating="props.slot.rating" />

    <div class="slot-card__conditions">
      <ConditionBadge
        icon="thermometer"
        label="Feels like"
        :value="formatTemp(props.slot.conditions.apparentTemperatureCelsius)"
      />
      <ConditionBadge
        icon="rain"
        label="Rain chance"
        :value="formatPrecip(props.slot.conditions.precipitationProbability)"
      />
      <ConditionBadge
        icon="wind"
        label="Wind"
        :value="formatWind(props.slot.conditions.windSpeedKmh)"
      />
      <ConditionBadge
        icon="droplet"
        label="Humidity"
        :value="formatHumidity(props.slot.conditions.relativeHumidity)"
      />
      <ConditionBadge
        v-if="props.slot.aqi !== undefined"
        icon="haze"
        label="Air quality"
        :value="String(props.slot.aqi)"
      />
    </div>
  </div>
</template>

<style scoped>
.slot-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.slot-card--great {
  border-left-color: var(--color-rating-great);
}

.slot-card--good {
  border-left-color: var(--color-rating-good);
}

.slot-card--fair {
  border-left-color: var(--color-rating-fair);
}

.slot-card--avoid {
  border-left-color: var(--color-rating-avoid);
}

/* Nighttime (21:00–05:59): muted so users don't focus on impractical hours. */
.slot-card--night {
  opacity: 0.55;
  border-left-color: var(--color-border);
}

.slot-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
}

.slot-card__time {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.slot-card__score {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-strong);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.slot-card__conditions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
</style>
