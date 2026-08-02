import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "rockerarvi@gmail.com";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "Playwrighttest@123";

test("login and logout lifecycle completes cleanly", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder("you@company.com").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /sustainability metrics/i })).toBeVisible();

  await page.getByTitle("Sign out").click();
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /sustainability metrics/i })).toHaveCount(0);
});
