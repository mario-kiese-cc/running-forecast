import { ref } from "vue";
import type { Ref } from "vue";
import type { RunType } from "../types";
import {
  DEFAULT_RUN_TYPE,
  clearRunType,
  loadRunType,
  saveRunType,
} from "../services/run-type";

/**
 * Module-level singleton so every consumer (selector, App.vue, weather
 * composable) shares one reactive run type. Lazy-initialised on first
 * call to avoid touching `localStorage` at module-evaluation time, which
 * breaks in SSR / non-jsdom test environments. Mirrors the pattern in
 * `use-scoring-profile.ts` (ADR-005 Q3).
 */
let runTypeRef: Ref<RunType> | null = null;

function ensureRef(): Ref<RunType> {
  if (runTypeRef === null) {
    runTypeRef = ref<RunType>(loadRunType());
  }
  return runTypeRef;
}

/**
 * Reactive access to the active run type, with a setter that persists
 * every change. Returning the singleton ref means a change here is picked
 * up automatically by `App.vue`'s `effectiveProfile` computed and re-scores
 * the visible forecast without a network refetch.
 */
export function useRunType(): {
  runType: Ref<RunType>;
  setRunType: (next: RunType) => void;
  reset: () => void;
} {
  const runType = ensureRef();

  function setRunType(next: RunType): void {
    runType.value = next;
    saveRunType(next);
  }

  function reset(): void {
    clearRunType();
    runType.value = DEFAULT_RUN_TYPE;
  }

  return { runType, setRunType, reset };
}

/**
 * Reset the module-level singleton. Tests only — do not call from app code.
 */
export function __resetRunTypeForTests(): void {
  runTypeRef = null;
}
