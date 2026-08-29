import { expect,test } from "@playwright/test";
import path from "node:path";

const adminStorageState=path.resolve(new URL("../../playwright/.auth/admin.json",import.meta.url).pathname);
const PRODUCT="Workspace E2E Product";
const PRODUCT_ID="e2e30000-0000-4000-8000-000000000020";
test.use({storageState:adminStorageState});
test.describe.configure({retries:0});

test("admin remediates a product and keeps product context across workflows",async({page})=>{
  await page.goto("/products");
  await page.getByRole("link",{name:PRODUCT,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/products/${PRODUCT_ID}$`));
  await expect(page.getByRole("heading",{name:PRODUCT,exact:true})).toBeVisible();
  const readinessCard=page.getByText("complete",{exact:true}).locator("..");
  const before=Number((await readinessCard.locator("strong").innerText()).replace("%",""));
  expect(before).toBeLessThan(100);
  await expect(page.getByRole("heading",{name:"Material composition must total 100%"})).toBeVisible();

  await page.getByPlaceholder("Material name").fill("Workspace organic cotton");
  await page.getByPlaceholder("Percentage").fill("100");
  await page.getByRole("button",{name:"Add",exact:true}).click();
  await expect(page.getByText("Workspace organic cotton",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Material composition must total 100%"})).toHaveCount(0);
  const after=Number((await readinessCard.locator("strong").innerText()).replace("%",""));
  expect(after).toBeGreaterThan(before);

  await page.getByRole("link",{name:"Open full traceability"}).click();
  await expect(page).toHaveURL(new RegExp(`/traceability\\?productId=${PRODUCT_ID}$`));
  await expect(page.getByTestId("select-product")).toHaveValue(PRODUCT_ID);
  await expect(page.getByTestId("select-product").locator("option:checked")).toContainText(PRODUCT);

  await page.goto(`/products/${PRODUCT_ID}`);
  await page.getByRole("link",{name:"Open DPP"}).click();
  await expect(page).toHaveURL(new RegExp(`/passport\\?productId=${PRODUCT_ID}$`));
  await expect(page.getByRole("heading",{name:PRODUCT,exact:true})).toBeVisible();
});
