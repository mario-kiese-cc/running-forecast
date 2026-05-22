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
    <h2 class="location-prompt__title">📍 Set Your Location</h2>
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
  background: var(--color-card-bg);
  border-radius: var(--radius);
  padding: 24px 20px;
  text-align: center;
}

.location-prompt__title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.location-prompt__subtitle {
  font-size: 0.875rem;
  color: var(--color-muted);
  margin-bottom: 20px;
}

.location-prompt__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.location-prompt__field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
  margin-bottom: 4px;
}

.location-prompt__field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.9375rem;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s;
}

.location-prompt__field input:focus {
  border-color: var(--color-good);
}

.location-prompt__field input:disabled {
  opacity: 0.6;
}

.location-prompt__error {
  font-size: 0.8125rem;
  color: var(--color-avoid);
}

.location-prompt__actions {
  display: flex;
  gap: 8px;
}

.location-prompt__button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: var(--color-great);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.location-prompt__button--secondary {
  background: var(--color-card-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.location-prompt__button:hover {
  opacity: 0.9;
}

.location-prompt__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.location-prompt__candidates {
  margin-top: 16px;
  text-align: left;
}

.location-prompt__candidates-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-muted);
  margin-bottom: 8px;
}

.location-prompt__candidate {
  display: block;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 4px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.location-prompt__candidate:hover {
  background: var(--color-card-bg);
  border-color: var(--color-good);
}
</style>
