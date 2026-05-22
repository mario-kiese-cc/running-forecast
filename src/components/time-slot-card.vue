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
        icon="🌡"
        label="Feels like"
        :value="formatTemp(props.slot.conditions.apparentTemperatureCelsius)"
      />
      <ConditionBadge
        icon="🌧"
        label="Rain chance"
        :value="formatPrecip(props.slot.conditions.precipitationProbability)"
      />
      <ConditionBadge
        icon="💨"
        label="Wind"
        :value="formatWind(props.slot.conditions.windSpeedKmh)"
      />
      <ConditionBadge
        icon="💧"
        label="Humidity"
        :value="formatHumidity(props.slot.conditions.relativeHumidity)"
      />
      <ConditionBadge
        v-if="props.slot.aqi !== undefined"
        icon="🌫"
        label="Air quality"
        :value="String(props.slot.aqi)"
      />
    </div>
  </div>
</template>

<style scoped>
.slot-card {
  background: var(--color-card-bg);
  border-radius: var(--radius);
  padding: 12px 16px;
  border-left: 4px solid var(--color-border);
}

.slot-card--great {
  border-left-color: var(--color-great);
}

.slot-card--good {
  border-left-color: var(--color-good);
}

.slot-card--fair {
  border-left-color: var(--color-fair);
}

.slot-card--avoid {
  border-left-color: var(--color-avoid);
}

/* Nighttime (21:00–05:59): muted so users don't focus on impractical hours. */
.slot-card--night {
  opacity: 0.5;
  border-left-color: var(--color-border);
}

.slot-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.slot-card__time {
  font-size: 1.125rem;
  font-weight: 600;
}

.slot-card__score {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-muted);
}

.slot-card__conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
</style>
