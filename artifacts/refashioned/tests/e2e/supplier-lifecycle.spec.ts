import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const SUPPLIER_NAME = "Tenant A Supplier";
const PRODUCT_NAME = "Tenant A Product";
const STAGE_NAME = "E2E Material Production";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("supplier lifecycle", () => {
test.describe.configure({ retries: 0 });

test("supplier invitation, evidence, and revocation lifecycle", async ({ browser, baseURL }) => {
  const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
  const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  const supplierEmail = process.env.PLAYWRIGHT_SUPPLIER_EMAIL;
  if (!password) throw new Error("PLAYWRIGHT_E2E_PASSWORD is required");
  if (!adminEmail) throw new Error("PLAYWRIGHT_ADMIN_EMAIL is required");
  if (!supplierEmail) throw new Error("PLAYWRIGHT_SUPPLIER_EMAIL is required");
  if (!baseURL) throw new Error("PLAYWRIGHT_BASE_URL is required");

  let adminContext: BrowserContext | undefined;
  let supplierContext: BrowserContext | undefined;
  let replayContext: BrowserContext | undefined;

  try {
    adminContext = await browser.newContext({ baseURL });
    supplierContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();
    const supplierPage = await supplierContext.newPage();

    // Create the one-time invitation through the internal application.
    await signIn(adminPage, adminEmail, password);
    await adminPage.waitForURL("**/dashboard");
    await adminPage.goto("/suppliers");
    await expect(adminPage.getByText(SUPPLIER_NAME).first()).toBeVisible();
    await adminPage.getByTestId("button-invite-supplier").click();
    await adminPage.getByTestId("select-invite-supplier").selectOption({ label: SUPPLIER_NAME });
    await adminPage.getByTestId("input-invite-email").fill(supplierEmail);
    await adminPage.getByTestId("button-send-invite").click();

    const magicLinkInput = adminPage.getByText("Magic Link", { exact: true }).locator("..").locator("input");
    await expect(magicLinkInput).toBeVisible();
    const magicLink = await magicLinkInput.inputValue();
    const invitationUrl = new URL(magicLink);
    expect(invitationUrl.pathname).toBe("/join");
    expect(invitationUrl.searchParams.get("token")).toMatch(/^[0-9a-f]{64}$/);

    // Anonymous metadata is intentionally limited to business-safe context.
    await supplierPage.goto(magicLink);
    await expect(supplierPage.getByRole("heading", { name: "Join Tenant A" })).toBeVisible();
    await expect(supplierPage.getByText(`Supplier: ${SUPPLIER_NAME}`)).toBeVisible();
    await expect(supplierPage.getByText(/Invited account:/)).toContainText("@e2e.local");
    const publicInvitation = supplierPage.locator("body");
    await expect(publicInvitation).not.toContainText("e2e00000-0000-4000-8000-000000000001");
    await expect(publicInvitation).not.toContainText("e2e40000-0000-4000-8000-000000000001");
    await expect(publicInvitation).not.toContainText(/token hash|created_by|audit data|E2E Contact/i);

    // Authenticate and redeem in the supplier's independent browser context.
    await supplierPage.getByLabel("Email").fill(supplierEmail);
    await supplierPage.getByLabel("Password").fill(password);
    await supplierPage.getByRole("button", { name: "Sign in" }).click();
    await expect(supplierPage.getByText(`Signed in as ${supplierEmail}`)).toBeVisible();
    const tasksResponsePromise = Promise.race([
      supplierPage.waitForResponse(response =>
        response.url().includes("/rpc/get_my_supplier_evidence_tasks"),
      ),
      supplierPage.waitForEvent("pageerror").then(error => { throw error; }),
    ]);
    await supplierPage.getByRole("button", { name: "Accept supplier invitation" }).click();
    await supplierPage.waitForURL("**/supplier");
    const tasksResponse = await tasksResponsePromise;
    expect(tasksResponse.ok()).toBeTruthy();
    const initialTasks = await tasksResponse.json() as Array<Record<string, unknown>>;
    expect(initialTasks).toContainEqual(expect.objectContaining({
      product_name: PRODUCT_NAME,
      stage_name: STAGE_NAME,
      document_requirement: "Evidence document",
      evidence_status: null,
    }));

    await expect(supplierPage.getByRole("heading", { name: "Supplier access active" })).toBeVisible();
    await expect(supplierPage.getByText(`${SUPPLIER_NAME} · signed in as ${supplierEmail}`)).toBeVisible();
    const task = supplierPage.getByRole("listitem").filter({ hasText: STAGE_NAME });
    await expect(task).toContainText(`${PRODUCT_NAME} — ${STAGE_NAME}`);
    await expect(task).toContainText("Evidence document");
    await expect(task).toContainText("Status: not submitted");
    await expect(supplierPage.locator("body")).not.toContainText(/Tenant B Secret Product|Tenant B organization|Tenant B supplier/i);
    await expect(supplierPage.getByRole("link", { name: /^dashboard$/i })).toHaveCount(0);

    for (const internalPath of ["/dashboard", "/suppliers", "/products", "/audit"]) {
      await supplierPage.goto(internalPath);
      await expect(supplierPage.getByRole("heading", { name: "Supplier access active" })).toBeVisible();
      await expect(supplierPage.getByText(PRODUCT_NAME)).toBeVisible();
      await expect(supplierPage.getByText("Tenant B Secret Product")).toHaveCount(0);
    }

    // Exercise intent creation, Storage upload, finalization, and task refresh.
    await task.locator('input[type="file"]').setInputFiles({
      name: "e2e-supplier-proof.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% deterministic E2E supplier evidence\n%%EOF\n"),
    });
    await expect(task).toContainText("Status: Security scan pending");
    await expect(task.getByRole("button", { name: "View submission" })).toHaveCount(0);

    // Local-only deterministic scanner fixture uses service_role; no browser or
    // production path can attest a clean verdict.
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey || !["127.0.0.1", "localhost"].includes(new URL(supabaseUrl).hostname)) {
      throw new Error("A local Supabase service-role scanner fixture is required");
    }
    const scanner = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: evidence, error: evidenceError } = await scanner.from("evidence_uploads")
      .select("id,storage_bucket,storage_path,size_bytes,mime_type").eq("lifecycle_stage_id", "e2e50000-0000-4000-8000-000000000001").single();
    if (evidenceError || !evidence) throw new Error(`Scanner fixture could not resolve evidence: ${evidenceError?.message}`);
    const bytes = Buffer.from("%PDF-1.4\n% deterministic E2E supplier evidence\n%%EOF\n");
    const { error: scanError } = await scanner.rpc("record_evidence_scan_result", {
      p_evidence_id: evidence.id, p_storage_bucket: evidence.storage_bucket, p_storage_path: evidence.storage_path,
      p_size_bytes: evidence.size_bytes, p_declared_mime: evidence.mime_type, p_detected_mime: "application/pdf",
      p_content_sha256: createHash("sha256").update(bytes).digest("hex"), p_verdict: "clean",
      p_scan_engine: "deterministic-local-fixture", p_scan_result: "clean",
    });
    if (scanError) throw new Error(`Scanner fixture verdict failed: ${scanError.message}`);
    await supplierPage.reload();
    await expect(task).toContainText("Status: Ready for review");
    const viewSubmission = task.getByRole("button", { name: "View submission" });
    await expect(viewSubmission).toBeVisible();

    // Any signed-URL page is closed without inspecting or logging its URL.
    supplierContext.on("page", openedPage => void openedPage.close());
    await viewSubmission.click();
    await expect(viewSubmission).toBeEnabled();
    await expect(task.getByText("Document access was not authorized.")).toHaveCount(0);

    await adminPage.goto("/traceability");
    await adminPage.getByTestId("select-product").selectOption({ label: `${PRODUCT_NAME} — TENANT-A` });
    const adminStage = adminPage.getByRole("row").filter({ hasText: STAGE_NAME });
    await expect(adminStage).toContainText("Ready for review");
    await adminStage.getByRole("button", { name: "Approve" }).click();
    await expect(adminStage).toContainText("approved");
    const promptAnswers = ["E2E Supplier Evidence Standard", "2030-12-31"];
    adminPage.on("dialog", async dialog => dialog.accept(promptAnswers.shift()));
    await adminStage.getByRole("button", { name: "Create certification" }).click();
    await expect(adminStage).toContainText("E2E Supplier Evidence Standard · verified");

    // The redeemed token is unusable in a clean, unauthenticated browser.
    replayContext = await browser.newContext({ baseURL });
    const replayPage = await replayContext.newPage();
    await replayPage.goto(magicLink);
    await expect(replayPage.getByText("This invitation cannot be used.")).toBeVisible();
    await expect(replayPage.getByRole("button", { name: "Accept supplier invitation" })).toHaveCount(0);

    // The still-authenticated admin observes and revokes the redeemed access.
    await adminPage.goto("/suppliers");
    await adminPage.getByRole("button", { name: `Manage portal access for ${SUPPLIER_NAME}` }).click();
    const portalAccess = adminPage.getByRole("region", { name: "Supplier portal access" });
    await expect(portalAccess).toContainText(supplierEmail);
    await expect(portalAccess).toContainText("Access: active");
    await portalAccess.getByLabel("Access revocation reason").fill("E2E security revocation");
    await portalAccess.getByRole("button", { name: "Revoke access" }).click();
    await expect(portalAccess).not.toContainText("Access: active");

    // The existing authenticated supplier session must fail a fresh authorization.
    await viewSubmission.click();
    await expect(task.getByText("Document access was not authorized.")).toBeVisible();

    // A fresh authorization resolution returns no former supplier or tenant data.
    await supplierPage.reload();
    await expect(supplierPage.getByRole("heading", { name: "Supplier access active" })).toHaveCount(0);
    await expect(supplierPage.getByText(PRODUCT_NAME)).toHaveCount(0);
    await expect(supplierPage.getByText(STAGE_NAME)).toHaveCount(0);
    await expect(supplierPage.getByRole("button", { name: "View submission" })).toHaveCount(0);
    await expect(supplierPage.locator("body")).not.toContainText(/Tenant A Product|Tenant B Secret Product/);
  } finally {
    await Promise.allSettled([
      replayContext?.close(),
      supplierContext?.close(),
      adminContext?.close(),
    ]);
  }
});
});
