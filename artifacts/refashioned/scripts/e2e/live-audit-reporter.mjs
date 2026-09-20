import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../test-results/live-audit");
const inventoryDir = path.join(outDir, "inventory");

function domainFrom(title) {
  const matches = [...title.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
  return matches.find(value => !/^(Critical|High|Medium|Low)$/i.test(value)) ?? "other";
}
function severityFrom(title) {
  const match = title.match(/\[(Critical|High|Medium|Low)\]/i);
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : "Unclassified";
}
function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ").slice(0, 420);
}
function statusBucket(status) {
  if (status === "passed") return "passed";
  if (status === "skipped") return "skipped";
  return "failed";
}
function readInventory() {
  if (!existsSync(inventoryDir)) return [];
  return readdirSync(inventoryDir)
    .filter(name => name.endsWith(".json"))
    .flatMap(name => {
      try {
        const parsed = JSON.parse(readFileSync(path.join(inventoryDir, name), "utf8"));
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    });
}

export default class LiveAuditReporter {
  results = [];

  onTestEnd(test, result) {
    this.results.push({
      title: test.titlePath().join(" › "),
      shortTitle: test.title,
      file: path.basename(test.location.file),
      line: test.location.line,
      project: test.parent?.project()?.name ?? "unknown",
      status: result.status,
      duration_ms: result.duration,
      retry: result.retry,
      domain: domainFrom(test.title),
      severity: severityFrom(test.title),
      errors: result.errors.map(error => error.message ?? String(error)),
      attachments: result.attachments.map(item => ({ name: item.name, path: item.path ?? null, contentType: item.contentType })),
    });
  }

  onEnd() {
    mkdirSync(outDir, { recursive: true });

    // Keep the last/final outcome for each test+project after retries.
    const deduped = new Map();
    for (const item of this.results) deduped.set(`${item.project}:${item.file}:${item.title}`, item);
    const results = [...deduped.values()];
    const failed = results.filter(item => statusBucket(item.status) === "failed");
    const skipped = results.filter(item => item.status === "skipped");
    const counts = {
      total: results.length,
      passed: results.filter(item => item.status === "passed").length,
      failed: failed.length,
      skipped: skipped.length,
    };

    const domains = {};
    for (const item of results) {
      domains[item.domain] ??= { passed: 0, failed: 0, skipped: 0 };
      domains[item.domain][statusBucket(item.status)] += 1;
    }

    const severityCounts = Object.fromEntries(
      ["Critical", "High", "Medium", "Low", "Unclassified"].map(severity => [severity, failed.filter(item => item.severity === severity).length]),
    );

    const inventory = readInventory();
    const routeInventory = new Map();
    for (const item of inventory) {
      const route = item.route ?? item.url ?? "unknown";
      const prior = routeInventory.get(route) ?? { snapshots: 0, controls: 0, headings: 0, links: 0 };
      prior.snapshots += 1;
      prior.controls += Number(item.controlCount ?? item.controls?.length ?? 0);
      prior.headings += Number(item.headingCount ?? item.headings?.length ?? 0);
      prior.links += Number(item.linkCount ?? item.links?.length ?? 0);
      routeInventory.set(route, prior);
    }

    const pilotBlockers = failed.filter(item => ["Critical", "High"].includes(item.severity));
    const target = process.env.PLAYWRIGHT_BASE_URL ?? null;
    const destructiveMode = process.env.QA_ALLOW_DESTRUCTIVE === "true";

    const summary = {
      generated_at: new Date().toISOString(),
      target,
      destructive_mode: destructiveMode,
      run_key: process.env.QA_RUN_KEY ?? null,
      counts,
      severity_counts: severityCounts,
      pilot_blockers: pilotBlockers.length,
      discovered_route_inventory: Object.fromEntries(routeInventory),
      domains,
      results,
    };
    writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

    const defectRows = failed.length
      ? failed.map((item, index) => {
          const error = item.errors[0] ?? "See trace / screenshot / HTML report";
          return `| QA-${String(index + 1).padStart(3, "0")} | ${item.severity} | ${escapeCell(item.domain)} | ${escapeCell(item.project)} | ${escapeCell(item.shortTitle)} | ${escapeCell(error)} |`;
        }).join("\n")
      : "| — | — | — | — | No automated failures detected | — |";

    const blockerRows = pilotBlockers.length
      ? pilotBlockers.map((item, index) => `| PB-${String(index + 1).padStart(2, "0")} | ${item.severity} | ${escapeCell(item.domain)} | ${escapeCell(item.shortTitle)} | ${escapeCell(item.errors[0] ?? "See evidence artifacts")} |`).join("\n")
      : "| — | — | — | No Critical/High automated blocker detected | — |";

    const blockedRows = skipped.length
      ? skipped.map(item => `| ${escapeCell(item.domain)} | ${escapeCell(item.project)} | ${escapeCell(item.shortTitle)} |`).join("\n")
      : "| — | — | None |";

    const domainRows = Object.entries(domains)
      .map(([name, value]) => `| ${escapeCell(name)} | ${value.passed} | ${value.failed} | ${value.skipped} | ${value.failed ? "Failed" : value.skipped && !value.passed ? "Blocked" : "Passed"} |`)
      .join("\n");

    const inventoryRows = routeInventory.size
      ? [...routeInventory.entries()].map(([route, value]) => `| ${escapeCell(route)} | ${value.snapshots} | ${value.controls} | ${value.headings} | ${value.links} |`).join("\n")
      : "| — | 0 | 0 | 0 | 0 |";

    const securityDomains = ["auth", "security", "privacy", "public-data", "session"];
    const trustDomains = ["truthfulness", "csrd", "evidence", "certification", "dpp", "readiness"];
    const a11yDomains = ["accessibility", "responsive"];
    const summarizeDomains = names => {
      const matching = Object.entries(domains).filter(([name]) => names.some(token => name.toLowerCase().includes(token)));
      if (!matching.length) return "No dedicated automated test domain executed in this run.";
      return matching.map(([name, value]) => `- **${name}:** ${value.passed} passed, ${value.failed} failed, ${value.skipped} blocked/skipped`).join("\n");
    };

    const failureChecklist = failed.length
      ? failed.map((item, index) => `- [ ] Retest QA-${String(index + 1).padStart(3, "0")}: ${item.shortTitle}`).join("\n")
      : "- [x] No automated failures require focused retest from this run.";

    const md = `# Re:Fashioned Comprehensive Live QA Report\n\n` +
      `**Target:** ${target ?? "unknown"}  \n` +
      `**Generated:** ${summary.generated_at}  \n` +
      `**Synthetic destructive mode:** ${destructiveMode ? "ENABLED" : "DISABLED"}  \n` +
      `**Run key:** ${summary.run_key ?? "n/a"}\n\n` +
      `## 1. Executive Summary\n\n` +
      `- Automated tests/interactions executed: **${counts.total}**\n` +
      `- Passed: **${counts.passed}**\n` +
      `- Failed: **${counts.failed}**\n` +
      `- Blocked/skipped: **${counts.skipped}**\n` +
      `- Critical failures: **${severityCounts.Critical}**\n` +
      `- High failures: **${severityCounts.High}**\n` +
      `- Medium failures: **${severityCounts.Medium}**\n` +
      `- Low failures: **${severityCounts.Low}**\n` +
      `- Pages/routes inventoried: **${routeInventory.size}**\n\n` +
      `This report is generated by a real-browser Playwright audit against the deployed application. It complements the repository's deterministic local pgTAP/RBAC/security suites. It does not claim formal penetration testing or formal WCAG certification.\n\n` +
      `## 2. Pilot Blockers\n\n| ID | Severity | Area | Failure | Evidence / Actual Result |\n| --- | --- | --- | --- | --- |\n${blockerRows}\n\n` +
      `## 3. Complete Automated Defect Register\n\n| ID | Severity | Area | Browser Project | Test / Reproduction Scenario | Actual Failure |\n| --- | --- | --- | --- | --- | --- |\n${defectRows}\n\n` +
      `Exact steps, selector/action history, screenshots, videos and traces are available in the Playwright HTML/test-results artifacts for each failure.\n\n` +
      `## 4. UX / Product Feedback\n\n` +
      `Automated UX coverage checks navigation, empty/search states, modal cancellation, control discoverability, responsive overflow, browser Back/Forward behavior and error states. Qualitative wording/design judgment still benefits from human exploratory review.\n\n` +
      `## 5. Security / Privacy Findings\n\n${summarizeDomains(securityDomains)}\n\n` +
      `Live-account coverage is intentionally limited to the configured test identity. Manager/viewer/supplier authorization and cross-tenant enforcement remain covered by the repository's local deterministic Playwright and pgTAP gates unless additional live-role secrets are configured.\n\n` +
      `## 6. Sustainability / Data Trust Findings\n\n${summarizeDomains(trustDomains)}\n\n` +
      `The live suite explicitly checks that unknown environmental data is not presented as literal zero, that CSRD output states its missing-data limitations, and that public/internal surfaces do not expose obvious secret-like implementation data. Evidence/certification trust transitions are additionally enforced by local security tests.\n\n` +
      `## 7. Accessibility / Responsive Findings\n\n${summarizeDomains(a11yDomains)}\n\n` +
      `Heuristics cover accessible names/labels, duplicate IDs, keyboard focusability and horizontal overflow across desktop/tablet/mobile. These checks are practical regression coverage, not a formal WCAG conformance audit.\n\n` +
      `## 8. Coverage Matrix\n\n| Domain | Passed | Failed | Blocked/Skipped | Result |\n| --- | ---: | ---: | ---: | --- |\n${domainRows}\n\n` +
      `### Discovered route/control inventory\n\n| Route | Snapshots | Controls observed | Headings observed | Links observed |\n| --- | ---: | ---: | ---: | ---: |\n${inventoryRows}\n\n` +
      `## 9. Role Coverage\n\n` +
      `- **Admin:** live deployed-browser audit using the configured QA identity.\n` +
      `- **Manager:** deterministic local E2E/RBAC suite unless a dedicated live role is separately configured.\n` +
      `- **Viewer:** deterministic local E2E/RBAC suite unless a dedicated live role is separately configured.\n` +
      `- **Supplier:** deterministic supplier lifecycle/security suite unless a dedicated live supplier identity is separately configured.\n` +
      `- **Anonymous/Public:** live protected-route and public-passport checks.\n\n` +
      `## 10. Untested / Blocked Areas\n\n| Area | Browser Project | Scenario |\n| --- | --- | --- |\n${blockedRows}\n\n` +
      `Irreversible privacy/tenant deletion operations are not executed by the scheduled live audit. Destructive synthetic import/create coverage only runs when the workflow is manually dispatched with destructive mode enabled.\n\n` +
      `## 11. Recommended Fix Order\n\n` +
      `1. **Must fix before pilot:** all Critical and High failures above, especially authorization/privacy, false sustainability claims, corruption, or a broken core pilot journey.\n` +
      `2. **Pilot hardening:** Medium failures affecting reliability, validation clarity, state consistency or important workflow friction.\n` +
      `3. **UX improvements:** Low/cosmetic and non-blocking usability findings.\n` +
      `4. **Longer-term:** deeper manual accessibility review, qualitative UX research and additional live role accounts where useful.\n\n` +
      `## 12. Retest Checklist\n\n${failureChecklist}\n\n` +
      `## Evidence\n\nDownload the workflow artifact for the Playwright HTML report, traces, videos, screenshots, structured summary JSON and control-inventory JSON.\n`;

    writeFileSync(path.join(outDir, "QA_REPORT.md"), md);
  }
}
