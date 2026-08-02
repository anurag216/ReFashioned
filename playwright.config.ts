import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const rootDir = process.cwd();
const appDir = path.resolve(rootDir, "artifacts/refashioned");
const authSetup = path.resolve(appDir, "tests/e2e/auth.setup.ts");

export default defineConfig({
  testDir: path.resolve(appDir, "tests/e2e"),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "https://re-fashioned--anuragncu.replit.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: authSetup,
});
