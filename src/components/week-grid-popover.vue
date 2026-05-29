<script setup lang="ts">
import { computed } from "vue";
import type { TimeSlot } from "../types";
import { isUnsociableHour } from "../services/night-hours";
import ScoreBar from "./score-bar.vue";
import ConditionBadge from "./condition-badge.vue";

const props = defineProps<{
  slot: TimeSlot;
  dayLabel: string;
}>();

const isNight = computed(() => isUnsociableHour(props.slot.time));

const hour = computed(() => props.slot.time.slice(11, 16));

function round(value: number): string {
  return String(Math.round(value));
}
</script>

<template>
  <div
    class="grid-popover"
    :class="`grid-popover--${props.slot.rating}`"
    role="tooltip"
  >
    <div class="grid-popover__header">
      <span class="grid-popover__time">
        {{ props.dayLabel }} {{ hour }}
      </span>
      <span class="grid-popover__score">{{ props.slot.score }}</span>
    </div>

    <ScoreBar :score="props.slot.score" :rating="props.slot.rating" />

    <p class="grid-popover__rating">
      {{ props.slot.rating }}
      <span v-if="isNight" class="grid-popover__night">· night</span>
    </p>

    <div class="grid-popover__conditions">
      <ConditionBadge
        icon="thermometer"
        label="Feels like"
        :value="`${round(props.slot.conditions.apparentTemperatureCelsius)}°`"
      />
      <ConditionBadge
        icon="rain"
        label="Rain chance"
        :value="`${round(props.slot.conditions.precipitationProbability)}%`"
      />
      <ConditionBadge
        icon="wind"
        label="Wind"
        :value="`${round(props.slot.conditions.windSpeedKmh)} km/h`"
      />
    </div>
  </div>
</template>

<style scoped>
.grid-popover {
  width: 13rem;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-strong);
  border-left: 3px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.4);
}

.grid-popover--great {
  border-left-color: var(--color-rating-great);
}
.grid-popover--good {
  border-left-color: var(--color-rating-good);
}
.grid-popover--fair {
  border-left-color: var(--color-rating-fair);
}
.grid-popover--avoid {
  border-left-color: var(--color-rating-avoid);
}

.grid-popover__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
}

.grid-popover__time {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-strong);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.grid-popover__score {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-strong);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.grid-popover__rating {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.grid-popover__night {
  text-transform: none;
}

.grid-popover__conditions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-3);
}
</style>
