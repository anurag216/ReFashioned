import { expect, test } from "@playwright/test";

const requiredEnvironment = [
  "PLAYWRIGHT_BASE_URL",
  "PLAYWRIGHT_ADMIN_EMAIL",
  "PLAYWRIGHT_ADMIN_PASSWORD",
] as const;

test("deployed pilot shell and critical read-only navigation are available", async ({ page }) => {
  for (const name of requiredEnvironment) {
    if (!process.env[name]) throw new Error(`${name} is required for production smoke testing`);
  }

  const response = await page.goto("/");
  expect(response?.ok(), "public application response").toBe(true);
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

  await page.getByPlaceholder("you@company.com").fill(process.env.PLAYWRIGHT_ADMIN_EMAIL!);
  await page.getByPlaceholder("••••••••").fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  const journeys = [
    ["Dashboard", /pilot readiness/i],
    ["Products", /product catalog/i],
    ["Lifecycle Traceability", /product journey/i],
    ["Supplier Portal", /supplier portal/i],
    ["CSRD Data Readiness", /csrd data readiness/i],
    ["Settings", /^settings$/i],
    ["Audit Trail", /audit trail/i],
  ] as const;

  for (const [navigation, heading] of journeys) {
    await page.getByRole("link", { name: navigation, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }

  for (const removed of ["Billing", "Regulatory Radar", "Carbon Calculator"]) {
    await expect(page.getByRole("link", { name: removed, exact: true })).toHaveCount(0);
  }

  await page.getByTitle("Sign out").click();
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /pilot readiness/i })).toHaveCount(0);
});
