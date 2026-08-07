import { chromium, type FullConfig } from "@playwright/test";
import path from "node:path";
import { mkdirSync } from "node:fs";

import { requirePlaywrightAuthEnvironment } from "./authEnvironment";

const AUTH_PATH = path.resolve(new URL("../../playwright/.auth/admin.json", import.meta.url).pathname);

export default async function globalSetup(_config: FullConfig) {
  const { adminEmail, adminPassword, baseUrl } = requirePlaywrightAuthEnvironment();
  mkdirSync(path.dirname(AUTH_PATH), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();

    await page.goto(baseUrl);
    await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });

    await page.getByPlaceholder("you@company.com").fill(adminEmail);
    await page.getByPlaceholder("••••••••").fill(adminPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await page.context().storageState({ path: AUTH_PATH });
  } finally {
    await browser.close();
  }
}
