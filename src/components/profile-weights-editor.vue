<script setup lang="ts">
import { computed } from "vue";
import type { ScoringWeights } from "../types";

const props = defineProps<{
  weights: ScoringWeights;
}>();

const emit = defineEmits<{
  update: [key: keyof ScoringWeights, value: number];
}>();

const FACTORS: ReadonlyArray<{ key: keyof ScoringWeights; label: string }> = [
  { key: "precipitation", label: "Precipitation" },
  { key: "temperature", label: "Temperature" },
  { key: "wind", label: "Wind" },
  { key: "humidity", label: "Humidity" },
  { key: "airQuality", label: "Air quality" },
  { key: "daylight", label: "Daylight" },
];

const display = computed(() => ({
  precipitation: Math.round(props.weights.precipitation * 100),
  temperature: Math.round(props.weights.temperature * 100),
  wind: Math.round(props.weights.wind * 100),
  humidity: Math.round(props.weights.humidity * 100),
  airQuality: Math.round(props.weights.airQuality * 100),
  daylight: Math.round(props.weights.daylight * 100),
}));

function handleInput(key: keyof ScoringWeights, event: Event): void {
  const target = event.target as HTMLInputElement;
  // Slider 0–100 → 0–1; composable re-normalises relative to other weights.
  emit("update", key, Number(target.value) / 100);
}
</script>

<template>
  <div class="profile-weights-editor">
    <label
      v-for="factor in FACTORS"
      :key="factor.key"
      class="profile-weights-editor__row"
    >
      <span class="profile-weights-editor__label">{{ factor.label }}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="display[factor.key]"
        :aria-valuetext="`${display[factor.key]} percent`"
        @input="handleInput(factor.key, $event)"
      />
      <span class="profile-weights-editor__value">
        {{ display[factor.key] }}%
      </span>
    </label>
  </div>
</template>

<style scoped>
.profile-weights-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.profile-weights-editor__row {
  display: grid;
  grid-template-columns: 100px 1fr 48px;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
}

.profile-weights-editor__label {
  color: var(--color-text-muted);
}

.profile-weights-editor__value {
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--color-text);
}

input[type="range"] {
  accent-color: var(--color-accent);
  width: 100%;
}
</style>
