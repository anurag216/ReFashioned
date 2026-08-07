import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files", "-z"])
  .toString()
  .split("\0")
  .filter(Boolean);

const excludedFiles = new Set(["pnpm-lock.yaml", "scripts/check-tracked-secrets.mjs"]);
const findings = [];
const patterns = [
  ["Supabase auth storage-state key", new RegExp("sb-" + "[A-Za-z0-9_-]+-auth-token")],
  ["hardcoded test password", new RegExp("(?:ADMIN|TEST)[A-Z_]*PASSWORD\\s*=\\s*[\\\"'][^$][^\\\"']+[\\\"']", "i")],
  ["mock access token", new RegExp("mock[-_ ]?access[-_ ]?token", "i")],
  ["mock refresh token", new RegExp("mock[-_ ]?refresh[-_ ]?token", "i")],
];

for (const file of trackedFiles) {
  if (/(^|\/)playwright\/\.auth\//.test(file) || /(^|\/)\.auth\//.test(file)) {
    findings.push(`${file}: tracked Playwright authentication state`);
    continue;
  }
  if (excludedFiles.has(file)) continue;

  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const [category, pattern] of patterns) {
    if (pattern.test(contents)) findings.push(`${file}: ${category}`);
  }
}

if (findings.length > 0) {
  console.error("Potential committed authentication secrets found:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("No tracked authentication secret patterns found.");
