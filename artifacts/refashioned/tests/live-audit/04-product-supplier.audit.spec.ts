import { expect, test } from "@playwright/test";
import { desktopOnly, loginAsAdmin } from "./helpers";

const allowDestructive = process.env.QA_ALLOW_DESTRUCTIVE === "true";
const runKey = (process.env.QA_RUN_KEY || "local").replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "local";

test.describe("live product and supplier operations", () => {
  test("[products][High] create modal validates required name and can be cancelled safely", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/products");
    await page.getByRole("button", { name: "Create Product", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "New Product" })).toBeVisible();
    const form = page.locator("form").filter({ has: page.getByPlaceholder("e.g. Essential Organic Cotton Tee") });
    await expect(form.getByRole("button", { name: "Create Product", exact: true })).toBeDisabled();
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "New Product" })).toHaveCount(0);
  });

  test("[products][High] create unique synthetic product and verify persisted workspace", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "requires allow_destructive=true");
    await loginAsAdmin(page);
    await page.goto("/products");
    const name = `UI QA Product ${runKey}`;
    const sku = `UIQA-${runKey}`.slice(0, 100);
    await page.getByRole("button", { name: "Create Product", exact: true }).first().click();
    const form = page.locator("form").filter({ has: page.getByPlaceholder("e.g. Essential Organic Cotton Tee") });
    await form.getByPlaceholder("e.g. Essential Organic Cotton Tee").fill(name);
    await form.getByPlaceholder("e.g. ECT-001").fill(sku);
    await form.getByRole("button", { name: "In Review", exact: true }).click();
    await form.getByRole("button", { name: "Create Product", exact: true }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`SKU: ${sku}`))).toBeVisible();
  });

  test("[suppliers][High] add-supplier modal validates required name and cancels safely", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/suppliers");
    await page.getByRole("button", { name: "Add Supplier", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Add Supplier" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Supplier" })).toBeDisabled();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Add Supplier" })).toHaveCount(0);
  });

  test("[suppliers][High] create unique synthetic supplier and verify search persistence", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "requires allow_destructive=true");
    await loginAsAdmin(page);
    await page.goto("/suppliers");
    const name = `QA Supplier ${runKey}`;
    await page.getByRole("button", { name: "Add Supplier", exact: true }).click();
    await page.getByPlaceholder("e.g. Sunrise Ginning Co.").fill(name);
    await page.getByPlaceholder("e.g. Gujarat, India").fill("Braga, Portugal");
    await page.getByRole("button", { name: "Save Supplier" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.reload();
    await page.getByTestId("input-supplier-search").fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test("[traceability][High] invalid productId deep link never exposes another product by id", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/traceability?productId=00000000-0000-4000-8000-ffffffffffff");
    await expect(page.getByRole("heading", { name: "Product Journey" })).toBeVisible();
    await expect(page.getByTestId("select-product")).toBeVisible();
  });
});
