import { expect, test } from "@playwright/test";

test("guest user can open an invalid public join link without auth redirect", async ({ page }) => {
  await page.goto("/join?token=test-123");

  await expect(page.getByRole("heading", { name: /re:fashioned/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /invitation invalid/i })).toBeVisible();
  await expect(page.getByText(/this invitation cannot be used\. request a new link from the inviting organization\./i)).toBeVisible();
  await expect(page.getByText(/tenant a|tenant a supplier|(?:admin|manager|viewer)@e2e\.local/i)).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/login|\/dashboard/);
});
