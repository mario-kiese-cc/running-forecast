<script setup lang="ts">
import { computed } from "vue";
import type { UserLocation } from "../types";

const props = defineProps<{
  location: UserLocation;
}>();

defineEmits<{
  change: [];
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
    <span class="location-badge__pill">
      <span class="location-badge__icon" aria-hidden="true">📍</span>
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
      class="location-badge__change"
      @click="$emit('change')"
    >
      Change
    </button>
  </div>
</template>

<style scoped>
.location-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.location-badge__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  font-size: 0.8125rem;
  color: var(--color-text);
  max-width: 100%;
}

.location-badge__icon {
  font-size: 0.875rem;
}

.location-badge__name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location-badge__name--placeholder {
  font-weight: 500;
  color: var(--color-muted);
  font-style: italic;
}

.location-badge__source {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 999px;
}

.location-badge__source--detected {
  background: color-mix(in srgb, var(--color-good) 18%, transparent);
  color: color-mix(in srgb, var(--color-good) 70%, var(--color-text));
}

.location-badge__source--manual {
  background: color-mix(in srgb, var(--color-fair) 18%, transparent);
  color: color-mix(in srgb, var(--color-fair) 70%, var(--color-text));
}

.location-badge__change {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.location-badge__change:hover {
  background: var(--color-bg);
  color: var(--color-text);
}
</style>
