import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { desktopOnly, loginAsAdmin } from "./helpers";

type ImportType = "products" | "suppliers" | "product_materials" | "lifecycle_stages";

const fixtures = path.resolve("tests/fixtures/live-audit");
const runKey = (process.env.QA_RUN_KEY || "local").replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "local";
const allowDestructive = process.env.QA_ALLOW_DESTRUCTIVE === "true";

function fixture(name: string) {
  return readFileSync(path.join(fixtures, name), "utf8").replace(/^\uFEFF/, "");
}

function uniqueify(csv: string, type: ImportType) {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length) throw new Error(parsed.errors[0].message);
  const productKey = (value: string) => value ? `${value}-${runKey}`.slice(0, 100) : value;
  const supplierKey = (value: string) => value ? `${value}-${runKey}`.slice(0, 120) : value;
  const rows = parsed.data.map(row => {
    const next = { ...row };
    if (type === "products") {
      next.sku = productKey(next.sku);
      next.name = `${next.name} [QA ${runKey}]`;
    }
    if (type === "suppliers") next.supplier_reference = supplierKey(next.supplier_reference);
    if (type === "product_materials") next.product_sku = productKey(next.product_sku);
    if (type === "lifecycle_stages") {
      next.product_sku = productKey(next.product_sku);
      next.supplier_reference = supplierKey(next.supplier_reference);
    }
    return next;
  });
  return Papa.unparse(rows);
}

async function uploadAndValidate(page: import("@playwright/test").Page, type: ImportType, name: string, csv: string) {
  await page.goto("/import");
  await page.getByLabel("Import type").selectOption(type);
  await page.getByLabel("Upload CSV").setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText(/Preview \(\d+ rows\)/)).toBeVisible();
  await page.getByRole("button", { name: "Validate on server" }).click();
  await expect(page.getByRole("heading", { name: "Validation result" })).toBeVisible();
}

async function commitValid(page: import("@playwright/test").Page) {
  await expect(page.getByText("Invalid: 0")).toBeVisible();
  await page.getByRole("button", { name: "Import validated data" }).click();
  await expect(page.getByText(/Import completed:/)).toBeVisible();
}

test.describe("live canonical bulk import", () => {
  test("[import][Critical] full valid baseline imports transactionally in canonical order", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    test.skip(!allowDestructive, "Run workflow_dispatch with allow_destructive=true to commit synthetic live data");
    test.setTimeout(480_000);
    await loginAsAdmin(page);

    const sequence: Array<[ImportType, string]> = [
      ["products", "01_products_valid_baseline.csv"],
      ["suppliers", "02_suppliers_valid_baseline.csv"],
      ["product_materials", "03_product_materials_valid_baseline.csv"],
      ["lifecycle_stages", "04_lifecycle_stages_valid_baseline.csv"],
    ];

    for (const [type, name] of sequence) {
      const csv = uniqueify(fixture(name), type);
      await uploadAndValidate(page, type, `${runKey}-${name}`, csv);
      await commitValid(page);
    }

    await page.goto("/products");
    await expect(page.getByText(`Essential Organic Cotton Tee [QA ${runKey}]`, { exact: true })).toBeVisible();
    await page.goto("/traceability");
    await expect(page.getByTestId("select-product")).toContainText(`Essential Organic Cotton Tee [QA ${runKey}]`);
  });

  const dirtyFiles: Array<[ImportType, string]> = [
    ["products", "11_products_dirty_validation.csv"],
    ["suppliers", "12_suppliers_dirty_validation.csv"],
    ["product_materials", "13_product_materials_dirty_validation.csv"],
    ["lifecycle_stages", "14_lifecycle_stages_dirty_validation.csv"],
  ];

  for (const [type, name] of dirtyFiles) {
    test(`[import][High] ${name} fails closed with row-level validation`, async ({ page }, testInfo) => {
      test.skip(desktopOnly(testInfo), "desktop-only functional audit");
      await loginAsAdmin(page);
      await uploadAndValidate(page, type, name, fixture(name));
      const invalid = page.getByText(/Invalid: [1-9]\d*/);
      await expect(invalid).toBeVisible();
      await expect(page.getByRole("alert").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Import validated data" })).toHaveCount(0);
    });
  }
});
