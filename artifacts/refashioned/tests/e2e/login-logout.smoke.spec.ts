import { expect, test } from "@playwright/test";
import { requirePlaywrightAuthEnvironment } from "./authEnvironment";

test("login and logout lifecycle completes cleanly", async ({ page }) => {
  const { adminEmail, adminPassword } = requirePlaywrightAuthEnvironment();
  await page.goto("/");

  await page.getByPlaceholder("you@company.com").fill(adminEmail);
  await page.getByPlaceholder("••••••••").fill(adminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /sustainability metrics/i })).toBeVisible();

  await page.getByTitle("Sign out").click();
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /sustainability metrics/i })).toHaveCount(0);
});
