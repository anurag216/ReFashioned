import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.PLAYWRIGHT_VIEWER_EMAIL ?? "viewer@e2e.local";
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;

async function login(page: Page) {
  if (!password) throw new Error("PLAYWRIGHT_E2E_PASSWORD is required");
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

test("personal erasure request removes identity access but preserves tenant records", async ({ page }) => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("local Supabase service environment is required");
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(`refusing erasure test against non-local Supabase: ${host}`);

  await login(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Privacy & Data" }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Request account deletion" }).click();
  await expect(page.getByRole("status")).toContainText("requested");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  const user = users.data.users.find(candidate => candidate.email === email);
  if (!user) throw new Error("privacy lifecycle fixture user not found");
  const deletion = await admin.auth.admin.deleteUser(user.id);
  if (deletion.error) throw deletion.error;

  // The JWT remains in this same browser, but fresh database authorization no
  // longer finds a membership/profile and therefore cannot expose tenant data.
  await page.goto("/products");
  await expect(page.getByText("Tenant A Product", { exact: true })).toHaveCount(0);

  const product = await admin.from("products").select("id").eq("name", "Tenant A Product").single();
  expect(product.error).toBeNull();
  const audit = await admin.from("audit_logs").select("id,profile_id").eq("action", "privacy_erasure_requested").order("created_at", { ascending: false }).limit(1).single();
  expect(audit.error).toBeNull();
  expect(audit.data.profile_id).toBeNull();
  const membership = await admin.from("organization_members").select("id").eq("profile_id", user.id);
  expect(membership.error).toBeNull();
  expect(membership.data).toHaveLength(0);
});
