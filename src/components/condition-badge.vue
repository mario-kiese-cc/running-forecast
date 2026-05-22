<script setup lang="ts">
const props = defineProps<{
  icon: string;
  label: string;
  value: string;
}>();
</script>

<template>
  <span class="badge" :title="props.label">
    <span class="badge__icon">{{ props.icon }}</span>
    <span class="badge__value">{{ props.value }}</span>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: var(--color-bg);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.badge__icon {
  font-size: 0.8rem;
}

.badge__value {
  font-variant-numeric: tabular-nums;
}
</style>
