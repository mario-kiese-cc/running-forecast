<script setup lang="ts">
import type { ScoringProfile, ScoringProfilePreset } from "../types";
import {
  BUILT_IN_PROFILES,
  PRESET_DESCRIPTIONS,
  PRESET_LABELS,
} from "../services/scoring-profile-presets";

defineProps<{
  profile: ScoringProfile;
}>();

const emit = defineEmits<{
  select: [preset: Exclude<ScoringProfilePreset, "custom">];
}>();

const builtInPresets = Object.keys(BUILT_IN_PROFILES) as Array<
  Exclude<ScoringProfilePreset, "custom">
>;
</script>

<template>
  <ul class="profile-preset-list" role="list">
    <li v-for="preset in builtInPresets" :key="preset">
      <button
        type="button"
        class="profile-preset-list__item"
        :class="{
          'profile-preset-list__item--active':
            profile.preset === preset ||
            (profile.preset === 'custom' && profile.basedOn === preset),
        }"
        :aria-pressed="profile.preset === preset"
        @click="emit('select', preset)"
      >
        <span class="profile-preset-list__name">
          {{ PRESET_LABELS[preset] }}
        </span>
        <span class="profile-preset-list__description">
          {{ PRESET_DESCRIPTIONS[preset] }}
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.profile-preset-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.profile-preset-list__item {
  width: 100%;
  text-align: left;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  color: var(--color-text);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.profile-preset-list__item:hover {
  background: var(--color-surface-elevated);
  border-color: var(--color-border-strong);
}

.profile-preset-list__item--active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.profile-preset-list__name {
  display: block;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
}

.profile-preset-list__description {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: 2px;
}
</style>
