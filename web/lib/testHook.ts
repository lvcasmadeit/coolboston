import { dashboardStore } from "@/lib/store";

/** What Playwright can reach on `window.__coolboston` (dev, or NEXT_PUBLIC_TEST_HOOK=1). */
export interface TestHook {
  store: typeof dashboardStore;
  /** The mapbox-gl map, once mounted. Typed loosely so lib/ does not depend on mapbox-gl. */
  map?: unknown;
}

declare global {
  interface Window {
    __coolboston?: TestHook;
  }
}

export const testHookEnabled = () =>
  typeof window !== "undefined" &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_TEST_HOOK === "1");

/** Exposes the store on `window.__coolboston` when the hook is enabled. */
export function installTestHook() {
  if (!testHookEnabled()) return;
  window.__coolboston = { ...window.__coolboston, store: dashboardStore };
}

/** Exposes the map instance next to the store. */
export function exposeMap(map: unknown) {
  if (!testHookEnabled()) return;
  window.__coolboston = { store: dashboardStore, ...window.__coolboston, map };
}
