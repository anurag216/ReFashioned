import { expect, test } from "@playwright/test";
import { APP_ROUTES, assertNoFatalTelemetry, attachRuntimeTelemetry, desktopOnly, loginAsAdmin, saveControlInventory } from "./helpers";

test.describe("live application map and control inventory", () => {
  test("[navigation][High] every primary application route loads and is inventoried", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    const telemetry = attachRuntimeTelemetry(page);

    for (const [label, route, heading] of APP_ROUTES) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await saveControlInventory(page, testInfo, `${label}-${route}`);
    }

    await assertNoFatalTelemetry(telemetry);
  });

  test("[navigation][Medium] sidebar links, browser back and forward preserve route state", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.getByRole("link", { name: "Products", exact: true }).click();
    await expect(page).toHaveURL(/\/products$/);
    await page.getByRole("link", { name: "Supplier Portal", exact: true }).click();
    await expect(page).toHaveURL(/\/suppliers$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/products$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/suppliers$/);
  });

  test("[navigation][Medium] invalid route renders safe not-found state", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/definitely-not-a-real-refashioned-route");
    await expect(page.getByRole("heading", { name: /Page Not Found/i })).toBeVisible();
  });

  test("[settings][Medium] settings tabs are operable without triggering destructive privacy action", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/settings");

    const account = page.getByRole("button", { name: "Account", exact: true });
    await expect(account).toBeVisible();

    const team = page.getByRole("button", { name: "Team Access", exact: true });
    if (await team.count()) {
      await team.click();
      await expect(team).toBeVisible();
    }

    const privacy = page.getByRole("button", { name: "Privacy & Data", exact: true });
    await expect(privacy).toBeVisible();
    await privacy.click();
    await expect(page.getByRole("heading", { name: "Privacy & Data", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request account deletion", exact: true })).toBeVisible();
  });

  test("[navigation][High] Digital Product Passport sidebar link opens a usable state instead of a dead end", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.getByRole("link", { name: "Digital Product Passport", exact: true }).click();
    await expect(page).toHaveURL(/\/passport/);
    await expect(page.getByText("Product not found or passport preview unavailable.")).toHaveCount(0);
  });

  test("[navigation][High] CSRD Product Catalog CTA routes to the current product catalog", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/reports/csrd");
    const cta = page.getByRole("link", { name: "Open Product Catalog", exact: true });
    if (!(await cta.count())) test.skip(true, "Current live tenant has no CSRD blocker CTA to exercise");
    await cta.click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("heading", { name: "Product Catalog" })).toBeVisible();
  });

  test("[products][Medium] product search handles empty-result and recovery", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/products");
    const search = page.getByPlaceholder("Search by name, SKU, or season…");
    await search.fill("___QA_NO_PRODUCT_SHOULD_MATCH___");
    await expect(page.getByText("No products match your search")).toBeVisible();
    await search.fill("");
    await expect(page.getByRole("heading", { name: "Product Catalog" })).toBeVisible();
  });

  test("[suppliers][Medium] supplier search and filters are interactive", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/suppliers");
    const search = page.getByTestId("input-supplier-search");
    await search.fill("___QA_NO_SUPPLIER_SHOULD_MATCH___");
    await expect(page.getByText("No suppliers match your filter.")).toBeVisible();
    await search.fill("");
    for (const id of ["all", "active", "pending"]) {
      const filter = page.getByTestId(`filter-${id}`);
      if (await filter.count()) await filter.click();
    }
  });
});
