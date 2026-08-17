import { expect, test } from "@playwright/test";
import path from "node:path";

const adminStorageState = path.resolve(new URL("../../playwright/.auth/admin.json", import.meta.url).pathname);
test.use({ storageState: adminStorageState });
test.describe.configure({ retries: 0 });

test("admin imports canonical CSV while invalid rows fail closed", async ({ page }) => {
  await page.goto("/import");
  await expect(page.getByRole("heading", { name: "Import Data" })).toBeVisible();

  await page.getByLabel("Upload CSV").setInputFiles({ name: "invalid-products.csv", mimeType: "text/csv", buffer: Buffer.from("name,sku,season,status\nBroken,,SS26,published\n") });
  await page.getByRole("button", { name: "Validate on server" }).click();
  await expect(page.getByText("Invalid: 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Import validated data" })).toHaveCount(0);

  await page.getByLabel("Upload CSV").setInputFiles({ name: "pilot-products.csv", mimeType: "text/csv", buffer: Buffer.from('name,sku,season,status\n"Pilot, Imported Tee",PILOT-IMPORT-E2E,SS26,draft\n') });
  await page.getByRole("button", { name: "Validate on server" }).click();
  await expect(page.getByText("Invalid: 0")).toBeVisible();
  await page.getByRole("button", { name: "Import validated data" }).click();
  await expect(page.getByText(/Import completed: 1 created/)).toBeVisible();
  await page.goto("/products");
  await expect(page.getByText("Pilot, Imported Tee", { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  const before = Number((await page.getByText("Pilot, Imported Tee", { exact: true }).locator("../..").locator("strong").innerText()).replace("%", ""));
  await page.goto("/import");
  await page.getByLabel("Import type").selectOption("product_materials");
  await page.getByLabel("Upload CSV").setInputFiles({ name: "pilot-materials.csv", mimeType: "text/csv", buffer: Buffer.from("product_sku,material_name,composition_percentage,certification_required\nPILOT-IMPORT-E2E,Organic cotton,100,false\n") });
  await page.getByRole("button", { name: "Validate on server" }).click();
  await page.getByRole("button", { name: "Import validated data" }).click();
  await expect(page.getByText(/Import completed: 1 created/)).toBeVisible();
  await page.goto("/dashboard");
  const after = Number((await page.getByText("Pilot, Imported Tee", { exact: true }).locator("../..").locator("strong").innerText()).replace("%", ""));
  expect(after).toBeGreaterThan(before);
});
