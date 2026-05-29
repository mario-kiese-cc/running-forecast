<script setup lang="ts">
import { computed } from "vue";
import type { ScoringProfile } from "../types";
import { profileLabel } from "../services/scoring-profile";
import Icon from "./icon/icon.vue";

const props = defineProps<{
  profile: ScoringProfile;
}>();

defineEmits<{
  open: [];
}>();

const label = computed(() => profileLabel(props.profile));
</script>

<template>
  <button
    type="button"
    class="profile-pill"
    :title="`Edit scoring profile (${label})`"
    @click="$emit('open')"
  >
    <Icon name="sliders" :size="14" class="profile-pill__icon" />
    <span class="profile-pill__label">
      <span class="profile-pill__prefix">Profile</span>
      <span class="profile-pill__name">{{ label }}</span>
    </span>
  </button>
</template>

<style scoped>
.profile-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.profile-pill:hover {
  background: var(--color-surface-elevated);
  border-color: var(--color-border-strong);
}

.profile-pill:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.profile-pill__icon {
  color: var(--color-text-subtle);
}

.profile-pill__label {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-1);
}

.profile-pill__prefix {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.profile-pill__name {
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}
</style>
