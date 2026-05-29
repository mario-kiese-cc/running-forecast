<script setup lang="ts">
import { computed, ref } from "vue";
import { useLocation } from "./composables/use-location";
import { useWeather } from "./composables/use-weather";
import { useScoringProfile } from "./composables/use-scoring-profile";
import { useRunType } from "./composables/use-run-type";
import { applyRunTypeModifier } from "./services/run-type";
import { buildDayForecasts, getTodayString } from "./services/slot-builder";
import { buildWeekGrid } from "./services/week-grid";
import { useViewMode } from "./composables/use-view-mode";
import TimelineView from "./components/timeline-view.vue";
import WeekGridView from "./components/week-grid-view.vue";
import ViewModeToggle from "./components/view-mode-toggle.vue";
import LocationPrompt from "./components/location-prompt.vue";
import LocationBadge from "./components/location-badge.vue";
import AppLogo from "./components/app-logo.vue";
import Icon from "./components/icon/icon.vue";
import ProfilePill from "./components/profile-pill.vue";
import ProfilePanel from "./components/profile-panel.vue";
import RunTypeSelector from "./components/run-type-selector.vue";
import type { ScoringProfile, UserLocation } from "./types";

const {
  location,
  status: locationStatus,
  setManualLocation,
  detectLocation,
  detectionStatus,
  detectionError,
} = useLocation();
const {
  profile,
  setPreset,
  updateWeight,
  updateIdealRange,
  updateDarknessScore,
  reset: resetProfile,
} = useScoringProfile();
const { runType, setRunType } = useRunType();
const { viewMode, setViewMode } = useViewMode();

/**
 * Effective profile = personal profile composed with the run-type
 * modifier. Both refs are reactive, so this re-runs and re-scores the
 * forecast whenever either changes (no network refetch — see ADR-005 /
 * ADR-006).
 */
const effectiveProfile = computed<ScoringProfile>(() =>
  applyRunTypeModifier(profile.value, runType.value),
);

const { slots, status: weatherStatus, errorMessage, refresh } =
  useWeather(location, effectiveProfile);

const isProfilePanelOpen = ref(false);

function openProfilePanel(): void {
  isProfilePanelOpen.value = true;
}

function closeProfilePanel(): void {
  isProfilePanelOpen.value = false;
}

const today = computed(() => getTodayString());

const forecasts = computed(() => {
  if (slots.value.length === 0) return [];
  return buildDayForecasts(slots.value, today.value);
});

const weekRows = computed(() => {
  if (slots.value.length === 0) return [];
  return buildWeekGrid(slots.value, new Date());
});

/**
 * ISO time a deep-link from the Week view wants the Timeline to scroll to
 * and pulse. Cleared after the pulse so re-selecting the same slot fires
 * again.
 */
const highlightTime = ref<string | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

function handleSelectSlot(time: string): void {
  setViewMode("timeline");
  highlightTime.value = time;
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    highlightTime.value = null;
  }, 1600);
}

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
      <div class="app__brand">
        <AppLogo :size="32" class="app__logo" />
        <h1 class="app__title">Running Forecast</h1>
        <ProfilePill
          class="app__profile-pill"
          :profile="profile"
          @open="openProfilePanel"
        />
      </div>
      <p class="app__subtitle">Find the best time to run</p>
    </header>

    <RunTypeSelector :run-type="runType" @select="setRunType" />

    <ProfilePanel
      v-if="isProfilePanelOpen"
      :profile="profile"
      @close="closeProfilePanel"
      @select-preset="setPreset"
      @update-weight="updateWeight"
      @update-ideal-range="updateIdealRange"
      @update-darkness="updateDarknessScore"
      @reset="resetProfile"
    />

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

        <template v-else-if="weatherStatus === 'ready'">
          <ViewModeToggle
            class="app__view-toggle"
            :view-mode="viewMode"
            @select="setViewMode"
          />

          <!-- Both views stay mounted (v-show) so each keeps its own scroll
               position when toggling (acceptance criteria). -->
          <TimelineView
            v-show="viewMode === 'timeline'"
            :forecasts="forecasts"
            :today="today"
            :highlight-time="highlightTime"
          />
          <WeekGridView
            v-show="viewMode === 'week'"
            :rows="weekRows"
            @select-slot="handleSelectSlot"
          />
        </template>
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

.app__brand {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.app__profile-pill {
  margin-left: auto;
}

.app__logo {
  /* Optical alignment: nudge down a hair so the track sits on the title's
     baseline rather than its cap height. */
  margin-top: 2px;
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

.app__view-toggle {
  margin-bottom: var(--space-4);
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
