import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

type DownloadTarget = {
  bucket_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
};

/** Resolves an authorized, 60-second URL only in direct response to a click. */
export function SecureDocumentLink({ evidenceId, label = "View document" }: { evidenceId: string; label?: string }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDocument() {
    if (!supabase || opening) return;
    setOpening(true);
    setError(null);
    // The generated schema is refreshed from a clean database in CI.
    const rpcResult = await supabase.rpc("get_evidence_download_target", {
      p_evidence_id: evidenceId,
    });
    const { data, error: authorizationError } = rpcResult as unknown as { data: DownloadTarget[] | null; error: { message: string } | null };
    const target = (data?.[0] ?? null) as DownloadTarget | null;
    if (authorizationError || !target) {
      setError("Document access was not authorized.");
      setOpening(false);
      return;
    }
    const { data: signed, error: signingError } = await supabase.storage
      .from(target.bucket_id)
      .createSignedUrl(target.storage_path, 60, { download: target.original_filename });
    if (signingError || !signed?.signedUrl) {
      setError("The document could not be opened.");
      setOpening(false);
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    // The URL is deliberately kept in a local variable and discarded immediately.
    setOpening(false);
  }

  return <span className="inline-flex flex-col items-start gap-1">
    <button type="button" onClick={() => void openDocument()} disabled={opening}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-white text-foreground hover:bg-muted disabled:opacity-50">
      <ExternalLink className="w-3 h-3" /> {opening ? "Authorizing…" : label}
    </button>
    {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
  </span>;
}
