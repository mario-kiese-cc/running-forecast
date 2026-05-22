<script setup lang="ts">
import Icon from "./icon/icon.vue";
import type { IconName } from "./icon/icons";

/**
 * Compact metric pill: icon + value, label exposed as a tooltip + aria-label.
 *
 * Icons are decorative — the label provides the meaning, so the icon stays
 * `aria-hidden`. The visible `value` is read by AT via the wrapping `title`
 * / `aria-label`.
 */
const props = defineProps<{
  icon: IconName;
  label: string;
  value: string;
}>();
</script>

<template>
  <span class="badge" :title="props.label" :aria-label="`${props.label}: ${props.value}`">
    <Icon :name="props.icon" :size="14" class="badge__icon" />
    <span class="badge__value">{{ props.value }}</span>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.badge__icon {
  color: var(--color-text-subtle);
}

.badge__value {
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}
</style>
