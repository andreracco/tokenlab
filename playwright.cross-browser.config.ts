import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig(baseConfig, {
  testIgnore: "preset-visuals.spec.ts",
  workers: 1,
  // View switches finish on animation frames, which WebKit and Firefox can starve on small CI runners.
  expect: { timeout: 15_000 },
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
