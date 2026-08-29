import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DOMAINS = [
  ["onboarding", /onboarding|organization profile/i],
  ["import", /import/i],
  ["workspace", /workspace|browser smoke/i],
  ["supplier access", /supplier/i],
  ["evidence trust", /evidence|quarantin|scan/i],
  ["certifications", /certification/i],
  ["DPP", /DPP|passport/i],
  ["sustainability readiness", /readiness|CSRD|sustainability/i],
  ["RBAC", /RBAC|role|tenant|authorization/i],
  ["lifecycle", /lifecycle|privacy/i],
  ["audit", /audit|browser smoke/i],
];

export default class PilotAcceptanceReporter {
  results = [];

  onTestEnd(test, result) {
    this.results.push({ title: test.titlePath().join(" › "), passed: result.status === "passed" });
  }

  onEnd() {
    const domains = Object.fromEntries(DOMAINS.map(([name, pattern]) => {
      const matching = this.results.filter(result => pattern.test(result.title));
      return [name, matching.length > 0 && matching.every(result => result.passed) ? "PASS" : "FAIL"];
    }));
    const output = path.resolve(new URL("../../test-results/pilot-acceptance", import.meta.url).pathname);
    mkdirSync(output, { recursive: true });
    writeFileSync(path.join(output, "summary.json"), `${JSON.stringify({ fixture: "Maison Verde Test Pilot", domains }, null, 2)}\n`);
    const rows = Object.entries(domains).map(([domain, status]) => `| ${domain} | ${status} |`).join("\n");
    writeFileSync(path.join(output, "README.md"), `# Paying-pilot acceptance\n\nFixture: **Maison Verde Test Pilot**\n\n| Domain | Result |\n| --- | --- |\n${rows}\n`);
  }
}
