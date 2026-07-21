import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // Serial: the app under test is a single (dev-mode) server that compiles
  // routes on demand and shares session/draft bootstrap state — parallel
  // workers cause timeouts and cross-test interference.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "e2e/report/results.json" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
});
