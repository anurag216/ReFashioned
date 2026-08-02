import { chromium, type FullConfig } from "@playwright/test";
import path from "node:path";
import { mkdirSync } from "node:fs";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "rockerarvi@gmail.com";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "Playwrighttest@123";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://re-fashioned--anuragncu.replit.app";
const AUTH_PATH = path.resolve(new URL("../../playwright/.auth/admin.json", import.meta.url).pathname);

export default async function globalSetup(_config: FullConfig) {
  mkdirSync(path.dirname(AUTH_PATH), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(BASE_URL);
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });

  await page.getByPlaceholder("you@company.com").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await page.context().storageState({ path: AUTH_PATH });

  await browser.close();
}
