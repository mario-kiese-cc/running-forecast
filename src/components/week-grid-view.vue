<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { TimeSlot, WeekGridCell, WeekGridRow } from "../types";
import { findBestFutureCellTime } from "../services/week-grid";
import WeekCell from "./week-grid-cell.vue";
import WeekPopover from "./week-grid-popover.vue";
import WeekLegend from "./week-grid-legend.vue";

const props = defineProps<{
  rows: ReadonlyArray<WeekGridRow>;
}>();

const emit = defineEmits<{
  /** Deep-link request: jump to the Timeline view at this ISO time. */
  selectSlot: [time: string];
}>();

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MAJOR_HOURS = new Set([6, 12, 18]);

const gridEl = ref<HTMLElement | null>(null);

const bestTime = computed(() => findBestFutureCellTime(props.rows));

/** Roving-tabindex coordinate; defaults to the first interactive cell. */
const activeCoord = ref<{ row: number; hour: number }>(firstInteractive());

function firstInteractive(): { row: number; hour: number } {
  for (let r = 0; r < props.rows.length; r++) {
    for (let h = 0; h < props.rows[r].cells.length; h++) {
      if (props.rows[r].cells[h].slot !== null) return { row: r, hour: h };
    }
  }
  return { row: 0, hour: 0 };
}

function isTabStop(row: number, hour: number): boolean {
  return activeCoord.value.row === row && activeCoord.value.hour === hour;
}

function isInteractive(row: number, hour: number): boolean {
  return props.rows[row]?.cells[hour]?.slot != null;
}

// --- Popover state ---

interface PopoverState {
  readonly slot: TimeSlot;
  readonly dayLabel: string;
  readonly top: number;
  readonly left: number;
}

const popover = ref<PopoverState | null>(null);

function showPopover(cell: WeekGridCell, element: HTMLElement): void {
  if (cell.slot === null) return;
  const row = props.rows.find((r) => r.dateIso === cell.time.slice(0, 10));
  const rect = element.getBoundingClientRect();
  const POPOVER_WIDTH = 208; // matches .grid-popover width (13rem)
  const left = Math.min(
    Math.max(rect.left, 8),
    window.innerWidth - POPOVER_WIDTH - 8,
  );
  popover.value = {
    slot: cell.slot,
    dayLabel: row?.dayLabel ?? "",
    top: rect.bottom + 6,
    left,
  };
}

function hidePopover(): void {
  popover.value = null;
}

// --- Keyboard navigation (NFR-2) ---

async function moveTo(row: number, hour: number): Promise<void> {
  activeCoord.value = { row, hour };
  await nextTick();
  const target = gridEl.value?.querySelector<HTMLElement>(
    `[data-time="${props.rows[row].cells[hour].time}"]`,
  );
  target?.focus();
}

function findInRow(row: number, from: number, step: number): number | null {
  for (let h = from; h >= 0 && h < 24; h += step) {
    if (isInteractive(row, h)) return h;
  }
  return null;
}

function findInColumn(hour: number, from: number, step: number): number | null {
  for (let r = from; r >= 0 && r < props.rows.length; r += step) {
    if (isInteractive(r, hour)) return r;
  }
  return null;
}

async function handleKeydown(event: KeyboardEvent): Promise<void> {
  const { row, hour } = activeCoord.value;
  let handled = true;

  switch (event.key) {
    case "ArrowRight": {
      const h = findInRow(row, hour + 1, 1);
      if (h !== null) await moveTo(row, h);
      break;
    }
    case "ArrowLeft": {
      const h = findInRow(row, hour - 1, -1);
      if (h !== null) await moveTo(row, h);
      break;
    }
    case "ArrowDown": {
      const r = findInColumn(hour, row + 1, 1);
      if (r !== null) await moveTo(r, hour);
      break;
    }
    case "ArrowUp": {
      const r = findInColumn(hour, row - 1, -1);
      if (r !== null) await moveTo(r, hour);
      break;
    }
    case "Home": {
      const h = findInRow(row, 0, 1);
      if (h !== null) await moveTo(row, h);
      break;
    }
    case "End": {
      const h = findInRow(row, 23, -1);
      if (h !== null) await moveTo(row, h);
      break;
    }
    case "Escape":
      hidePopover();
      break;
    default:
      handled = false;
  }

  if (handled) event.preventDefault();
}

function handleSelect(cell: WeekGridCell): void {
  if (cell.slot === null) return;
  emit("selectSlot", cell.time);
}
</script>

<template>
  <div class="week">
    <div v-if="props.rows.length === 0" class="week__empty">
      No forecast data available.
    </div>

    <template v-else>
      <div class="week__scroll">
        <div
          ref="gridEl"
          class="week__grid"
          role="grid"
          aria-label="Weekly running conditions by hour"
          @keydown="handleKeydown"
          @scroll="hidePopover"
        >
          <!-- Hour header -->
          <div class="week__row week__row--head" role="row">
            <div class="week__corner" role="columnheader" aria-label="Day" />
            <div
              v-for="hour in HOURS"
              :key="hour"
              class="week__hour"
              :class="{ 'week__hour--major': MAJOR_HOURS.has(hour) }"
              role="columnheader"
            >
              {{ String(hour).padStart(2, "0") }}
            </div>
          </div>

          <!-- Day rows -->
          <div
            v-for="(weekRow, rowIndex) in props.rows"
            :key="weekRow.dateIso"
            class="week__row"
            role="row"
          >
            <div class="week__rowhead" role="rowheader">
              {{ weekRow.dayLabel }}
            </div>
            <WeekCell
              v-for="(cell, hourIndex) in weekRow.cells"
              :key="cell.time"
              :cell="cell"
              :day-label="weekRow.dayLabel"
              :is-best="cell.time === bestTime"
              :is-tab-stop="isTabStop(rowIndex, hourIndex)"
              @activate="showPopover"
              @deactivate="hidePopover"
              @select="handleSelect"
            />
          </div>
        </div>
      </div>

      <WeekLegend />

      <!-- Single shared popover, positioned over the active cell. -->
      <Teleport to="body">
        <WeekPopover
          v-if="popover"
          class="week__popover"
          :style="{ top: `${popover.top}px`, left: `${popover.left}px` }"
          :slot="popover.slot"
          :day-label="popover.dayLabel"
        />
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.week {
  --cell-size: 26px;
  --cell-gap: var(--space-1);
  --label-col: 5.5rem;
}

.week__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-2);
}

.week__grid {
  display: inline-flex;
  flex-direction: column;
  gap: var(--cell-gap);
  min-width: min-content;
}

.week__row {
  display: grid;
  grid-template-columns: var(--label-col) repeat(24, var(--cell-size));
  gap: var(--cell-gap);
  align-items: center;
}

.week__corner,
.week__rowhead {
  position: sticky;
  left: 0;
  z-index: 3;
  background: var(--color-bg);
  padding-right: var(--space-2);
}

.week__rowhead {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  white-space: nowrap;
}

.week__hour {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
}

.week__hour--major {
  color: var(--color-text-muted);
  font-weight: var(--font-weight-medium);
}

.week__empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: var(--space-8) 0;
}

.week__popover {
  position: fixed;
  z-index: 50;
  pointer-events: none;
}

@media (max-width: 640px) {
  .week {
    --cell-size: 32px;
    --label-col: 4.5rem;
  }
}
</style>
