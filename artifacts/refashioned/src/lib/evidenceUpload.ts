export type EvidenceUploadIntent = {
  evidence_id: string;
  bucket_id: string;
  storage_path: string;
  upload_expires_at: string;
};

type RpcResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

export type EvidenceUploadClient = {
  rpc(name: string, args: Record<string, unknown>): RpcResult<unknown>;
  functions: {
    invoke(name: string, options: { body: Record<string, unknown> }): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
  storage: {
    from(bucket: string): {
      upload(path: string, file: File, options: { upsert: boolean; contentType: string }): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

export type EvidenceUploadStep = "authorizing" | "uploading" | "finalizing" | "scanning";
export type EvidenceUploadResult = { error: string | null; scanWarning: string | null };

export async function requestEvidenceSecurityScan(
  client: Pick<EvidenceUploadClient, "functions">,
  evidenceId: string,
): Promise<string | null> {
  try {
    const { error } = await client.functions.invoke("scan-pending-evidence", {
      body: { evidenceId },
    });
    return error
      ? "Evidence was uploaded safely, but its automatic security scan could not start. It remains quarantined and untrusted; retry the scan before review."
      : null;
  } catch {
    return "Evidence was uploaded safely, but its automatic security scan could not start. It remains quarantined and untrusted; retry the scan before review.";
  }
}

export async function uploadEvidenceDocument(
  client: EvidenceUploadClient,
  stageId: string,
  file: File,
  onStep: (step: EvidenceUploadStep) => void = () => undefined,
): Promise<EvidenceUploadResult> {
  onStep("authorizing");
  const intentResult = await client.rpc("create_evidence_upload_intent", {
    p_lifecycle_stage_id: stageId,
    p_document_type: "certificate",
    p_original_filename: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
  });
  const { data, error: intentError } = intentResult as { data: EvidenceUploadIntent[] | null; error: { message: string } | null };
  const intent = data?.[0];
  if (intentError || !intent) return { error: `Evidence upload authorization failed: ${intentError?.message ?? "try again"}`, scanWarning: null };

  onStep("uploading");
  const { error: uploadError } = await client.storage.from(intent.bucket_id)
    .upload(intent.storage_path, file, { upsert: false, contentType: file.type });
  if (uploadError) {
    await Promise.resolve(client.rpc("cancel_evidence_upload_intent", { p_evidence_id: intent.evidence_id })).catch(() => undefined);
    return { error: `Evidence upload failed: ${uploadError.message}. Retry to reuse this stage.`, scanWarning: null };
  }

  onStep("finalizing");
  const { error: finalizeError } = await client.rpc("finalize_evidence_upload", { p_evidence_id: intent.evidence_id }) as { error: { message: string } | null };
  if (finalizeError) return { error: `Evidence finalization failed: ${finalizeError.message}. Retry finalization before starting another upload.`, scanWarning: null };

  onStep("scanning");
  const scanWarning = await requestEvidenceSecurityScan(client, intent.evidence_id);
  return { error: null, scanWarning };
}
