import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scannerPath = "supabase/functions/scan-pending-evidence/index.ts";
const scanner = await readFile(new URL(`../${scannerPath}`, import.meta.url), "utf8");

test("evidence malware scanner derives verdict only from the configured provider", () => {
  assert.match(scanner, /CLOUDMERSIVE_API_KEY/);
  assert.match(scanner, /CLOUDMERSIVE_VIRUS_API_BASE_URL/);
  assert.match(scanner, /\/virus\/scan\/file/);
  assert.match(scanner, /scan\.CleanResult/);
  assert.doesNotMatch(scanner, /body\.verdict/);
});

test("evidence malware scanner preserves the trusted service-role result boundary", () => {
  assert.match(scanner, /record_evidence_scan_result/);
  assert.match(scanner, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(scanner, /status !== "quarantined"/);
  assert.match(scanner, /scan_status !== "pending"/);
  assert.match(scanner, /integrity_legacy_accepted/);
});

test("provider failures remain fail-closed instead of becoming clean verdicts", () => {
  assert.match(scanner, /evidence remains quarantined/);
  assert.match(scanner, /if \(!providerResponse\.ok\)/);
  assert.match(scanner, /typeof scan\.CleanResult !== "boolean"/);
});

test("browser callers are re-authorized against live evidence upload permissions", () => {
  assert.match(scanner, /service\.auth\.getUser\(jwt\)/);
  assert.match(scanner, /current_actor_can_upload_evidence/);
  assert.doesNotMatch(scanner, /body\.organization/i);
  assert.doesNotMatch(scanner, /body\.supplier/i);
});
