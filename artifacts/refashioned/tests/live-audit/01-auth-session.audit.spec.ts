import { expect, test } from "@playwright/test";
import { APP_ROUTES, desktopOnly, loginAsAdmin, requireAdminEnvironment } from "./helpers";

test.describe("live authentication and session", () => {
  test("[auth][High] invalid password fails closed", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    const { email } = requireAdminEnvironment();
    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(email);
    await page.getByPlaceholder("••••••••").fill("Definitely-Wrong-Live-QA-Password!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByRole("link", { name: /^dashboard$/i })).toHaveCount(0);
  });

  for (const [, route] of APP_ROUTES.slice(0, 5)) {
    test(`[auth][Critical] guest cannot enter ${route}`, async ({ page }, testInfo) => {
      test.skip(desktopOnly(testInfo), "desktop-only functional audit");
      await page.goto(route);
      await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
      await expect(page.getByRole("link", { name: /^dashboard$/i })).toHaveCount(0);
    });
  }

  test("[auth][High] authenticated session survives refresh and deep navigation", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: /Product Catalog/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: /Product Catalog/i })).toBeVisible();
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
  });

  test("[auth][Critical] logout prevents protected content recovery with browser back", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.getByTitle("Sign out").click();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await page.goBack();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByRole("heading", { name: /pilot readiness/i })).toHaveCount(0);
  });
});
