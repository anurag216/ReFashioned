import { expect, test } from "@playwright/test";
import { APP_ROUTES, collectBasicAccessibilityIssues, dismissHostingFeedback, loginAsAdmin, saveControlInventory } from "./helpers";

test.describe("responsive and practical accessibility audit", () => {
  for (const [label, route, heading] of APP_ROUTES) {
    test(`[responsive-a11y][Medium] ${label} has no critical basic accessibility or viewport issue`, async ({ page }, testInfo) => {
      await loginAsAdmin(page);
      await page.goto(route);
      await dismissHostingFeedback(page);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await saveControlInventory(page, testInfo, `responsive-${label}-${route}`);
      const issues = await collectBasicAccessibilityIssues(page);
      await testInfo.attach("basic-accessibility-issues", {
        body: Buffer.from(JSON.stringify(issues, null, 2)),
        contentType: "application/json",
      });
      const critical = issues.filter(issue => ["unnamed-control", "unlabelled-form-control", "duplicate-id", "viewport-horizontal-overflow"].includes(issue.type));
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }

  test("[responsive-a11y][Medium] keyboard focus reaches interactive controls", async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await dismissHostingFeedback(page);

    let firstInteractive;
    if (testInfo.project.name === "mobile-chromium") {
      await page.getByRole("button", { name: "Open navigation" }).click();
      const dialog = page.getByRole("dialog", { name: "Application navigation" });
      await expect(dialog).toBeVisible();
      firstInteractive = dialog.getByRole("link", { name: "Dashboard", exact: true });
    } else {
      firstInteractive = page.getByRole("link", { name: "Dashboard", exact: true }).first();
    }

    await firstInteractive.focus();
    const seen = new Set<string>();
    for (let i = 0; i < 10; i += 1) {
      const marker = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return "none";
        return `${el.tagName}:${el.getAttribute("aria-label") || el.getAttribute("title") || (el.textContent || "").trim().slice(0, 60)}`;
      });
      seen.add(marker);
      await page.keyboard.press("Tab");
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  test("[responsive-a11y][Medium] navigation adapts correctly at tablet and mobile widths", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop-chromium", "responsive navigation only");
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await dismissHostingFeedback(page);

    if (testInfo.project.name === "tablet-chromium") {
      await expect(page.getByRole("button", { name: "Open navigation" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Dashboard", exact: true }).first()).toBeVisible();
      return;
    }

    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog", { name: "Application navigation" });
    await expect(dialog).toBeVisible();
    await dialog.locator('aside button[aria-label="Close navigation"]').click();
    await expect(dialog).toHaveCount(0);
  });
});
