import { expect, test } from "@playwright/test";
import { desktopOnly, loginAsAdmin } from "./helpers";

const allowDestructive = process.env.QA_ALLOW_DESTRUCTIVE === "true";
const runKey = (process.env.QA_RUN_KEY || "local").replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "local";

test.describe("live control interaction coverage", () => {
  test("[dashboard][Medium] Export live CSV produces a download when readiness data exists", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    const button = page.getByRole("button", { name: "Export live CSV" });
    await expect(button).toBeVisible();
    if (await button.isDisabled()) test.skip(true, "No readiness records are available to export");
    const downloadPromise = page.waitForEvent("download", { timeout: 5_000 });
    await button.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test("[import][Medium] every canonical import type can download its template", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/import");
    for (const type of ["products", "suppliers", "product_materials", "lifecycle_stages"]) {
      await page.getByLabel("Import type").selectOption(type);
      const downloadPromise = page.waitForEvent("download", { timeout: 5_000 });
      await page.getByRole("button", { name: "Download template" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(`${type}-template.csv`);
    }
  });

  test("[traceability][High] Export action produces an export instead of acting as a dead control", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/traceability");
    const exportButton = page.getByRole("button", { name: "Export", exact: true });
    await expect(exportButton).toBeVisible();
    const downloadPromise = page.waitForEvent("download", { timeout: 4_000 });
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().length).toBeGreaterThan(0);
  });

  test("[suppliers][High] Sync data action performs observable synchronization work", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/suppliers");
    const syncButton = page.getByRole("button", { name: "Sync data" });
    await expect(syncButton).toBeVisible();

    let dataRequests = 0;
    page.on("request", request => {
      if (/\/rest\/v1\/|\/rpc\//.test(request.url())) dataRequests += 1;
    });
    const before = await page.locator("body").innerText();
    await syncButton.click();
    await page.waitForTimeout(1_500);
    const after = await page.locator("body").innerText();
    expect(
      dataRequests > 0 || before !== after,
      "Sync data did not issue a data request or produce any visible state change",
    ).toBeTruthy();
  });

  test("[suppliers][Medium] invite dialog exercises supplier, email, language, certification and message controls without sending", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/suppliers");
    const invite = page.getByTestId("button-invite-supplier");
    if (!(await invite.count())) test.skip(true, "Configured live identity is not an admin or invite control is unavailable");
    await invite.click();
    await expect(page.getByRole("heading", { name: "Invite a Supplier" })).toBeVisible();

    const supplier = page.getByTestId("select-invite-supplier");
    const supplierOptions = await supplier.locator("option").count();
    if (supplierOptions > 1) await supplier.selectOption({ index: 1 });
    await page.getByTestId("input-invite-email").fill("qa-supplier@example.com");
    await page.getByRole("combobox").filter({ has: page.locator("option") }).last().selectOption("Hindi");
    const gots = page.getByRole("button", { name: /GOTS/ });
    if (await gots.count()) {
      await gots.click();
      await gots.click();
    }
    await page.getByTestId("input-invite-message").fill("Synthetic QA invitation — do not send.");
    await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
    await expect(page.getByRole("heading", { name: "Invite a Supplier" })).toHaveCount(0);
  });

  test("[audit][Medium] Refresh re-queries the audit trail and returns to an enabled state", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/audit");
    const refresh = page.getByRole("button", { name: "Refresh" });
    await expect(refresh).toBeEnabled();
    const responsePromise = page.waitForResponse(response =>
      /\/rest\/v1\/audit_logs/.test(response.url()) && response.request().method() === "GET",
      { timeout: 8_000 },
    );
    await refresh.click();
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(500);
    await expect(refresh).toBeEnabled();
  });

  test("[csrd][Medium] Print / Save PDF control invokes the browser print action", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await page.addInitScript(() => {
      Object.defineProperty(window, "__qaPrintInvoked", { value: false, writable: true, configurable: true });
      window.print = () => {
        (window as unknown as { __qaPrintInvoked: boolean }).__qaPrintInvoked = true;
      };
    });
    await loginAsAdmin(page);
    await page.goto("/reports/csrd");
    await page.getByRole("button", { name: "Print / Save PDF" }).click();
    const invoked = await page.evaluate(() => (window as unknown as { __qaPrintInvoked?: boolean }).__qaPrintInvoked);
    expect(invoked).toBe(true);
  });

  test("[profile][Medium] organization name edit persists and is restored in destructive QA mode", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "requires allow_destructive=true because it temporarily mutates the QA organization");
    await loginAsAdmin(page);
    await page.goto("/profile");
    const input = page.getByLabel("Organization name");
    if (!(await input.count())) test.skip(true, "Configured live identity is not an admin");
    const original = await input.inputValue();
    const temporary = `${original} [QA ${runKey}]`.slice(0, 120);

    try {
      await input.fill(temporary);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Organization name updated.");
      await page.reload();
      await expect(page.getByLabel("Organization name")).toHaveValue(temporary);
    } finally {
      await page.getByLabel("Organization name").fill(original);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Organization name updated.");
    }
  });
});
