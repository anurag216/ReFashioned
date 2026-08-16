import { Download, Leaf, Droplets, Package, Building2, AlertTriangle, CheckCircle2, Clock3, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useProducts } from "../lib/api/useProducts";
import { useSuppliers } from "../lib/api/useSuppliers";
import { useLifecycleStages } from "../lib/api/useLifecycleStages";
import { useActionCenter, useProductReadiness } from "../lib/api/useReadiness";
import { downloadReadinessCsv, formatOperationalState, type Priority } from "../lib/readiness";

const priorityMeta: Record<Priority,{ label:string; icon:typeof AlertTriangle; className:string }> = {
  BLOCKED:{ label:"Blocked",icon:AlertTriangle,className:"text-red-700 bg-red-50 border-red-200" },
  NEEDS_ACTION:{ label:"Needs Action",icon:Clock3,className:"text-amber-700 bg-amber-50 border-amber-200" },
  READY:{ label:"Ready",icon:CheckCircle2,className:"text-green-700 bg-green-50 border-green-200" },
};

export function Dashboard({ onViewMetrics: _onViewMetrics }: { onViewMetrics?: () => void }) {
  const { data:products=[],isLoading:productsLoading }=useProducts();
  const { data:suppliers=[],isLoading:suppliersLoading }=useSuppliers();
  const { data:stages=[],isLoading:stagesLoading }=useLifecycleStages();
  const { data:readiness=[],isLoading:readinessLoading }=useProductReadiness();
  const { data:actions=[],isLoading:actionsLoading }=useActionCenter();
  const loading=productsLoading||suppliersLoading||stagesLoading||readinessLoading||actionsLoading;
  const measuredCo2=stages.filter(s=>s.co2_impact_kg!=null);
  const measuredWater=stages.filter(s=>s.water_usage_l!=null);
  const totalCo2=measuredCo2.reduce((sum,s)=>sum+(s.co2_impact_kg??0),0);
  const totalWater=measuredWater.reduce((sum,s)=>sum+(s.water_usage_l??0),0);
  const average=readiness.length ? Math.floor(readiness.reduce((sum,r)=>sum+r.overall_percent,0)/readiness.length):0;
  const counts=(Object.keys(priorityMeta) as Priority[]).map(priority=>({priority,count:actions.filter(a=>a.priority===priority).length}));

  return <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Pilot Readiness</h1><p className="text-sm text-muted-foreground mt-1">Live operational readiness and evidence blockers. No projections or sample metrics.</p></div>
      <button disabled={!readiness.length} onClick={()=>downloadReadinessCsv(readiness)} className="self-start flex items-center gap-2 bg-accent px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"><Download className="w-4 h-4"/>Export live CSV</button>
    </header>

    <section aria-labelledby="action-center-title" className="bg-card border rounded-xl p-5 space-y-4">
      <div><h2 id="action-center-title" className="text-lg font-semibold">Action Center</h2><p className="text-sm text-muted-foreground">What needs attention next, derived from current records.</p></div>
      <div className="grid grid-cols-3 gap-3">{counts.map(({priority,count})=>{const m=priorityMeta[priority];const Icon=m.icon;return <div key={priority} className={`border rounded-lg p-3 ${m.className}`}><Icon className="w-4 h-4 mb-2"/><strong className="text-xl">{loading?"…":count}</strong><div className="text-xs">{m.label}</div></div>})}</div>
      {!loading&&actions.length===0&&<div className="rounded-lg bg-muted p-6 text-center"><CheckCircle2 className="w-7 h-7 mx-auto text-green-600 mb-2"/><p className="font-medium">You're caught up.</p><p className="text-sm text-muted-foreground">No sustainability data blockers require attention.</p></div>}
      <div className="divide-y">{actions.slice(0,8).map((action,index)=>{const meta=priorityMeta[action.priority];return <div key={`${action.category}-${action.entity_id}-${index}`} className="py-3 flex gap-3 items-start"><span className={`text-[10px] font-bold border rounded px-2 py-1 ${meta.className}`}>{meta.label}</span><div className="min-w-0 flex-1"><p className="font-medium text-sm">{action.title}</p><p className="text-xs text-muted-foreground mt-1">{action.explanation}</p></div><Link href={action.destination} className="text-sm text-primary flex items-center gap-1">Open <ArrowRight className="w-3 h-3"/></Link></div>})}</div>
    </section>

    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[{label:"Products",value:products.length,icon:Package},{label:"Suppliers",value:suppliers.length,icon:Building2},{label:"CO₂ recorded (kg)",value:measuredCo2.length?totalCo2.toFixed(1):"0 · No data yet",icon:Leaf},{label:"Water recorded (L)",value:measuredWater.length?totalWater.toFixed(1):"0 · No data yet",icon:Droplets}].map(card=><div key={card.label} className="bg-card border rounded-lg p-4"><card.icon className="w-4 h-4 text-primary mb-3"/><p className="text-xl font-bold">{loading?"…":card.value}</p><p className="text-xs text-muted-foreground">{card.label}</p></div>)}
    </section>

    <section className="bg-card border rounded-xl p-5">
      <div className="flex justify-between"><div><h2 className="font-semibold">Product completeness</h2><p className="text-xs text-muted-foreground">Equal-count, evidence-aware checks · organization average {average}%</p></div></div>
      {!loading&&products.length===0&&<div className="py-10 text-center"><Package className="w-8 h-8 mx-auto text-muted-foreground mb-2"/><p className="font-medium">Add your first product</p><p className="text-sm text-muted-foreground">Begin building its traceability record.</p><Link href="/products" className="inline-block mt-3 text-sm text-primary">Add product</Link></div>}
      <div className="divide-y">{readiness.map(row=><div key={row.product_id} className="py-4"><div className="flex items-center gap-4"><div className="flex-1"><p className="font-medium">{row.product_name}</p><p className="text-xs text-muted-foreground">{row.blocker_count} blocker{row.blocker_count===1?"":"s"} · Evidence: {formatOperationalState(row.evidence_state)} · Certification: {formatOperationalState(row.certification_state)} · DPP: {formatOperationalState(row.dpp_state)}</p></div><strong className="text-xl">{row.overall_percent}%</strong></div><div className="flex flex-wrap gap-2 mt-3">{Object.entries(row.dimensions).map(([name,d])=><span key={name} className={`text-[11px] rounded-full px-2 py-1 ${!d.applicable?"bg-slate-100 text-slate-500":d.complete||d.ready?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>{formatOperationalState(name)}: {!d.applicable?"N/A":d.percent!=null?`${d.percent}%`:d.ready?"Ready":"Blocked"}</span>)}</div></div>)}</div>
    </section>

    <section className="grid md:grid-cols-2 gap-4"><div className="bg-card border rounded-xl p-8 text-center"><Leaf className="w-7 h-7 mx-auto text-muted-foreground mb-2"/><h2 className="font-medium">Current lifecycle impact</h2>{!measuredCo2.length&&!measuredWater.length?<><p className="text-sm text-muted-foreground mt-1">No lifecycle impact data has been recorded yet.</p><p className="text-xs text-muted-foreground mt-2">Add lifecycle stages to begin tracking product impact.</p></>:<p className="text-sm text-muted-foreground mt-1">Totals reflect current recorded measurements only. Historical trends are unavailable.</p>}</div><div className="bg-card border rounded-xl p-8 text-center"><Building2 className="w-7 h-7 mx-auto text-muted-foreground mb-2"/><h2 className="font-medium">Supplier participation</h2><p className="text-sm text-muted-foreground mt-1">{suppliers.length?`${suppliers.length} supplier${suppliers.length===1?" is":"s are"} in your live organization record.`:"Add a supplier and invite them to contribute sustainability evidence."}</p></div></section>
  </div>;
}
