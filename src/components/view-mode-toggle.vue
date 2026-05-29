<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { ViewMode } from "../services/view-mode";
import type { IconName } from "./icon/icons";
import Icon from "./icon/icon.vue";

const props = defineProps<{
  viewMode: ViewMode;
}>();

const emit = defineEmits<{
  select: [mode: ViewMode];
}>();

interface Option {
  readonly mode: ViewMode;
  readonly label: string;
  readonly icon: IconName;
}

const OPTIONS: ReadonlyArray<Option> = [
  { mode: "timeline", label: "Timeline", icon: "list" },
  { mode: "week", label: "Week", icon: "grid" },
];

const buttonRefs = ref<HTMLButtonElement[]>([]);

function setButtonRef(el: Element | null, index: number): void {
  if (el instanceof HTMLButtonElement) {
    buttonRefs.value[index] = el;
  }
}

const currentIndex = computed(() =>
  OPTIONS.findIndex((o) => o.mode === props.viewMode),
);

function selectAt(index: number): void {
  const next = OPTIONS[index]?.mode;
  if (next !== undefined && next !== props.viewMode) {
    emit("select", next);
  }
}

/** Roving tabindex: arrows move focus + selection together. */
async function handleKeydown(event: KeyboardEvent, index: number): Promise<void> {
  let nextIndex = index;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      nextIndex = (index + 1) % OPTIONS.length;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      nextIndex = (index - 1 + OPTIONS.length) % OPTIONS.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = OPTIONS.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  selectAt(nextIndex);
  await nextTick();
  buttonRefs.value[nextIndex]?.focus();
}
</script>

<template>
  <div
    class="view-toggle"
    role="tablist"
    aria-label="Forecast view"
  >
    <button
      v-for="(option, index) in OPTIONS"
      :key="option.mode"
      :ref="(el) => setButtonRef(el as Element | null, index)"
      type="button"
      role="tab"
      class="view-toggle__option"
      :class="{ 'view-toggle__option--active': option.mode === props.viewMode }"
      :aria-selected="option.mode === props.viewMode"
      :tabindex="option.mode === props.viewMode ? 0 : -1"
      @click="selectAt(index)"
      @keydown="handleKeydown($event, index)"
    >
      <Icon :name="option.icon" :size="14" class="view-toggle__icon" />
      <span>{{ option.label }}</span>
    </button>
    <span hidden>{{ currentIndex }}</span>
  </div>
</template>

<style scoped>
.view-toggle {
  display: inline-flex;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
}

.view-toggle__option {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-4);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: var(--font-size-sm);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.view-toggle__option:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text);
}

.view-toggle__option:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.view-toggle__option--active {
  background: var(--color-surface-elevated);
  color: var(--color-text);
  border-color: var(--color-border-strong);
  font-weight: var(--font-weight-medium);
}

.view-toggle__icon {
  color: inherit;
}
</style>
