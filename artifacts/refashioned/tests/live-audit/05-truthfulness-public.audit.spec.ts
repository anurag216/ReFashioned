import { expect, test } from "@playwright/test";
import { desktopOnly, loginAsAdmin } from "./helpers";

test.describe("sustainability truthfulness, reporting and public boundaries", () => {
  test("[dpp][High] DPP opens for the currently selected traceability product", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/traceability");
    const selector = page.getByTestId("select-product");
    await expect(selector).toBeVisible();
    const options = await selector.locator("option").count();
    if (!options) test.skip(true, "No live products are available for DPP testing");
    await page.getByTestId("button-view-dpp").click();
    await expect(page).toHaveURL(/\/passport\?productId=/);
    await expect(page.getByText("Publication status")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Draft|Published|Updates pending publication|Not publicly accessible/ })).toBeVisible();
  });

  test("[truthfulness][Critical] CSRD report explicitly distinguishes missing data from zero", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/reports/csrd");
    await expect(page.getByRole("heading", { name: "CSRD Data Readiness" })).toBeVisible();
    await expect(page.getByText(/Missing values are not estimated and are not treated as zero/i)).toBeVisible();
    await expect(page.getByText(/not legal advice|not.*determination of CSRD compliance/i)).toBeVisible();
  });

  test("[truthfulness][Critical] dashboard never presents missing environmental observations as zero", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    const body = await page.locator("body").innerText();
    const explicitlyMissing = /No lifecycle impact data has been recorded yet/i.test(body);
    if (explicitlyMissing) {
      expect(body).not.toMatch(/0\s*·\s*No data yet/i);
    }
  });

  test("[truthfulness][Critical] supplier onboarding coverage is derived from records, not a fixed pilot percentage", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/suppliers");
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("Current coverage: 60%");
    expect(body).not.toContain("2 of 3 suppliers complete");
  });

  test("[truthfulness][Critical] product workspace never renders literal zero for unknown CO2/water labels", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    await page.goto("/products");
    const firstProduct = page.locator("tbody a[href^='/products/']").first();
    if (!(await firstProduct.count())) test.skip(true, "No product records available in live QA tenant");
    await firstProduct.click();
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/CO₂:\s*0(?:\.0+)?\s*(?:kg|kg CO₂e)?\b/i);
    expect(text).not.toMatch(/Water:\s*0(?:\.0+)?\s*L\b/i);
  });

  test("[public][High] invalid public passport slug fails safely without internal shell or PII", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await page.goto("/p/not-a-real-passport-slug-live-qa");
    await expect(page.getByRole("link", { name: /^dashboard$/i })).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/organization_members|supplier_access_memberships|storage\/v1|service_role/i);
  });

  test("[privacy][Critical] authenticated application pages do not visibly expose implementation secrets", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "desktop-only functional audit");
    await loginAsAdmin(page);
    for (const route of ["/dashboard", "/products", "/suppliers", "/audit"]) {
      await page.goto(route);
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/);
    }
  });
});
