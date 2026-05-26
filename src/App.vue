<script setup lang="ts">
import { computed, ref } from "vue";
import { useLocation } from "./composables/use-location";
import { useWeather } from "./composables/use-weather";
import { buildDayForecasts, getTodayString } from "./services/slot-builder";
import TimelineView from "./components/timeline-view.vue";
import LocationPrompt from "./components/location-prompt.vue";
import LocationBadge from "./components/location-badge.vue";
import Icon from "./components/icon/icon.vue";
import type { UserLocation } from "./types";

const {
  location,
  status: locationStatus,
  setManualLocation,
  detectLocation,
  detectionStatus,
  detectionError,
} = useLocation();
const { slots, status: weatherStatus, errorMessage, refresh } =
  useWeather(location);

const today = computed(() => getTodayString());

const forecasts = computed(() => {
  if (slots.value.length === 0) return [];
  return buildDayForecasts(slots.value, today.value);
});

/** User-initiated request to change an already-set location. */
const isChangingLocation = ref(false);

/** Show the prompt either when there is no location yet, or when the user opted to change. */
const showPrompt = computed(
  () => locationStatus.value === "prompt" || isChangingLocation.value,
);

function handleLocationSubmit(loc: UserLocation): void {
  setManualLocation(loc);
  isChangingLocation.value = false;
}

function handleChangeLocation(): void {
  isChangingLocation.value = true;
}

function handleCancelChange(): void {
  isChangingLocation.value = false;
}

async function handleDetectLocation(): Promise<void> {
  await detectLocation();
  // Auto-close the manual prompt if it was open and detection succeeded.
  if (detectionStatus.value === "idle") {
    isChangingLocation.value = false;
  }
}
</script>

<template>
  <main class="app">
    <header class="app__header">
      <h1 class="app__title">Running Forecast</h1>
      <p class="app__subtitle">Find the best time to run</p>
    </header>

    <!-- Loading location -->
    <div v-if="locationStatus === 'loading'" class="app__status">
      <p>Detecting your location…</p>
    </div>

    <!-- Location ready (or being changed) — show toolbar + content -->
    <template v-else-if="locationStatus === 'ready' || locationStatus === 'prompt'">
      <!-- Toolbar: badge + refresh (only when a location is set) -->
      <div v-if="location" class="app__toolbar">
        <LocationBadge
          :location="location"
          :is-detecting="detectionStatus === 'detecting'"
          :detection-error="detectionError"
          @change="handleChangeLocation"
          @detect="handleDetectLocation"
        />
        <button
          class="app__refresh"
          :disabled="weatherStatus === 'loading'"
          @click="refresh"
        >
          <Icon name="refresh" :size="14" />
          <span>{{ weatherStatus === 'loading' ? 'Loading' : 'Refresh' }}</span>
        </button>
      </div>

      <!-- Manual location input (initial prompt or user-triggered change) -->
      <LocationPrompt
        v-if="showPrompt"
        :cancelable="location !== null"
        @submit="handleLocationSubmit"
        @cancel="handleCancelChange"
      />

      <!-- Weather states (only when a location is set and prompt is not blocking) -->
      <template v-if="location && !showPrompt">
        <div v-if="weatherStatus === 'loading'" class="app__status">
          <p>Loading forecast…</p>
        </div>

        <div v-else-if="weatherStatus === 'error'" class="app__error">
          <p class="app__error-message">
            <Icon name="alert" :size="16" label="Error" />
            <span>{{ errorMessage }}</span>
          </p>
          <button class="app__refresh" @click="refresh">Try again</button>
        </div>

        <TimelineView
          v-else-if="weatherStatus === 'ready'"
          :forecasts="forecasts"
          :today="today"
        />
      </template>
    </template>
  </main>
</template>

<style>
/*
 * Global reset only. Design tokens live in src/styles/tokens.css and are
 * imported once from src/main.ts. Do not redefine tokens here.
 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.app {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-8);
}

.app__header {
  margin-bottom: var(--space-5);
}

.app__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-strong);
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.app__subtitle {
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
  margin-top: var(--space-1);
}

.app__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  padding: var(--space-2) 0;
}

.app__refresh {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.app__refresh:hover {
  background: var(--color-surface-elevated);
  border-color: var(--color-border-strong);
}

.app__refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app__status {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-text-muted);
}

.app__error {
  text-align: center;
  padding: var(--space-6) 0;
  color: var(--color-rating-avoid);
}

.app__error-message {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
</style>
