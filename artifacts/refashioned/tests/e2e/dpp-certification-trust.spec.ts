import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const PRODUCT_NAME = "DPP Certification Trust Product";
const STAGE_NAME = "DPP Certification Trust Stage";
const EVIDENCE_NAME = "dpp-certification-trust.pdf";
const CERTIFICATION_NAME = "E2E Evidence Standard";
const VALID_UNTIL = "2030-12-31";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("DPP certification trust chain", () => {
  test.describe.configure({ retries: 0 });

  test("publishes an approved claim deliberately and removes it immediately on revocation", async ({ browser, baseURL }) => {
    const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
    const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
    if (!email || !password || !baseURL) throw new Error("Playwright admin environment is required");

    let adminContext: BrowserContext | undefined;
    let guestContext: BrowserContext | undefined;
    try {
      adminContext = await browser.newContext({ baseURL });
      const adminPage = await adminContext.newPage();
      await signIn(adminPage, email, password);

      await adminPage.goto("/traceability");
      await expect(adminPage.getByRole("heading", { name: "Product Journey" })).toBeVisible();
      await adminPage.getByTestId("select-product").selectOption({ label: `${PRODUCT_NAME} — DPP-TRUST` });
      const stage = adminPage.getByRole("row").filter({ hasText: STAGE_NAME });
      await expect(stage).toContainText(EVIDENCE_NAME);
      await expect(stage).toContainText("Ready for review");
      await stage.getByRole("button", { name: "Approve" }).click();
      await expect(stage).toContainText("approved");

      const promptAnswers = [CERTIFICATION_NAME, VALID_UNTIL];
      adminPage.on("dialog", async dialog => {
        const answer = promptAnswers.shift();
        if (!answer) throw new Error(`Unexpected dialog: ${dialog.message()}`);
        await dialog.accept(answer);
      });
      await stage.getByRole("button", { name: "Create certification" }).click();
      await expect(stage).toContainText(`${CERTIFICATION_NAME} · verified`);

      await adminPage.getByTestId("button-view-dpp").click();
      await expect(adminPage.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();
      await adminPage.getByRole("button", { name: "Publish Passport" }).click();
      await expect(adminPage.getByText("Passport snapshot published.")).toBeVisible();
      const slug = (await adminPage.getByText(/^[0-9a-f]{64}$/).textContent())?.trim();
      expect(slug).toMatch(/^[0-9a-f]{64}$/);
      const publicPath = `/p/${slug}`;

      guestContext = await browser.newContext({ baseURL });
      const guestPage = await guestContext.newPage();
      await guestPage.goto(publicPath);
      await expect(guestPage.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();
      await expect(guestPage.getByText(CERTIFICATION_NAME)).toBeVisible();
      await expect(guestPage.getByText("Verified", { exact: true })).toBeVisible();
      await expect(guestPage.getByText(`Valid until ${VALID_UNTIL}`)).toBeVisible();

      await adminPage.goto("/traceability");
      await expect(adminPage.getByRole("heading", { name: "Product Journey" })).toBeVisible();
      await adminPage.getByTestId("select-product").selectOption({ label: `${PRODUCT_NAME} — DPP-TRUST` });
      const certifiedStage = adminPage.getByRole("row").filter({ hasText: STAGE_NAME });
      await expect(certifiedStage).toContainText(`${CERTIFICATION_NAME} · verified`);
      await certifiedStage.getByRole("button", { name: "Revoke" }).click();
      await expect(certifiedStage).toContainText(`${CERTIFICATION_NAME} · revoked`);

      await guestPage.reload();
      await expect(guestPage.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();
      await expect(guestPage.getByText(CERTIFICATION_NAME)).toHaveCount(0);

      await adminPage.getByTestId("button-view-dpp").click();
      await expect(adminPage.getByText("Internal data has changed. Republish to update the public snapshot.")).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "Republish changes" })).toBeVisible();
    } finally {
      await Promise.allSettled([guestContext?.close(), adminContext?.close()]);
    }
  });
});
