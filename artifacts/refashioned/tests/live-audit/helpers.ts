import { expect, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const APP_ROUTES = [
  ["Dashboard", "/dashboard", /Pilot Readiness/i],
  ["Products", "/products", /Product Catalog/i],
  ["Import Data", "/import", /Import Data/i],
  ["Lifecycle Traceability", "/traceability", /Product Journey/i],
  ["Brand Profile", "/profile", /Organization Profile/i],
  ["CSRD Data Readiness", "/reports/csrd", /CSRD Data Readiness/i],
  ["Supplier Portal", "/suppliers", /Supplier Portal/i],
  ["Settings", "/settings", /Settings/i],
  ["Audit Trail", "/audit", /Audit Trail/i],
] as const;

export function desktopOnly(testInfo: TestInfo) {
  return testInfo.project.name !== "desktop-chromium";
}

export function requireAdminEnvironment() {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL?.trim();
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim();
  if (!email || !password) throw new Error("PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD are required");
  return { email, password };
}

export async function dismissHostingFeedback(page: Page) {
  const feedback = page.getByText("Share your feedback", { exact: true }).first();
  const visible = await feedback.isVisible().catch(() => false);
  if (!visible) return;

  const candidates = [
    page.getByRole("button", { name: /^Close$/i }).first(),
    page.locator('button[aria-label="Close"], button[title="Close"]').first(),
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click({ force: true }).catch(() => undefined);
      if (!(await feedback.isVisible().catch(() => false))) return;
    }
  }

  // Replit can inject a fixed feedback card into the deployed page. Remove only
  // the smallest fixed/absolute ancestor of the exact feedback heading so the
  // audit measures Re:Fashioned rather than hosting-provider chrome.
  await page.evaluate(() => {
    const heading = [...document.querySelectorAll<HTMLElement>("*")]
      .find(el => (el.textContent ?? "").trim() === "Share your feedback");
    if (!heading) return;
    let node: HTMLElement | null = heading;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if ((style.position === "fixed" || style.position === "absolute") && rect.width <= 700 && rect.height <= 700) {
        node.remove();
        return;
      }
      node = node.parentElement;
    }
  });
}

export async function loginAsAdmin(page: Page) {
  const { email, password } = requireAdminEnvironment();
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 45_000 });
  await dismissHostingFeedback(page);
  await expect(page.getByRole("heading", { name: /pilot readiness/i })).toBeVisible();
}

export function attachRuntimeTelemetry(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const serverErrors: string[] = [];

  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "failed"}`);
  });
  page.on("response", response => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  return { pageErrors, consoleErrors, failedRequests, serverErrors };
}

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "page";
}

export async function saveControlInventory(page: Page, testInfo: TestInfo, route: string) {
  await dismissHostingFeedback(page);
  const inventory = await page.evaluate(() => {
    const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const controls = [...document.querySelectorAll("a,button,input,select,textarea,[role='button'],[role='tab'],[role='menuitem']")]
      .map((el, index) => {
        const node = el as HTMLElement;
        const input = el as HTMLInputElement;
        return {
          index,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute("role"),
          text: text(el).slice(0, 180),
          ariaLabel: el.getAttribute("aria-label"),
          title: el.getAttribute("title"),
          placeholder: input.placeholder || null,
          type: input.type || null,
          href: el instanceof HTMLAnchorElement ? el.getAttribute("href") : null,
          disabled: "disabled" in input ? Boolean(input.disabled) : false,
          visible: Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length),
        };
      })
      .filter(item => item.visible);
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(el => {
      const node = el as HTMLElement;
      return Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    }).map(el => text(el).slice(0, 180));
    const links = controls.filter(item => item.tag === "a").map(item => ({ text: item.text, href: item.href }));
    return {
      route: location.pathname + location.search,
      url: location.href,
      title: document.title,
      controlCount: controls.length,
      headingCount: headings.length,
      linkCount: links.length,
      controls,
      headings,
      links,
    };
  });

  const dir = path.resolve("test-results/live-audit/inventory");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${testInfo.project.name}-${slug(route)}.json`);
  writeFileSync(file, `${JSON.stringify(inventory, null, 2)}\n`);
  await testInfo.attach(`control-inventory-${slug(route)}`, { path: file, contentType: "application/json" });
  return inventory;
}

export async function collectBasicAccessibilityIssues(page: Page) {
  await dismissHostingFeedback(page);
  return page.evaluate(() => {
    const issues: { type: string; detail: string }[] = [];
    const visible = (el: HTMLElement) => Boolean(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const labelFor = (el: HTMLElement) => {
      const id = el.id;
      if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return true;
      if (el.closest("label")) return true;
      return Boolean(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
    };

    document.querySelectorAll<HTMLElement>("button,[role='button'],a[href]").forEach(el => {
      if (!visible(el)) return;
      const name = (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").trim();
      if (!name) issues.push({ type: "unnamed-control", detail: el.outerHTML.slice(0, 300) });
    });

    document.querySelectorAll<HTMLElement>("input:not([type='hidden']),select,textarea").forEach(el => {
      if (!visible(el)) return;
      if (!labelFor(el)) issues.push({ type: "unlabelled-form-control", detail: el.outerHTML.slice(0, 300) });
    });

    document.querySelectorAll<HTMLImageElement>("img").forEach(img => {
      if (visible(img) && !img.hasAttribute("alt")) issues.push({ type: "image-missing-alt", detail: img.outerHTML.slice(0, 300) });
    });

    const ids = new Map<string, number>();
    document.querySelectorAll<HTMLElement>("[id]").forEach(el => ids.set(el.id, (ids.get(el.id) ?? 0) + 1));
    for (const [id, count] of ids) if (id && count > 1) issues.push({ type: "duplicate-id", detail: `${id} occurs ${count} times` });

    if (document.documentElement.scrollWidth > window.innerWidth + 2) {
      issues.push({ type: "viewport-horizontal-overflow", detail: `${document.documentElement.scrollWidth}px content in ${window.innerWidth}px viewport` });
    }

    return issues;
  });
}

export async function assertNoFatalTelemetry(telemetry: ReturnType<typeof attachRuntimeTelemetry>) {
  expect(telemetry.pageErrors, `uncaught browser errors: ${telemetry.pageErrors.join(" | ")}`).toEqual([]);
  expect(telemetry.serverErrors, `HTTP 5xx responses: ${telemetry.serverErrors.join(" | ")}`).toEqual([]);
}
