<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import type {
  ScoringProfile,
  ScoringProfilePreset,
  ScoringWeights,
} from "../types";
import { profileLabel } from "../services/scoring-profile";
import ProfilePresetList from "./profile-preset-list.vue";
import ProfileWeightsEditor from "./profile-weights-editor.vue";
import ProfileRangeEditor from "./profile-range-editor.vue";

const props = defineProps<{
  profile: ScoringProfile;
}>();

const emit = defineEmits<{
  close: [];
  "select-preset": [preset: Exclude<ScoringProfilePreset, "custom">];
  "update-weight": [key: keyof ScoringWeights, value: number];
  "update-ideal-range": [range: { low: number; high: number }];
  "update-darkness": [value: number];
  reset: [];
}>();

const headingId = "profile-panel-heading";
const panelRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const activeLabel = computed(() => profileLabel(props.profile));

function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit("close");
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.stopPropagation();
    emit("close");
    return;
  }
  if (event.key === "Tab" && panelRef.value) {
    const focusables = panelRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  document.addEventListener("keydown", handleKeydown);
  await nextTick();
  closeButtonRef.value?.focus();
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  previouslyFocused?.focus?.();
});
</script>

<template>
  <div
    class="profile-panel__backdrop"
    role="presentation"
    @click="handleBackdropClick"
  >
    <section
      ref="panelRef"
      class="profile-panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="headingId"
    >
      <header class="profile-panel__header">
        <div>
          <h2 :id="headingId" class="profile-panel__title">Scoring profile</h2>
          <p class="profile-panel__subtitle">Active: {{ activeLabel }}</p>
        </div>
        <button
          ref="closeButtonRef"
          type="button"
          class="profile-panel__close"
          aria-label="Close scoring profile settings"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <section class="profile-panel__section">
        <h3 class="profile-panel__section-title">Preset</h3>
        <ProfilePresetList
          :profile="profile"
          @select="(preset) => emit('select-preset', preset)"
        />
      </section>

      <section class="profile-panel__section">
        <h3 class="profile-panel__section-title">Weights</h3>
        <p class="profile-panel__hint">
          Adjust how much each factor matters. Values are re-balanced
          automatically so they always add up to 100 %.
        </p>
        <ProfileWeightsEditor
          :weights="profile.weights"
          @update="(key, value) => emit('update-weight', key, value)"
        />
      </section>

      <ProfileRangeEditor
        class="profile-panel__section"
        :range="profile.idealApparentTempCelsius"
        :darkness-score="profile.darknessScore"
        @update-range="(range) => emit('update-ideal-range', range)"
        @update-darkness="(value) => emit('update-darkness', value)"
      />

      <footer class="profile-panel__footer">
        <button
          type="button"
          class="profile-panel__button profile-panel__button--secondary"
          @click="emit('reset')"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          class="profile-panel__button"
          @click="emit('close')"
        >
          Done
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.profile-panel__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 50;
}

.profile-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  max-width: 520px;
  width: 100%;
  max-height: calc(100vh - 2 * var(--space-4));
  overflow-y: auto;
  padding: var(--space-5);
  color: var(--color-text);
}

.profile-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.profile-panel__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-strong);
  letter-spacing: -0.01em;
}

.profile-panel__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

.profile-panel__close {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: 22px;
  line-height: 1;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-family: inherit;
}

.profile-panel__close:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.profile-panel__section {
  margin-bottom: var(--space-5);
}

.profile-panel__section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-strong);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.profile-panel__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.profile-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.profile-panel__button {
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-strong);
  font-family: inherit;
  cursor: pointer;
}

.profile-panel__button:hover {
  background: var(--color-accent-strong);
}

.profile-panel__button--secondary {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.profile-panel__button--secondary:hover {
  background: var(--color-surface-elevated);
  border-color: var(--color-border-strong);
}
</style>
