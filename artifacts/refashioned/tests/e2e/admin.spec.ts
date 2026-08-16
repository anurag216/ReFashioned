import { expect, test } from "@playwright/test";
import path from "node:path";

const adminStorageState = path.resolve(new URL("../../playwright/.auth/admin.json", import.meta.url).pathname);

test.use({ storageState: adminStorageState });

test("admin dashboard renders the expected admin shell", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: /pilot readiness/i })).toBeVisible();
  await expect(page.getByText("Products", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^dashboard$/i }).first()).toBeVisible();
});

test("admin can access product create controls", async ({ page }) => {
  await page.goto("/products");

  await expect(page.getByRole("button", { name: /^create product$/i })).toBeVisible();
});
