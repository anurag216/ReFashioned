import { expect, test } from "@playwright/test";

test("guest user can open the public join page without auth redirect", async ({ page }) => {
  await page.goto("/join?token=test-123");

  await expect(page.getByText(/sustainability intelligence platform/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /invite not found/i })).toBeVisible();
  await expect(page.getByText(/this invite link is invalid or has expired/i)).toBeVisible();
  await expect(page).not.toHaveURL(/\/login|\/dashboard/);
});
