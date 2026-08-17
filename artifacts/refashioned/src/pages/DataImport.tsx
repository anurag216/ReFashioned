import { useState } from "react";
import Papa from "papaparse";
import { Download, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { usePermissions } from "../lib/auth/usePermissions";

const templates = {
  products: "name,sku,season,status\nOrganic Tee,TEE-001,SS26,draft\n",
  suppliers: "supplier_reference,name,location,tier,contact_name,contact_email\nSUP-001,Example Textiles,Portugal,1,Alex Morgan,alex@example.com\n",
  product_materials: "product_sku,material_name,composition_percentage,certification_required\nTEE-001,Organic cotton,100,true\n",
  lifecycle_stages: "product_sku,supplier_reference,stage_name,stage_order,co2_impact_kg,water_usage_l\nTEE-001,SUP-001,Cutting and sewing,1,,\n",
} as const;
type ImportType = keyof typeof templates;
type Result = { status: string; row_count?: number; valid_row_count?: number; invalid_row_count?: number; created_count?: number; matched_count?: number };

export function DataImport() {
  const { canEdit } = usePermissions();
  const queryClient = useQueryClient();
  const [type, setType] = useState<ImportType>("products");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [issues, setIssues] = useState<{ row_number: number; validation_errors: string[] }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([templates[type]], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${type}-template.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  function upload(file: File) {
    setError(null); setResult(null); setBatchId(null); setIssues([]); setFileName(file.name);
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: "greedy", transformHeader: h => h.trim(), complete: parsed => {
      if (parsed.errors.length) setError(`CSV row ${parsed.errors[0].row ?? 0}: ${parsed.errors[0].message}`);
      else setRows(parsed.data);
    }, error: e => setError(e.message) });
  }
  async function validate() {
    if (!supabase || !rows.length) return; setBusy(true); setError(null);
    const created = await supabase.rpc("create_pilot_import_batch", { p_import_type: type, p_file_name: fileName });
    if (created.error) { setError(created.error.message); setBusy(false); return; }
    const id = created.data as string; setBatchId(id);
    const staged = await supabase.rpc("stage_pilot_import_rows", { p_batch_id: id, p_rows: rows });
    if (staged.error) { setError(staged.error.message); setBusy(false); return; }
    const validated = await supabase.rpc("validate_pilot_import_batch", { p_batch_id: id });
    if (validated.error) { setError(validated.error.message); setBusy(false); return; }
    setResult(validated.data as Result);
    const detail = await supabase.rpc("get_pilot_import_batch", { p_batch_id: id });
    const data = detail.data as { rows?: { row_number: number; validation_errors: string[] }[] };
    setIssues((data.rows ?? []).filter(row => row.validation_errors.length)); setBusy(false);
  }
  async function commit() {
    if (!supabase || !batchId) return; setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("commit_pilot_import_batch", { p_batch_id: batchId });
    if (error) setError(error.message); else {
      setResult(data as Result);
      await Promise.all(["products", "suppliers", "product-readiness", "action-center"].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
    } setBusy(false);
  }
  if (!canEdit) return <div className="p-8"><h1 className="text-2xl font-bold">Import Data</h1><p className="mt-3 text-muted-foreground">Only organization admins and managers can import data.</p></div>;
  return <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold">Import Data</h1><p className="text-sm text-muted-foreground mt-1">Upload canonical CSV data, validate it on the server, then commit it transactionally.</p></div>
    <ol className="flex flex-wrap gap-2 text-xs font-medium">{["Choose type","Upload","Preview","Validate","Review","Import","Success"].map((s,i)=><li key={s} className="rounded-full bg-muted px-3 py-1">{i+1}. {s}</li>)}</ol>
    <section className="rounded-xl border bg-white p-5 space-y-4">
      <label className="block text-sm font-semibold">Import type<select aria-label="Import type" className="mt-2 block w-full max-w-sm rounded-md border p-2" value={type} onChange={e=>{setType(e.target.value as ImportType);setRows([]);setResult(null);}}>{Object.keys(templates).map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label>
      <div className="flex flex-wrap gap-3"><button onClick={downloadTemplate} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm"><Download className="w-4 h-4"/> Download template</button><label className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><Upload className="w-4 h-4"/> Upload CSV<input aria-label="Upload CSV" type="file" accept=".csv,text/csv" className="sr-only" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/></label></div>
    </section>
    {rows.length>0&&<section className="rounded-xl border bg-white p-5 overflow-x-auto"><h2 className="font-semibold">Preview <span className="text-muted-foreground">({rows.length} rows)</span></h2><table className="mt-3 w-full text-sm"><thead><tr><th className="p-2 text-left">Row</th>{Object.keys(rows[0]).map(h=><th className="p-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,10).map((r,i)=><tr className="border-t" key={i}><td className="p-2">{i+2}</td>{Object.keys(rows[0]).map(h=><td className="p-2" key={h}>{r[h]||<span className="text-muted-foreground">blank</span>}</td>)}</tr>)}</tbody></table><button disabled={busy} onClick={()=>void validate()} className="mt-4 rounded-md bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50">{busy?"Validating…":"Validate on server"}</button></section>}
    {result&&<section aria-live="polite" className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2">{result.invalid_row_count?<AlertCircle className="text-red-600"/>:<CheckCircle2 className="text-green-600"/>}<h2 className="font-semibold">Validation result</h2></div><div className="mt-3 grid grid-cols-3 gap-3 text-sm"><div>Total: {result.row_count??rows.length}</div><div>Valid: {result.valid_row_count??rows.length}</div><div>Invalid: {result.invalid_row_count??0}</div></div>{issues.map(x=><div role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-800" key={x.row_number}>Row {x.row_number+1}: {x.validation_errors.join("; ")}</div>)}{result.status==="validated"&&<button disabled={busy} onClick={()=>void commit()} className="mt-4 rounded-md bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50">{busy?"Importing…":"Import validated data"}</button>}{result.status==="completed"&&<p className="mt-4 font-medium text-green-700">Import completed: {result.created_count} created, {result.matched_count} matched. Dashboard readiness is refreshing.</p>}</section>}
    {error&&<div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}
  </div>;
}
