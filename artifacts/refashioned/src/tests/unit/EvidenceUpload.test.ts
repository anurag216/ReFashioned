import { describe, expect, it, vi } from "vitest";
import { uploadEvidenceDocument, type EvidenceUploadClient } from "../../lib/evidenceUpload";

function receiverSensitiveClient(uploadError: { message: string } | null = null) {
  const calls: string[] = [];
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
    storage: { from: vi.fn(() => ({ upload: vi.fn(async () => ({ error: uploadError })) })) },
  };
  return { client: client as unknown as EvidenceUploadClient, calls };
}

describe("uploadEvidenceDocument", () => {
  it("keeps create and finalize RPCs receiver-bound through a successful upload", async () => {
    const { client, calls } = receiverSensitiveClient();
    const result = await uploadEvidenceDocument(client, "stage-id", new File(["proof"], "proof.pdf", { type: "application/pdf" }));
    expect(result).toEqual({ error: null });
    expect(calls).toEqual(["create_evidence_upload_intent", "finalize_evidence_upload"]);
  });

  it("keeps cancellation receiver-bound after a Storage failure", async () => {
    const { client, calls } = receiverSensitiveClient({ message: "upload denied" });
    const result = await uploadEvidenceDocument(client, "stage-id", new File(["proof"], "proof.pdf", { type: "application/pdf" }));
    expect(result.error).toContain("upload denied");
    expect(calls).toEqual(["create_evidence_upload_intent", "cancel_evidence_upload_intent"]);
  });
});
