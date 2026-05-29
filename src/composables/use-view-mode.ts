import { ref } from "vue";
import type { Ref } from "vue";
import {
  DEFAULT_VIEW_MODE,
  clearViewMode,
  loadViewMode,
  saveViewMode,
  type ViewMode,
} from "../services/view-mode";

/**
 * Module-level singleton so the toggle and `App.vue` share one reactive
 * view mode. Lazy-initialised on first call to avoid touching
 * `localStorage` at module-evaluation time (breaks in SSR / non-jsdom
 * tests). Mirrors the pattern in `use-run-type.ts`.
 */
let viewModeRef: Ref<ViewMode> | null = null;

function ensureRef(): Ref<ViewMode> {
  if (viewModeRef === null) {
    viewModeRef = ref<ViewMode>(loadViewMode());
  }
  return viewModeRef;
}

/**
 * Reactive access to the active view mode, with a setter that persists
 * every change (FR-8).
 */
export function useViewMode(): {
  viewMode: Ref<ViewMode>;
  setViewMode: (next: ViewMode) => void;
  reset: () => void;
} {
  const viewMode = ensureRef();

  function setViewMode(next: ViewMode): void {
    viewMode.value = next;
    saveViewMode(next);
  }

  function reset(): void {
    clearViewMode();
    viewMode.value = DEFAULT_VIEW_MODE;
  }

  return { viewMode, setViewMode, reset };
}

/**
 * Reset the module-level singleton. Tests only — do not call from app code.
 */
export function __resetViewModeForTests(): void {
  viewModeRef = null;
}
