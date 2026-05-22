<script setup lang="ts">
import { ref } from "vue";
import type { UserLocation } from "../types";
import {
  geocodeCity,
  candidateToLocation,
  formatCandidate,
  type GeocodingCandidate,
} from "../services/geocoding-service";

const props = withDefaults(
  defineProps<{
    /** Show a Cancel button (useful when the prompt is opened over an existing location). */
    cancelable?: boolean;
  }>(),
  { cancelable: false },
);

const emit = defineEmits<{
  submit: [location: UserLocation];
  cancel: [];
}>();

// Silence "unused" check while still making props available in template.
void props;

const cityName = ref("");
const errorText = ref<string | null>(null);
const isSearching = ref(false);
const candidates = ref<GeocodingCandidate[]>([]);
const showCandidates = ref(false);

async function handleSubmit(): Promise<void> {
  const trimmed = cityName.value.trim();
  if (trimmed.length === 0) {
    errorText.value = "Please enter a city name.";
    return;
  }

  errorText.value = null;
  isSearching.value = true;
  showCandidates.value = false;

  try {
    const results = await geocodeCity(trimmed);

    if (results.length === 0) {
      errorText.value = `No results found for "${trimmed}". Try a different spelling.`;
      return;
    }

    if (results.length === 1) {
      emit("submit", candidateToLocation(results[0]));
      return;
    }

    // Multiple results — let user pick
    candidates.value = results;
    showCandidates.value = true;
  } catch {
    errorText.value = "Failed to search for city. Check your connection and try again.";
  } finally {
    isSearching.value = false;
  }
}

function selectCandidate(candidate: GeocodingCandidate): void {
  showCandidates.value = false;
  emit("submit", candidateToLocation(candidate));
}
</script>

<template>
  <div class="location-prompt">
    <h2 class="location-prompt__title">Set your location</h2>
    <p class="location-prompt__subtitle">
      Enter your city to get a running forecast.
    </p>

    <form class="location-prompt__form" @submit.prevent="handleSubmit">
      <div class="location-prompt__field">
        <label for="loc-city">City</label>
        <input
          id="loc-city"
          v-model="cityName"
          type="text"
          placeholder="e.g. Vienna"
          required
          :disabled="isSearching"
        />
      </div>

      <p v-if="errorText" class="location-prompt__error">{{ errorText }}</p>

      <div class="location-prompt__actions">
        <button
          v-if="cancelable"
          type="button"
          class="location-prompt__button location-prompt__button--secondary"
          :disabled="isSearching"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="location-prompt__button"
          :disabled="isSearching"
        >
          {{ isSearching ? 'Searching…' : 'Get Forecast' }}
        </button>
      </div>
    </form>

    <!-- Candidate picker for ambiguous results -->
    <div v-if="showCandidates" class="location-prompt__candidates">
      <p class="location-prompt__candidates-title">
        Multiple matches — pick your city:
      </p>
      <button
        v-for="(candidate, index) in candidates"
        :key="index"
        class="location-prompt__candidate"
        @click="selectCandidate(candidate)"
      >
        {{ formatCandidate(candidate) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.location-prompt {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-5);
  text-align: center;
}

.location-prompt__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-strong);
  color: var(--color-text);
  margin-bottom: var(--space-1);
  letter-spacing: -0.01em;
}

.location-prompt__subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  margin-bottom: var(--space-5);
}

.location-prompt__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: left;
}

.location-prompt__field label {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-strong);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.location-prompt__field input {
  width: 100%;
  padding: var(--space-3) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

.location-prompt__field input::placeholder {
  color: var(--color-text-subtle);
}

.location-prompt__field input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.location-prompt__field input:disabled {
  opacity: 0.6;
}

.location-prompt__error {
  font-size: var(--font-size-sm);
  color: var(--color-rating-avoid);
}

.location-prompt__actions {
  display: flex;
  gap: var(--space-2);
}

.location-prompt__button {
  flex: 1;
  padding: var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-strong);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.location-prompt__button:hover {
  background: var(--color-accent-strong);
}

.location-prompt__button--secondary {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.location-prompt__button--secondary:hover {
  background: var(--color-surface-elevated);
  border-color: var(--color-border-strong);
}

.location-prompt__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.location-prompt__candidates {
  margin-top: var(--space-4);
  text-align: left;
}

.location-prompt__candidates-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-strong);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.location-prompt__candidate {
  display: block;
  width: 100%;
  padding: var(--space-3);
  margin-bottom: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-base);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.location-prompt__candidate:hover {
  background: var(--color-surface-elevated);
  border-color: var(--color-accent);
}
</style>
