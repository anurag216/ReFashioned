import { describe, expect, it, vi } from "vitest";
import { uploadEvidenceDocument, type EvidenceUploadClient } from "../../lib/evidenceUpload";

function receiverSensitiveClient(
  uploadError: { message: string } | null = null,
  scanError: { message: string } | null = null,
) {
  const calls: string[] = [];
  const invoke = vi.fn(async () => ({ data: scanError ? null : { status: "clean" }, error: scanError }));
  const client = {
    marker: "bound-client",
    rpc(this: { marker: string }, name: string) {
      if (this.marker !== "bound-client") throw new Error("rpc receiver lost");
      calls.push(name);
      if (name === "create_evidence_upload_intent") return Promise.resolve({
        data: [{ evidence_id: "evidence-id", bucket_id: "compliance_docs", storage_path: "evidence/path.pdf", upload_expires_at: "2030-01-01" }],
        error: null,
      });
      return Promise.resolve({ data: null, error: null });
    },
    functions: { invoke },
    storage: { from: vi.fn(() => ({ upload: vi.fn(async () => ({ error: uploadError })) })) },
  };
  return { client: client as unknown as EvidenceUploadClient, calls, invoke };
}

describe("uploadEvidenceDocument", () => {
  it("finalizes then hands the quarantined evidence to the security scanner", async () => {
    const { client, calls, invoke } = receiverSensitiveClient();
    const steps: string[] = [];
    const result = await uploadEvidenceDocument(
      client,
      "stage-id",
      new File(["proof"], "proof.pdf", { type: "application/pdf" }),
      step => steps.push(step),
    );
    expect(result).toEqual({ error: null, scanWarning: null });
    expect(calls).toEqual(["create_evidence_upload_intent", "finalize_evidence_upload"]);
    expect(invoke).toHaveBeenCalledWith("scan-pending-evidence", { body: { evidenceId: "evidence-id" } });
    expect(steps).toEqual(["authorizing", "uploading", "finalizing", "scanning"]);
  });

  it("keeps cancellation receiver-bound after a Storage failure and does not scan", async () => {
    const { client, calls, invoke } = receiverSensitiveClient({ message: "upload denied" });
    const result = await uploadEvidenceDocument(client, "stage-id", new File(["proof"], "proof.pdf", { type: "application/pdf" }));
    expect(result.error).toContain("upload denied");
    expect(result.scanWarning).toBeNull();
    expect(calls).toEqual(["create_evidence_upload_intent", "cancel_evidence_upload_intent"]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("keeps a finalized document quarantined when the scanner cannot start", async () => {
    const { client, calls, invoke } = receiverSensitiveClient(null, { message: "provider unavailable" });
    const result = await uploadEvidenceDocument(client, "stage-id", new File(["proof"], "proof.pdf", { type: "application/pdf" }));
    expect(result.error).toBeNull();
    expect(result.scanWarning).toContain("remains quarantined and untrusted");
    expect(calls).toEqual(["create_evidence_upload_intent", "finalize_evidence_upload"]);
    expect(invoke).toHaveBeenCalledOnce();
  });
});
