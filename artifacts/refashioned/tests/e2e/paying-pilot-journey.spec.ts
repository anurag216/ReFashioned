import { expect, test, type Page } from "@playwright/test";

const PILOT_ADMIN_EMAIL = "admin@maison-verde.test.invalid";
const PILOT_PRODUCT_ID = "a1130000-0000-4000-8000-000000000001";

async function signIn(page: Page) {
  const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
  if (!password) throw new Error("PLAYWRIGHT_E2E_PASSWORD is required for the local pilot fixture");
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill(PILOT_ADMIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

test("[pilot:onboarding][pilot:audit] creates and renames an organization through customer boundaries", async ({ page }) => {
  const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
  if (!password) throw new Error("PLAYWRIGHT_E2E_PASSWORD is required for the local pilot fixture");
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill("onboarding@maison-verde.test.invalid");
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Welcome! Let's set up your brand.")).toBeVisible();
  await page.getByLabel("Brand Name").fill("Maison Verde Onboarding Test Pilot");
  await page.getByRole("button", { name: "Complete Setup" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Maison Verde Onboarding Test Pilot", { exact: true })).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Organization Profile" })).toBeVisible();
  await page.getByLabel("Organization name").fill("Maison Verde Onboarding Test Pilot Renamed");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Organization name updated.");
  await page.reload();
  await expect(page.getByText("Maison Verde Onboarding Test Pilot Renamed", { exact: true }).first()).toBeVisible();

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Audit Trail" })).toBeVisible();
  await expect(page.getByText(/organization updated/i).first()).toBeVisible();
});

test("[pilot:workspace] Maison Verde paying-pilot browser smoke journey", async ({ page }) => {
  const applicationErrors: string[] = [];
  page.on("pageerror", error => applicationErrors.push(error.message));
  await signIn(page);

  await expect(page.getByText("Maison Verde Test Pilot", { exact: true })).toBeVisible();
  const destinations = [
    ["Dashboard", "/dashboard", "Pilot Readiness"],
    ["Products", "/products", "Product Catalog"],
    ["Import Data", "/import", "Import Data"],
    ["Lifecycle Traceability", "/traceability", "Product Journey"],
    ["Supplier Portal", "/suppliers", "Supplier Portal"],
    ["CSRD Data Readiness", "/reports/csrd", "CSRD Data Readiness"],
    ["Settings", "/settings", "Settings"],
    ["Audit Trail", "/audit", "Audit Trail"],
  ] as const;

  for (const [label, path, heading] of destinations) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
  }

  await page.goto(`/products/${PILOT_PRODUCT_ID}`);
  await expect(page.getByRole("heading", { name: "Organic Cotton Overshirt [TEST]", exact: true })).toBeVisible();
  await expect(page.getByText("CO₂: No data").first()).toBeVisible();
  await expect(page.getByText("Water: No data").first()).toBeVisible();
  await page.goto(`/passport?productId=${PILOT_PRODUCT_ID}`);
  await expect(page.getByRole("heading", { name: "Organic Cotton Overshirt [TEST]", exact: true })).toBeVisible();
  await page.goto("/dashboard");

  for (const removedLabel of ["Billing", "Regulatory Radar", "Carbon Calculator"]) {
    await expect(page.getByRole("link", { name: removedLabel, exact: true })).toHaveCount(0);
  }
  for (const removedPath of ["/settings/billing", "/regulatory", "/calculator"]) {
    await page.goto(removedPath);
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
  }
  expect(applicationErrors, `uncaught application errors: ${applicationErrors.join(" | ")}`).toEqual([]);
});
