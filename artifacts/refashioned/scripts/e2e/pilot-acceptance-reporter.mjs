import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DOMAINS = [
  ["onboarding", ({ title }) => title.includes("[pilot:onboarding]")],
  ["import", ({ file }) => file === "pilot-import.spec.ts"],
  ["workspace", ({ file, title }) => file === "product-workspace-remediation.spec.ts" || title.includes("[pilot:workspace]")],
  ["supplier access", ({ file }) => file === "supplier-lifecycle.spec.ts"],
  ["evidence trust", ({ file }) => ["dpp-certification-trust.spec.ts", "pilot-readiness.spec.ts", "supplier-lifecycle.spec.ts"].includes(file)],
  ["certifications", ({ file }) => file === "dpp-certification-trust.spec.ts"],
  ["DPP", ({ file, title }) => file === "dpp-certification-trust.spec.ts" || title.includes("[pilot:workspace]")],
  ["sustainability readiness", ({ file, title }) => file === "pilot-readiness.spec.ts" || title.includes("[pilot:workspace]")],
  ["RBAC", ({ file }) => ["security.spec.ts", "team-access-lifecycle.spec.ts"].includes(file)],
  ["lifecycle", ({ file }) => ["privacy-lifecycle.spec.ts", "supplier-lifecycle.spec.ts", "team-access-lifecycle.spec.ts"].includes(file)],
  ["audit", ({ title }) => title.includes("[pilot:audit]")],
];

export default class PilotAcceptanceReporter {
  results = new Map();

  onTestEnd(test, result) {
    this.results.set(test.id, {
      title: test.titlePath().join(" › "),
      file: path.basename(test.location.file),
      passed: result.status === "passed",
    });
  }

  onEnd() {
    const results = [...this.results.values()];
    const domains = Object.fromEntries(DOMAINS.map(([name, matches]) => {
      const matching = results.filter(matches);
      return [name, matching.length > 0 && matching.every(result => result.passed) ? "PASS" : "FAIL"];
    }));

    const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../test-results/pilot-acceptance");
    mkdirSync(output, { recursive: true });
    writeFileSync(path.join(output, "summary.json"), `${JSON.stringify({
      fixture: "Maison Verde Test Pilot",
      scope: "Playwright paying-pilot acceptance; database authorization remains a separate pgTAP CI gate",
      domains,
    }, null, 2)}\n`);

    const rows = Object.entries(domains).map(([domain, status]) => `| ${domain} | ${status} |`).join("\n");
    writeFileSync(path.join(output, "README.md"), `# Paying-pilot acceptance\n\nFixture: **Maison Verde Test Pilot**\n\nThis summary covers browser acceptance. Database authorization, tenant isolation, and audit integrity remain separately enforced by the pgTAP CI gate.\n\n| Domain | Result |\n| --- | --- |\n${rows}\n`);
  }
}
