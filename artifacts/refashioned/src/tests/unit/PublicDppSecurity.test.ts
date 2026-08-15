import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const publicSource = readFileSync(`${process.cwd()}/src/pages/PublicPassport.tsx`, "utf8");
const internalSource = readFileSync(`${process.cwd()}/src/pages/DigitalProductPassport.tsx`, "utf8");
const appSource = readFileSync(`${process.cwd()}/src/App.tsx`, "utf8");
const traceabilitySource = readFileSync(`${process.cwd()}/src/pages/Traceability.tsx`, "utf8");

describe("public DPP data boundary", () => {
  it("treats the route value as a public slug", () => {
    expect(appSource).toContain("<PublicPassport publicSlug={publicSlug}");
    expect(appSource).not.toContain("<PublicPassport productId=");
  });
  it("keeps every evidence upload RPC receiver-bound", () => {
    for (const rpc of ["create_evidence_upload_intent", "cancel_evidence_upload_intent", "finalize_evidence_upload"]) {
      expect(traceabilitySource).toContain(`client.rpc("${rpc}"`);
    }
    expect(traceabilitySource).not.toMatch(/const\s+\w+\s*=\s*(?:client|supabase)\.rpc(?:\s+as\b|\s*;)/);
  });
  it("uses only the curated public RPC", () => {
    expect(publicSource).toContain('supabase.rpc("get_public_product_passport"');
    expect(publicSource).not.toContain(".from(");
    expect(publicSource).not.toContain(".storage");
    expect(publicSource).not.toContain("SecureDocumentLink");
  });
  it("contains none of the removed public claims or sensitive labels", () => {
    for (const claim of ["EcoThread", "Industry Avg", "certificate_url", "Supplier", "Location", "ESPR Regulation", "Every component's lifecycle"]) expect(publicSource).not.toContain(claim);
  });
  it("uses publication RPCs and a slug-based share URL internally", () => {
    expect(internalSource).toContain('rpc("publish_product_passport"');
    expect(internalSource).toContain('rpc("unpublish_product_passport"');
    expect(internalSource).toContain('rpc("rotate_product_passport_slug"');
    expect(internalSource).toContain("/p/${publication.public_slug}");
    expect(internalSource).toContain("No lifecycle data has been recorded for this product.");
  });
});
