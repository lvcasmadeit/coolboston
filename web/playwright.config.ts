import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/** True when web/.env.local (or the environment) has a Mapbox token. The value is never read out. */
export function hasMapboxToken(): boolean {
  if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return true;
  return existsSync(".env.local") && /^NEXT_PUBLIC_MAPBOX_TOKEN=\S+/m.test(readFileSync(".env.local", "utf8"));
}

export default defineConfig({
  testDir: "e2e",
  // One WebGL map at a time: software rendering is CPU-heavy and parallel maps time out.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    launchOptions: {
      // Headless WebGL via SwiftShader (no GPU in CI or headless macOS).
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Reuse a running `next dev` (the usual case locally).
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
