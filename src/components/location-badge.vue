<script setup lang="ts">
import { computed } from "vue";
import type { UserLocation } from "../types";
import Icon from "./icon/icon.vue";

const props = withDefaults(
  defineProps<{
    location: UserLocation;
    /** True while a user-triggered re-detection is in flight. */
    isDetecting?: boolean;
    /** Error message from the most recent detection attempt, if any. */
    detectionError?: string | null;
  }>(),
  { isDetecting: false, detectionError: null },
);

defineEmits<{
  change: [];
  detect: [];
}>();

const displayName = computed(() => {
  if (props.location.name) return props.location.name;
  // No name yet — reverse-geocoding is in flight. Show a placeholder rather
  // than raw coordinates so the badge reads like a location, not a debug value.
  return "Detecting city…";
});

const isResolvingCity = computed(() => !props.location.name);

const sourceLabel = computed(() => {
  if (props.location.source === "manual") return "manual";
  if (props.location.source === "detected") return "detected";
  return null;
});
</script>

<template>
  <div class="location-badge">
    <div class="location-badge__row">
      <span class="location-badge__pill">
        <Icon name="location" :size="14" class="location-badge__icon" />
        <span
          class="location-badge__name"
          :class="{ 'location-badge__name--placeholder': isResolvingCity }"
        >{{ displayName }}</span>
        <span
          v-if="sourceLabel"
          class="location-badge__source"
          :class="`location-badge__source--${sourceLabel}`"
        >
          {{ sourceLabel }}
        </span>
      </span>
      <button
        type="button"
        class="location-badge__action"
        :disabled="isDetecting"
        :aria-label="isDetecting ? 'Detecting your location' : 'Use my current location'"
        :title="isDetecting ? 'Detecting…' : 'Use my current location'"
        @click="$emit('detect')"
      >
        <Icon name="crosshair" :size="14" />
        <span>{{ isDetecting ? 'Detecting…' : 'Use my current location' }}</span>
      </button>
      <button
        type="button"
        class="location-badge__action"
        @click="$emit('change')"
      >
        Change
      </button>
    </div>
    <p
      v-if="detectionError"
      class="location-badge__error"
      role="status"
    >
      Couldn’t detect your location: {{ detectionError }}
    </p>
  </div>
</template>

<style scoped>
.location-badge {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

.location-badge__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.location-badge__pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: var(--font-size-base);
  color: var(--color-text);
  max-width: 100%;
}

.location-badge__icon {
  color: var(--color-accent);
}

.location-badge__name {
  font-weight: var(--font-weight-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location-badge__name--placeholder {
  font-weight: var(--font-weight-regular);
  color: var(--color-text-muted);
  font-style: italic;
}

.location-badge__source {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-strong);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  padding: 1px var(--space-2);
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
}

.location-badge__source--detected {
  color: var(--color-rating-great);
  border-color: color-mix(in srgb, var(--color-rating-great) 30%, transparent);
  background: color-mix(in srgb, var(--color-rating-great) 10%, transparent);
}

.location-badge__source--manual {
  color: var(--color-rating-fair);
  border-color: color-mix(in srgb, var(--color-rating-fair) 30%, transparent);
  background: color-mix(in srgb, var(--color-rating-fair) 10%, transparent);
}

.location-badge__action {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-strong);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.location-badge__action:hover:not(:disabled) {
  background: var(--color-surface-elevated);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.location-badge__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.location-badge__error {
  font-size: var(--font-size-sm);
  color: var(--color-rating-avoid);
  margin-top: var(--space-1);
}
</style>
