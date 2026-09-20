import { expect, test, type Locator, type Page } from "@playwright/test";
import { desktopOnly, dismissHostingFeedback, loginAsAdmin } from "./helpers";

const allowDestructive = process.env.QA_ALLOW_DESTRUCTIVE === "true";
const runKey = (process.env.QA_RUN_KEY || "local").replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "local";

async function waitForOption(select: Locator, name: string) {
  await expect(select).toBeVisible();
  await expect.poll(
    async () => select.locator("option", { hasText: name }).count(),
    { timeout: 30_000, message: `Waiting for product option: ${name}` },
  ).toBeGreaterThan(0);
  return select.locator("option", { hasText: name }).first();
}

async function openSyntheticProduct(page: Page, name: string) {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Product Catalog" })).toBeVisible();
  const link = page.getByRole("link", { name, exact: true });
  try {
    await expect(link).toBeVisible({ timeout: 30_000 });
  } catch {
    return false;
  }
  await link.click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  return true;
}

test.describe("live remediation, evidence and DPP trust workflow", () => {
  test("[truthfulness][Critical] a product with zero lifecycle stages is not described as all clear", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "requires synthetic product created by full audit mode");
    await loginAsAdmin(page);

    const productName = `UI QA Product ${runKey}`;
    await page.goto("/traceability");
    const select = page.getByTestId("select-product");
    let matching: Locator;
    try {
      matching = await waitForOption(select, productName);
    } catch {
      test.skip(true, "Synthetic empty product is unavailable; product creation test may have been blocked");
      return;
    }
    const value = await matching.getAttribute("value");
    if (!value) test.skip(true, "Synthetic product option has no id");
    await select.selectOption(value!);
    await expect(page.getByText("0 stages tracked")).toBeVisible();
    await expect(page.getByText(/No stages found for this product/i)).toBeVisible();
    await expect(page.getByText(/All clear\. No anomalies detected across the supply chain/i)).toHaveCount(0);
  });

  test("[materials][High] product composition cannot be mutated above 100 percent", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "requires synthetic baseline import");
    await loginAsAdmin(page);

    const productName = `Sample Carryover Tee [QA ${runKey}]`;
    if (!(await openSyntheticProduct(page, productName))) test.skip(true, "Synthetic baseline product is unavailable");
    await expect(page.getByText("Recorded composition: 80%")).toBeVisible();

    await page.getByPlaceholder("Material name").fill(`QA overfill ${runKey}`);
    await page.getByPlaceholder("Percentage").fill("30");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(/exceed|100|composition/i).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Recorded composition: 80%")).toBeVisible();
    await expect(page.getByText(`QA overfill ${runKey}`, { exact: true })).toHaveCount(0);
  });

  test("[evidence][Critical] uploaded document never becomes verified merely because upload succeeded", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "requires synthetic baseline import and creates one synthetic stage/evidence record");
    test.setTimeout(180_000);
    await loginAsAdmin(page);

    const productName = `Essential Organic Cotton Tee [QA ${runKey}]`;
    await page.goto("/traceability");
    const select = page.getByTestId("select-product");
    let matching: Locator;
    try {
      matching = await waitForOption(select, productName);
    } catch {
      test.skip(true, "Synthetic baseline product is unavailable");
      return;
    }
    const productId = await matching.getAttribute("value");
    if (!productId) test.skip(true, "Synthetic baseline product has no id");
    await select.selectOption(productId!);

    const stageName = `QA Evidence Stage ${runKey}`;
    const fileName = `qa-evidence-${runKey}.pdf`;
    await page.getByRole("button", { name: "Add Stage" }).click();
    await page.getByPlaceholder("e.g. Raw Material Sourcing").fill(stageName);
    await page.getByPlaceholder("e.g. Maharashtra, India").fill("Synthetic QA Facility");
    await page.getByPlaceholder("1", { exact: true }).fill("99");

    const pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Count 0 >>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n",
      "utf8",
    );
    await page.locator("input[type='file'][accept*='application/pdf']").setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: pdf,
    });
    await page.getByRole("button", { name: "Save Stage" }).click();
    await expect(page.getByRole("heading", { name: "Add Lifecycle Stage" })).toHaveCount(0, { timeout: 90_000 });
    await expect(page.getByText(stageName, { exact: true })).toBeVisible();

    const evidence = page.locator("section").filter({ hasText: fileName }).first();
    await expect(evidence).toBeVisible({ timeout: 45_000 });
    const evidenceText = await evidence.innerText();
    expect(evidenceText).toMatch(/Security scan pending|Ready for review|quarantined|pending review/i);
    expect(evidenceText).not.toMatch(/\bapproved\b|\bverified\b/i);
  });

  test("[dpp][Critical] product with current blockers cannot silently publish a public passport", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "requires synthetic incomplete product and may exercise publish rejection");
    await loginAsAdmin(page);

    const productName = `Sample Carryover Tee [QA ${runKey}]`;
    if (!(await openSyntheticProduct(page, productName))) test.skip(true, "Synthetic baseline product is unavailable");
    const blockerText = await page.getByText(/blocker/).first().innerText();
    if (/^0\s+blocker/i.test(blockerText)) test.skip(true, "Synthetic product unexpectedly has no readiness blockers");

    await dismissHostingFeedback(page);\n    await page.getByRole("link", { name: "Open DPP" }).click();
    await expect(page.getByText("Publication status")).toBeVisible();
    const publish = page.getByRole("button", { name: /Publish Passport|Publish updates/ }).first();
    if (!(await publish.count())) test.skip(true, "Passport is not in a publishable UI state for this scenario");

    await publish.click();
    await page.waitForTimeout(1_000);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("Passport snapshot published.");
    expect(body).not.toContain("View live passport");

    const unpublish = page.getByRole("button", { name: "Unpublish" });
    if (await unpublish.count()) await unpublish.click();
  });
});
