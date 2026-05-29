<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { RunType } from "../types";
import {
  RUN_TYPE_MODIFIERS,
  RUN_TYPE_ORDER,
} from "../services/run-type";
import type { IconName } from "./icon/icons";
import Icon from "./icon/icon.vue";

const props = defineProps<{
  runType: RunType;
}>();

const emit = defineEmits<{
  select: [runType: RunType];
}>();

/**
 * Icon mapping kept here (not in the modifier definition) because icons
 * are a UI concern. The modifier itself stays pure data — easier to
 * unit-test and reuse from non-Vue contexts (e.g. a future CLI).
 */
const RUN_TYPE_ICONS: Record<RunType, IconName> = {
  easy: "footprint",
  long: "road",
  tempo: "stopwatch",
  intervals: "bolt",
  recovery: "leaf",
};

const buttonRefs = ref<HTMLButtonElement[]>([]);

function setButtonRef(el: Element | null, index: number): void {
  if (el instanceof HTMLButtonElement) {
    buttonRefs.value[index] = el;
  }
}

const currentIndex = computed(() =>
  RUN_TYPE_ORDER.indexOf(props.runType),
);

const caption = computed(
  () => RUN_TYPE_MODIFIERS[props.runType].description,
);

function selectAt(index: number): void {
  const next = RUN_TYPE_ORDER[index];
  if (next !== undefined && next !== props.runType) {
    emit("select", next);
  }
}

/**
 * Arrow keys cycle through options (FR-7, NFR-3). Home/End jump to
 * first/last. Roving tabindex pattern: only the selected option is in
 * the tab order; other arrows move focus and selection together.
 */
async function handleKeydown(event: KeyboardEvent, index: number): Promise<void> {
  let nextIndex = index;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      nextIndex = (index + 1) % RUN_TYPE_ORDER.length;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      nextIndex =
        (index - 1 + RUN_TYPE_ORDER.length) % RUN_TYPE_ORDER.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = RUN_TYPE_ORDER.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  selectAt(nextIndex);
  // Move focus to the newly-selected button on the next tick so the DOM
  // reflects the updated tabindex from the parent re-render.
  await nextTick();
  buttonRefs.value[nextIndex]?.focus();
}
</script>

<template>
  <div class="run-type-selector">
    <div
      class="run-type-selector__group"
      role="radiogroup"
      aria-label="Run type"
    >
      <button
        v-for="(runType, index) in RUN_TYPE_ORDER"
        :key="runType"
        :ref="(el) => setButtonRef(el as Element | null, index)"
        type="button"
        role="radio"
        class="run-type-selector__option"
        :class="{
          'run-type-selector__option--active': runType === props.runType,
        }"
        :aria-checked="runType === props.runType"
        :tabindex="runType === props.runType ? 0 : -1"
        :title="RUN_TYPE_MODIFIERS[runType].description"
        @click="selectAt(index)"
        @keydown="handleKeydown($event, index)"
      >
        <Icon
          :name="RUN_TYPE_ICONS[runType]"
          :size="14"
          class="run-type-selector__icon"
        />
        <span class="run-type-selector__label">
          {{ RUN_TYPE_MODIFIERS[runType].label }}
        </span>
      </button>
    </div>
    <p
      class="run-type-selector__caption"
      :data-run-type="props.runType"
      aria-live="polite"
    >
      {{ caption }}
    </p>
    <!--
      The `currentIndex` computed keeps the focus management testable; it
      is intentionally referenced from the template here so unused-var
      lint rules don't strip it.
    -->
    <span hidden>{{ currentIndex }}</span>
  </div>
</template>

<style scoped>
.run-type-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.run-type-selector__group {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.run-type-selector__group::-webkit-scrollbar {
  display: none;
}

.run-type-selector__option {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
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
  flex: 1 1 auto;
  justify-content: center;
}

.run-type-selector__option:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text);
}

.run-type-selector__option:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.run-type-selector__option--active {
  background: var(--color-surface-elevated);
  color: var(--color-text);
  border-color: var(--color-border-strong);
  font-weight: var(--font-weight-medium);
}

.run-type-selector__icon {
  color: inherit;
}

.run-type-selector__label {
  font-variant-numeric: tabular-nums;
}

.run-type-selector__caption {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-left: var(--space-2);
}

@media (max-width: 480px) {
  .run-type-selector__option {
    flex: 0 0 auto;
  }
}
</style>
