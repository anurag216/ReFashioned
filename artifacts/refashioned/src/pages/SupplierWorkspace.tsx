import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, LogOut, RefreshCw } from "lucide-react";
import type { SupplierAccess } from "../lib/auth/useSupplierAccess";
import { supabase } from "../lib/supabaseClient";
import { SecureDocumentLink } from "../components/ui/SecureDocumentLink";
import { requestEvidenceSecurityScan, type EvidenceUploadClient } from "../lib/evidenceUpload";

type Task = { lifecycle_stage_id: string; stage_name: string; product_name: string; document_requirement: string; evidence_status: string | null; scan_status: string | null; evidence_id: string | null; rejection_reason: string | null };
type Intent = { evidence_id: string; bucket_id: string; storage_path: string; upload_expires_at: string };

export function SupplierWorkspace({ access, email, onSignOut }: { access: SupplierAccess; email: string; onSignOut: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  function handleSupplierAuthorizationError(message: string | undefined) {
    const normalized = message?.toLowerCase() ?? "";
    if (normalized.includes("portal access is not active") || normalized.includes("authorization is no longer valid") || normalized.includes("not authorized")) {
      setTasks([]); setUploading(null); setError(null); setScanNotice(null); setAccessRevoked(true); return true;
    }
    return false;
  }

  async function loadTasks() {
    if (!supabase || typeof supabase.rpc !== "function") return;
    const result = await supabase.rpc("get_my_supplier_evidence_tasks") as unknown as { data: Task[] | null; error: { message: string } | null };
    if (result.error) {
      if (!handleSupplierAuthorizationError(result.error.message)) setError(result.error.message);
    } else setTasks(result.data ?? []);
  }

  useEffect(() => { void loadTasks(); }, []);

  if (accessRevoked) return <main className="min-h-screen bg-emerald-950 p-6">
    <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl">
      <LogOut className="h-10 w-10 text-slate-600" />
      <h1 className="mt-4 text-2xl font-bold">Your supplier portal access is no longer active.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Contact the organization that invited you if you believe this is an error.</p>
      <button onClick={onSignOut} className="mt-6 flex items-center gap-2 rounded-md border px-4 py-2 text-sm"><LogOut className="h-4 w-4" />Sign out</button>
    </section>
  </main>;

  async function scanEvidence(evidenceId: string, loadingKey: string) {
    if (!supabase) return;
    setUploading(loadingKey); setError(null); setScanNotice(null);
    const warning = await requestEvidenceSecurityScan(
      supabase as unknown as Pick<EvidenceUploadClient, "functions">,
      evidenceId,
    );
    if (warning) setScanNotice(warning);
    await loadTasks();
    setUploading(null);
  }

  async function upload(task: Task, file: File) {
    if (!supabase) return;
    setUploading(task.lifecycle_stage_id); setError(null); setScanNotice(null);
    const intentResult = await supabase.rpc("create_evidence_upload_intent", { p_lifecycle_stage_id: task.lifecycle_stage_id, p_document_type: "certificate", p_original_filename: file.name, p_mime_type: file.type, p_size_bytes: file.size }) as unknown as { data: Intent[] | null; error: { message: string } | null };
    const intent = intentResult.data?.[0];
    if (intentResult.error || !intent) {
      if (!handleSupplierAuthorizationError(intentResult.error?.message)) { setError(intentResult.error?.message ?? "Upload authorization failed."); setUploading(null); }
      return;
    }
    const stored = await supabase.storage.from(intent.bucket_id).upload(intent.storage_path, file, { upsert: false, contentType: file.type });
    if (stored.error) { await Promise.resolve(supabase.rpc("cancel_evidence_upload_intent",{p_evidence_id:intent.evidence_id})).catch(()=>undefined); setError(`Upload failed: ${stored.error.message}. You can retry.`); await loadTasks(); setUploading(null); return; }
    const finalized = await supabase.rpc("finalize_evidence_upload", { p_evidence_id: intent.evidence_id });
    if (finalized.error) { if (!handleSupplierAuthorizationError(finalized.error.message)) { setError(finalized.error.message); setUploading(null); } return; }
    const warning = await requestEvidenceSecurityScan(
      supabase as unknown as Pick<EvidenceUploadClient, "functions">,
      intent.evidence_id,
    );
    if (warning) setScanNotice(warning);
    await loadTasks(); setUploading(null);
  }

  async function cancelIntent(evidenceId:string) {
    if(!supabase || uploading) return;
    setUploading(evidenceId); setError(null); setScanNotice(null);
    const result=await supabase.rpc("cancel_evidence_upload_intent",{p_evidence_id:evidenceId});
    if(result.error) setError(`Unable to cancel: ${result.error.message}`);
    await loadTasks(); setUploading(null);
  }

  return <main className="min-h-screen bg-emerald-950 p-6">
    <section className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-8 shadow-xl">
      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      <h1 className="mt-4 text-2xl font-bold">Supplier access active</h1>
      <h2 className="mt-6 text-lg font-semibold">Evidence tasks</h2>
      <p className="mt-2 text-muted-foreground">{access.supplier_name} · signed in as {email}</p>
      {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {scanNotice && <p role="status" className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900">{scanNotice}</p>}
      <ul className="mt-6 space-y-4">
        {tasks.map(task => <li key={task.lifecycle_stage_id} className="rounded-lg border p-4">
          <h2 className="font-semibold">{task.product_name} — {task.stage_name}</h2>
          <p className="text-sm text-muted-foreground">{task.document_requirement}</p>
          <p className="mt-2 text-sm">Status: {task.evidence_status === "upload_pending" ? "Uploading…" : task.evidence_status === "quarantined" && task.scan_status === "pending" ? "Security scan pending" : task.evidence_status === "pending_review" ? "Ready for review" : task.evidence_status === "approved" ? "Approved" : task.evidence_status === "rejected" ? "Rejected" : task.evidence_status ? task.evidence_status.replaceAll("_", " ") : "Not submitted"}</p>
          {task.evidence_status === "quarantined" && task.scan_status !== "pending" && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">This document could not be accepted. Please upload a new file.</p>}
          {task.rejection_reason && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">Review feedback: {task.rejection_reason}</p>}
          <div className="mt-3 flex gap-3">
            {task.evidence_id && !["upload_pending", "quarantined"].includes(task.evidence_status ?? "") && <SecureDocumentLink evidenceId={task.evidence_id} label="View submission" />}
            {task.evidence_id && task.evidence_status === "upload_pending" && <button onClick={()=>void cancelIntent(task.evidence_id!)} disabled={uploading!==null} className="rounded border px-3 py-1 text-xs">Cancel pending upload</button>}
            {task.evidence_id && task.evidence_status === "quarantined" && task.scan_status === "pending" && <button onClick={()=>void scanEvidence(task.evidence_id!, task.lifecycle_stage_id)} disabled={uploading!==null} className="inline-flex items-center gap-2 rounded border px-3 py-1 text-xs"><RefreshCw className="h-3 w-3" />{uploading === task.lifecycle_stage_id ? "Scanning…" : "Retry security scan"}</button>}
            {(task.evidence_status === null || task.evidence_status === "rejected" || (task.evidence_status === "quarantined" && task.scan_status !== "pending")) && <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-emerald-700 px-3 py-1 text-xs text-white">
              <FileUp className="h-3 w-3" /> {uploading === task.lifecycle_stage_id ? "Uploading…" : "Submit evidence"}
              <input className="sr-only" type="file" accept="application/pdf,image/png,image/jpeg" disabled={uploading !== null} onChange={event => { const file=event.target.files?.[0]; if(file) void upload(task,file); }} />
            </label>}
          </div>
        </li>)}
      </ul>
      <button onClick={onSignOut} className="mt-6 flex items-center gap-2 rounded-md border px-4 py-2 text-sm"><LogOut className="h-4 w-4" />Sign out</button>
    </section>
  </main>;
}
