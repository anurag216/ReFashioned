import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, LogOut } from "lucide-react";
import type { SupplierAccess } from "../lib/auth/useSupplierAccess";
import { supabase } from "../lib/supabaseClient";
import { SecureDocumentLink } from "../components/ui/SecureDocumentLink";

type Task = { lifecycle_stage_id: string; stage_name: string; product_name: string; document_requirement: string; evidence_status: string | null; evidence_id: string | null; rejection_reason: string | null };
type Intent = { evidence_id: string; bucket_id: string; storage_path: string; upload_expires_at: string };

export function SupplierWorkspace({ access, email, onSignOut }: { access: SupplierAccess; email: string; onSignOut: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function loadTasks() {
    if (!supabase || typeof supabase.rpc !== "function") return;
    const rpc = supabase.rpc as unknown as (name: string, args?: Record<string, unknown>) => Promise<{ data: Task[] | null; error: { message: string } | null }>;
    const result = await rpc("get_my_supplier_evidence_tasks");
    if (result.error) setError(result.error.message); else setTasks(result.data ?? []);
  }
  useEffect(() => { void loadTasks(); }, []);

  async function upload(task: Task, file: File) {
    if (!supabase) return;
    setUploading(task.lifecycle_stage_id); setError(null);
    const rpc = supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: Intent[] | null; error: { message: string } | null }>;
    const intentResult = await rpc("create_evidence_upload_intent", { p_lifecycle_stage_id: task.lifecycle_stage_id, p_document_type: "certificate", p_original_filename: file.name, p_mime_type: file.type, p_size_bytes: file.size });
    const intent = intentResult.data?.[0];
    if (intentResult.error || !intent) { setError(intentResult.error?.message ?? "Upload authorization failed."); setUploading(null); return; }
    const stored = await supabase.storage.from(intent.bucket_id).upload(intent.storage_path, file, { upsert: false, contentType: file.type });
    if (stored.error) { await rpc("cancel_evidence_upload_intent",{p_evidence_id:intent.evidence_id}).catch(()=>undefined); setError(`Upload failed: ${stored.error.message}. You can retry.`); await loadTasks(); setUploading(null); return; }
    const finalized = await rpc("finalize_evidence_upload", { p_evidence_id: intent.evidence_id });
    if (finalized.error) { setError(finalized.error.message); setUploading(null); return; }
    await loadTasks(); setUploading(null);
  }
  async function cancelIntent(evidenceId:string) {
    if(!supabase || uploading) return;
    setUploading(evidenceId); setError(null);
    const rpc=supabase.rpc as unknown as (name:string,args:Record<string,unknown>)=>Promise<{error:{message:string}|null}>;
    const result=await rpc("cancel_evidence_upload_intent",{p_evidence_id:evidenceId});
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
      <ul className="mt-6 space-y-4">
        {tasks.map(task => <li key={task.lifecycle_stage_id} className="rounded-lg border p-4">
          <h2 className="font-semibold">{task.product_name} — {task.stage_name}</h2>
          <p className="text-sm text-muted-foreground">{task.document_requirement}</p>
          <p className="mt-2 text-sm capitalize">Status: {(task.evidence_status ?? "not submitted").replaceAll("_", " ")}</p>
          {task.rejection_reason && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">Review feedback: {task.rejection_reason}</p>}
          <div className="mt-3 flex gap-3">
            {task.evidence_id && task.evidence_status !== "upload_pending" && <SecureDocumentLink evidenceId={task.evidence_id} label="View submission" />}
            {task.evidence_id && task.evidence_status === "upload_pending" && <button onClick={()=>void cancelIntent(task.evidence_id!)} disabled={uploading!==null} className="rounded border px-3 py-1 text-xs">Cancel pending upload</button>}
            {(task.evidence_status === null || task.evidence_status === "rejected") && <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-emerald-700 px-3 py-1 text-xs text-white">
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
