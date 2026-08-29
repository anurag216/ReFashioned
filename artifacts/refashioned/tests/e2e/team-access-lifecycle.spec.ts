import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });

const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const teamEmail = process.env.PLAYWRIGHT_TEAM_MEMBER_EMAIL;

async function login(page: Page, email: string) {
  if (!password) throw new Error("PLAYWRIGHT_E2E_PASSWORD is required");
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

async function openTeamAccess(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Team Access" }).click();
  await expect(page.getByRole("heading", { name: "Team Access" })).toBeVisible();
}

test("internal team invitation, role changes, and same-session revocation", async ({ browser }) => {
  if (!adminEmail || !teamEmail) throw new Error("team lifecycle identities are required");

  const adminContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const admin = await adminContext.newPage();
  const member = await memberContext.newPage();

  await login(admin, adminEmail);
  await admin.waitForURL("**/dashboard");
  await openTeamAccess(admin);
  await admin.getByLabel("Team member email").fill(teamEmail);
  await admin.getByLabel("Team member role").selectOption("manager");
  await admin.getByRole("button", { name: "Invite team member" }).click();
  const invitationUrl = await admin.locator('input[readonly][value*="/team/join?token="]').inputValue();

  await member.goto(invitationUrl);
  await expect(member.getByRole("heading", { name: "Join Tenant A" })).toBeVisible();
  await expect(member.getByText("t***@e2e.local", { exact: false })).toBeVisible();
  await expect(member.getByText("Manager", { exact: true })).toBeVisible();
  await member.getByLabel("Email").fill(teamEmail);
  await member.getByLabel("Password").fill(password);
  await member.getByRole("button", { name: "Sign in" }).click();
  await expect(member.getByText(`Signed in as ${teamEmail}`)).toBeVisible();
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await member.waitForURL("**/dashboard");

  // Wait for the authenticated shell to settle after invite acceptance and use
  // the same client-side navigation path a real member uses. Starting a second
  // top-level page.goto here can race the invite page's final dashboard redirect.
  const productsLink = member.getByRole("link", { name: "Products", exact: true });
  await expect(productsLink).toBeVisible();
  await productsLink.click();
  await member.waitForURL("**/products");
  await expect(member.getByText("Tenant A Product", { exact: true })).toBeVisible();
  await expect(member.getByRole("button", { name: /create product/i })).toBeVisible();

  await openTeamAccess(admin);
  const memberRole = admin.getByLabel(`Role for ${teamEmail}`);
  admin.once("dialog", dialog => dialog.accept("E2E role downgrade"));
  await memberRole.selectOption("viewer");
  await expect(memberRole).toHaveValue("viewer");

  // Keep the same authenticated browser context and force fresh database/UI
  // authorization decisions; no sign-out or auth-token refresh occurs.
  await member.reload();
  await expect(member.getByText("Tenant A Product", { exact: true })).toBeVisible();
  await expect(member.getByRole("button", { name: /create product/i })).toHaveCount(0);

  admin.once("dialog", dialog => dialog.accept("E2E role restoration"));
  await memberRole.selectOption("manager");
  await expect(memberRole).toHaveValue("manager");
  await member.reload();
  await expect(member.getByRole("button", { name: /create product/i })).toBeVisible();

  admin.once("dialog", dialog => dialog.accept("E2E access revoked"));
  const memberRow = memberRole.locator("..");
  await memberRow.getByRole("button", { name: "Revoke access" }).click();
  await expect(admin.getByLabel(`Role for ${teamEmail}`)).toHaveCount(0);

  await member.reload();
  await expect(member.getByText("Tenant A Product", { exact: true })).toHaveCount(0);
  await expect(member.getByText(/set up your brand/i)).toBeVisible();

  const replay = await memberContext.newPage();
  await replay.goto(invitationUrl);
  await expect(replay.getByRole("heading", { name: "Invitation redeemed" })).toBeVisible();

  await memberContext.close();
  await adminContext.close();
});
