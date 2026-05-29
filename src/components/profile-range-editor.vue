<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  /** Ideal apparent-temperature range, °C. */
  range: { low: number; high: number };
  /** Darkness tolerance score, 0–100. */
  darknessScore: number;
}>();

const emit = defineEmits<{
  "update-range": [range: { low: number; high: number }];
  "update-darkness": [value: number];
}>();

// Mirror the range locally so dragging one handle past the other doesn't
// snap mid-gesture; we commit the clamped value on `change`, not `input`.
const localLow = ref(props.range.low);
const localHigh = ref(props.range.high);

watch(
  () => props.range,
  (next) => {
    localLow.value = next.low;
    localHigh.value = next.high;
  },
);

function commitRange(): void {
  const low = Math.min(localLow.value, localHigh.value);
  const high = Math.max(localLow.value, localHigh.value);
  emit("update-range", { low, high });
}

function handleDarknessInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update-darkness", Number(target.value));
}
</script>

<template>
  <div class="profile-range-editor">
    <section>
      <h3 class="profile-range-editor__title">Ideal temperature</h3>
      <p class="profile-range-editor__hint">
        Apparent-temperature range that scores 100. Outside this range the
        score decays.
      </p>
      <label class="profile-range-editor__row">
        <span class="profile-range-editor__label">Low</span>
        <input
          v-model.number="localLow"
          type="range"
          min="-10"
          max="25"
          step="1"
          @change="commitRange"
        />
        <span class="profile-range-editor__value">{{ localLow }} °C</span>
      </label>
      <label class="profile-range-editor__row">
        <span class="profile-range-editor__label">High</span>
        <input
          v-model.number="localHigh"
          type="range"
          min="-10"
          max="25"
          step="1"
          @change="commitRange"
        />
        <span class="profile-range-editor__value">{{ localHigh }} °C</span>
      </label>
    </section>

    <section>
      <h3 class="profile-range-editor__title">Darkness tolerance</h3>
      <p class="profile-range-editor__hint">
        Score applied to hours after sunset and before sunrise. Higher is
        more tolerant.
      </p>
      <label class="profile-range-editor__row">
        <span class="profile-range-editor__label">After dark</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          :value="darknessScore"
          @input="handleDarknessInput"
        />
        <span class="profile-range-editor__value">{{ darknessScore }}</span>
      </label>
    </section>
  </div>
</template>

<style scoped>
.profile-range-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.profile-range-editor__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-strong);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.profile-range-editor__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.profile-range-editor__row {
  display: grid;
  grid-template-columns: 60px 1fr 60px;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-2);
}

.profile-range-editor__label {
  color: var(--color-text-muted);
}

.profile-range-editor__value {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

input[type="range"] {
  accent-color: var(--color-accent);
  width: 100%;
}
</style>
