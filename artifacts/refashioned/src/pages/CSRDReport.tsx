import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileCheck2, Leaf } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { recorded, reportStatus, type SustainabilityReport } from "../lib/reports/csrdMetrics";

const Metric = ({ label, value, detail }: { label: string; value: string; detail?: string }) => <div className="rounded-lg border bg-card p-4 break-inside-avoid"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;

export function CSRDReport() {
  const [report,setReport]=useState<SustainabilityReport|null>(null);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{ let active=true; if(!supabase){setError("Database connection is not configured.");return()=>{active=false};} void supabase.rpc("get_organization_sustainability_report").then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setReport(data as unknown as SustainabilityReport);}); return()=>{active=false};},[]);
  if(error) return <main className="p-8"><h1 className="text-2xl font-bold">CSRD Data Readiness</h1><p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-red-800">The report is unavailable: {error}</p></main>;
  if(!report) return <main className="p-8" aria-busy="true"><h1 className="text-2xl font-bold">CSRD Data Readiness</h1><p className="mt-4 text-muted-foreground">Loading factual organization data…</p></main>;
  const status=reportStatus(report);
  const noEvidence=report.trusted_evidence_count+report.pending_evidence_count+report.quarantined_evidence_count+report.rejected_evidence_count===0;
  return <main data-testid="csrd-readiness-report" className="report-print p-6 md:p-8 max-w-6xl mx-auto space-y-7">
    <header className="flex flex-col sm:flex-row justify-between gap-4 border-b pb-5">
      <div><p className="print-brand text-sm font-semibold text-primary">RE:FASHIONED</p><h1 className="text-2xl font-bold">CSRD Data Readiness</h1><p className="mt-1 text-sm text-muted-foreground">{report.organization.name} · Generated {new Date(report.generated_at).toLocaleString()}</p><p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">{status}</p></div>
      <button onClick={()=>window.print()} className="no-print self-start flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><Download className="h-4 w-4"/>Print / Save PDF</button>
    </header>

    <section><h2 className="mb-3 text-lg font-semibold">Data coverage</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Products" value={String(report.tracked_product_count)} detail={`${report.products_ready_count} with no current readiness blockers`}/>
      <Metric label="Materials" value={report.tracked_product_count ? `${report.material_complete_product_count} of ${report.tracked_product_count}`:"Not recorded"} detail="Products with complete material composition"/>
      <Metric label="Supply chain" value={report.tracked_product_count ? `${report.supply_chain_complete_product_count} of ${report.tracked_product_count}`:"Not recorded"} detail={`${report.supplier_count} recorded supplier${report.supplier_count===1?"":"s"}`}/>
      <Metric label="DPP" value={report.published_dpp_count ? String(report.published_dpp_count):"Not recorded"} detail={`${report.dpps_needing_republish} needing republish`}/>
    </div></section>

    <section><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Leaf className="h-5 w-5"/>Recorded environmental data</h2><div className="grid gap-3 md:grid-cols-2">
      <Metric label="Recorded lifecycle CO₂ observations" value={recorded(report.recorded_co2_kg,"kg CO₂e")} detail={report.co2_observation_count ? `Sum of ${report.co2_observation_count} of ${report.lifecycle_stage_count} lifecycle stages containing a value.`:"No lifecycle stage contains a CO₂ value."}/>
      <Metric label="Recorded lifecycle water observations" value={recorded(report.recorded_water_l,"L")} detail={report.water_observation_count ? `Sum of ${report.water_observation_count} of ${report.lifecycle_stage_count} lifecycle stages containing a value.`:"No lifecycle stage contains a water value."}/>
      <Metric label="Scope 1 inventory" value="Not recorded" detail="Not available from current Re:Fashioned data."/>
      <Metric label="Scope 2 inventory" value="Not recorded" detail="Not available from current Re:Fashioned data."/>
    </div><p className="mt-3 text-sm text-muted-foreground">Lifecycle observations are recorded product-stage values. Their partial sums are not a complete corporate GHG or water inventory.</p></section>

    <section><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileCheck2 className="h-5 w-5"/>Evidence and certification status</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Metric label="Trusted evidence" value={noEvidence?"Not recorded":String(report.trusted_evidence_count)} detail="Approved, clean and fingerprinted"/><Metric label="Pending" value={noEvidence?"Not recorded":String(report.pending_evidence_count)}/><Metric label="Quarantined" value={noEvidence?"Not recorded":String(report.quarantined_evidence_count)}/><Metric label="Rejected" value={noEvidence?"Not recorded":String(report.rejected_evidence_count)}/><Metric label="Valid certifications" value={report.valid_certification_count?String(report.valid_certification_count):"Not recorded"} detail="Current and backed by trusted evidence"/>
    </div></section>

    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 break-inside-avoid"><h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5"/>Data gaps and actions</h2><p className="mt-2 text-sm">{report.readiness_blocker_count ? `${report.readiness_blocker_count} factual readiness action${report.readiness_blocker_count===1?"":"s"} remain. Open the Action Center or a Product Workspace to resolve them.`:"No current product-readiness blockers are recorded."}</p></section>
    <section className="rounded-xl border p-5 break-inside-avoid"><h2 className="font-semibold">Methodology and limitations</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>Generated only from data currently stored for this organization in Re:Fashioned.</li><li>Missing values are not estimated and are not treated as zero, compliant or verified.</li><li>Trusted evidence requires approved status, a clean scan and an immutable content fingerprint. Valid certifications must also be current and evidence-backed.</li><li>This is operational data readiness, not legal advice, assurance, certification, or a determination of CSRD compliance.</li></ul></section>
  </main>;
}
