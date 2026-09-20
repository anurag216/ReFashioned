import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error("PLAYWRIGHT_BASE_URL is required for live audit tests");

export default defineConfig({
  testDir: "./tests/live-audit",
  outputDir: "./test-results/live-audit/artifacts",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report-live-audit", open: "never" }],
        ["./scripts/e2e/live-audit-reporter.mjs"],
      ]
    : [["list"], ["./scripts/e2e/live-audit-reporter.mjs"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet-chromium", use: { ...devices["iPad (gen 7)"], browserName: "chromium" } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
