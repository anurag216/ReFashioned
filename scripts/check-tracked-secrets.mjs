import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { scanTrackedFiles } from "./secret-scanner.mjs";

const trackedPaths = execFileSync("git", ["ls-files", "-z"])
  .toString()
  .split("\0")
  .filter(Boolean);

const findings = scanTrackedFiles(trackedPaths, (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
});

if (findings.length > 0) {
  console.error(
    "Potential committed authentication secrets or generated files found:",
  );
  for (const { path, category } of findings)
    console.error(`- ${path}: ${category}`);
  process.exit(1);
}

console.log(
  "No tracked authentication secret patterns or generated artifacts found.",
);
