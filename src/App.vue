<script setup lang="ts">
import { computed, ref } from "vue";
import { useLocation } from "./composables/use-location";
import { useWeather } from "./composables/use-weather";
import { buildDayForecasts, getTodayString } from "./services/slot-builder";
import TimelineView from "./components/timeline-view.vue";
import LocationPrompt from "./components/location-prompt.vue";
import LocationBadge from "./components/location-badge.vue";
import type { UserLocation } from "./types";

const { location, status: locationStatus, setManualLocation } = useLocation();
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
</script>

<template>
  <main class="app">
    <header class="app__header">
      <h1>🏃 Running Forecast</h1>
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
        <LocationBadge :location="location" @change="handleChangeLocation" />
        <button
          class="app__refresh"
          :disabled="weatherStatus === 'loading'"
          @click="refresh"
        >
          {{ weatherStatus === 'loading' ? '↻ Loading…' : '↻ Refresh' }}
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
          <p>⚠️ {{ errorMessage }}</p>
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
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-bg: #f5f5f7;
  --color-text: #1a1a1a;
  --color-muted: #6b7280;
  --color-great: #22c55e;
  --color-good: #84cc16;
  --color-fair: #f59e0b;
  --color-avoid: #ef4444;
  --color-card-bg: #ffffff;
  --color-border: #e5e7eb;
  --radius: 12px;
  --max-width: 480px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 24px 16px 48px;
}

.app__header {
  margin-bottom: 20px;
}

.app__header h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.app__subtitle {
  color: var(--color-muted);
  font-size: 0.875rem;
}

.app__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 0;
}

.app__refresh {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-card-bg);
  color: var(--color-text);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.15s;
}

.app__refresh:hover {
  background: var(--color-bg);
}

.app__refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app__status {
  text-align: center;
  padding: 40px 0;
  color: var(--color-muted);
}

.app__error {
  text-align: center;
  padding: 24px 0;
  color: var(--color-avoid);
}

.app__error button {
  margin-top: 12px;
}
</style>
