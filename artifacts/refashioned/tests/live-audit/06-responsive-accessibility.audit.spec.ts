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

  test("[responsive-a11y][Medium] keyboard focus reaches interactive controls", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await dismissHostingFeedback(page);
    const seen = new Set<string>();
    for (let i = 0; i < 18; i += 1) {
      await page.keyboard.press("Tab");
      const marker = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return "none";
        return `${el.tagName}:${el.getAttribute("aria-label") || el.getAttribute("title") || (el.textContent || "").trim().slice(0, 60)}`;
      });
      seen.add(marker);
    }
    expect(seen.size).toBeGreaterThan(4);
  });

  test("[responsive-a11y][Medium] mobile/tablet navigation drawer opens and closes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop-chromium", "mobile/tablet only");
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await dismissHostingFeedback(page);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Application navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close navigation" }).first().click();
    await expect(page.getByRole("dialog", { name: "Application navigation" })).toHaveCount(0);
  });
});
