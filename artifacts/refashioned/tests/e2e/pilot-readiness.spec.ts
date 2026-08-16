import { expect,test } from "@playwright/test";
import path from "node:path";

const adminStorageState=path.resolve(new URL("../../playwright/.auth/admin.json",import.meta.url).pathname);
const PRODUCT="Pilot Readiness E2E Product";
const STAGE="Pilot Readiness E2E lifecycle stage";
const evidenceActionText=`Every lifecycle stage requires approved, clean, fingerprinted evidence for “${PRODUCT}”.`;
test.use({storageState:adminStorageState});
test.describe.configure({retries:0});

test("trusted evidence removes the dedicated readiness blocker and increases completeness",async({page})=>{
  await page.goto("/dashboard");
  await expect(page.getByRole("heading",{name:/pilot readiness/i})).toBeVisible();
  const productRow=page.getByText(PRODUCT,{exact:true}).locator("../..");
  await expect(productRow).toContainText("Evidence: Pending review");
  const beforeText=await productRow.locator("strong").innerText();
  const before=Number(beforeText.replace("%",""));
  const actionCenter=page.locator('section[aria-labelledby="action-center-title"]');
  await expect(actionCenter.getByText(evidenceActionText,{exact:true})).toBeVisible();

  await page.goto("/traceability");
  await page.getByTestId("select-product").selectOption({label:`${PRODUCT} — PILOT-READY`});
  const stage=page.getByRole("row").filter({hasText:STAGE});
  await expect(stage).toContainText("Ready for review");
  await stage.getByRole("button",{name:"Approve"}).click();
  await expect(stage).toContainText("approved");

  await page.goto("/dashboard");
  const updatedRow=page.getByText(PRODUCT,{exact:true}).locator("../..");
  await expect(updatedRow).toContainText("Evidence: Trusted");
  const after=Number((await updatedRow.locator("strong").innerText()).replace("%",""));
  expect(after).toBeGreaterThan(before);
  await expect(actionCenter.getByText(evidenceActionText,{exact:true})).toHaveCount(0);
});
