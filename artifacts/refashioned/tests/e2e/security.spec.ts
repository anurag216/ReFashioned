import { expect, test, type Page } from "@playwright/test";

const password = process.env.PLAYWRIGHT_E2E_PASSWORD;

async function login(page: Page, email: string) {
  if (!password) throw new Error("PLAYWRIGHT_E2E_PASSWORD is required");
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

for (const route of ["/dashboard", "/products", "/suppliers"]) {
  test(`guest cannot enter protected route ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^dashboard$/i })).toHaveCount(0);
  });
}

test("admin can access supplier invitation controls", async ({ page }) => {
  await login(page, "admin@e2e.local");
  await page.goto("/suppliers");
  await expect(page.getByTestId("button-invite-supplier")).toBeVisible();
  await expect(page.getByRole("button", { name: /add supplier/i })).toBeVisible();
});

test("viewer has no product or supplier mutation controls", async ({ page }) => {
  await login(page, "viewer@e2e.local");
  await page.goto("/products");
  await expect(page.getByRole("button", { name: /create product/i })).toHaveCount(0);
  await page.goto("/suppliers");
  await expect(page.getByRole("button", { name: /add supplier/i })).toHaveCount(0);
  await expect(page.getByTestId("button-invite-supplier")).toHaveCount(0);
});

test("manager can edit products but cannot manage supplier access", async ({ page }) => {
  await login(page, "manager@e2e.local");
  await page.goto("/products");
  await expect(page.getByRole("button", { name: /create product/i })).toBeVisible();
  await page.goto("/suppliers");
  await expect(page.getByRole("button", { name: /add supplier/i })).toBeVisible();
  await expect(page.getByTestId("button-invite-supplier")).toHaveCount(0);
});

test("Tenant A browser session cannot see Tenant B products", async ({ page }) => {
  await login(page, "admin@e2e.local");
  await page.goto("/products");
  await expect(page.getByText("Tenant A Product", { exact: true })).toBeVisible();
  await expect(page.getByText("Tenant B Secret Product", { exact: true })).toHaveCount(0);
});
