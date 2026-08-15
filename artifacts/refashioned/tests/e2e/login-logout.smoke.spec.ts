import { expect, test } from "@playwright/test";

test("login and logout lifecycle completes cleanly", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_LOGOUT_EMAIL;
  const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
  if (!email || !password) throw new Error("Dedicated logout E2E identity is required");
  await page.goto("/");

  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /sustainability metrics/i })).toBeVisible();

  await page.getByTitle("Sign out").click();
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /sustainability metrics/i })).toHaveCount(0);
});
