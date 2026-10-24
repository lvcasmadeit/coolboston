import { dashboardStore } from "@/lib/store";

declare global {
  interface Window {
    /** Dev / e2e only: drive the store from Playwright (add actions, set view mode). */
    __coolboston?: { store: typeof dashboardStore };
  }
}

/** Exposes the store on `window.__coolboston` outside production, or when NEXT_PUBLIC_TEST_HOOK=1. */
export function installTestHook() {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_TEST_HOOK !== "1") return;
  window.__coolboston = { store: dashboardStore };
}
