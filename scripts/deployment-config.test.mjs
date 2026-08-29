import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deploymentConfigs = [
  ".replit",
  "artifacts/refashioned/.replit-artifact/artifact.toml",
  "artifacts/api-server/.replit-artifact/artifact.toml",
];

const automaticSchemaMutation = [
  /drizzle-kit\s+push/i,
  /pnpm\s+--filter\s+(?:@workspace\/)?db\s+(?:run\s+)?push(?:-force)?\b/i,
  /\bdb\s+push-force\b/i,
  /supabase\s+db\s+push/i,
  /supabase\s+migration\s+(?:up|repair)/i,
];

test("Replit deployment configuration cannot mutate a database automatically", async () => {
  for (const path of deploymentConfigs) {
    const config = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    for (const forbidden of automaticSchemaMutation) {
      assert.doesNotMatch(config, forbidden, `${path} contains automatic schema mutation: ${forbidden}`);
    }

    const postMergePath = config.match(/^path\s*=\s*["']([^"']+)["']/m)?.[1];
    if (config.includes("[postMerge]") && postMergePath) {
      const hook = await readFile(new URL(`../${postMergePath}`, import.meta.url), "utf8");
      for (const forbidden of automaticSchemaMutation) {
        assert.doesNotMatch(hook, forbidden, `${postMergePath} contains automatic schema mutation: ${forbidden}`);
      }
    }
  }
});

test("Replit hosting does not self-bootstrap a different pnpm binary", async () => {
  const npmrc = await readFile(new URL("../.npmrc", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.match(
    npmrc,
    /^manage-package-manager-versions=false$/m,
    "Replit hosting must use its provided pnpm binary instead of self-bootstrapping during package install",
  );
  assert.equal(packageJson.packageManager, "pnpm@10.28.1", "repository pnpm version pin must remain explicit");
});
