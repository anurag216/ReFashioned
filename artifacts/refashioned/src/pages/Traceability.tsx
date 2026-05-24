import { useState, useEffect, type ElementType } from "react";
import {
  AlertTriangle, Leaf, RefreshCw, Scissors, Droplets, Shirt,
  Package, FileCheck, Download, CheckCircle2, XCircle, Zap,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Stage name → icon/colour — purely presentational, lives client-side
const STAGE_ICON_MAP: Record<string, { icon: ElementType; iconBg: string; iconColor: string }> = {
  "Raw Material Sourcing":       { icon: Leaf,      iconBg: "bg-primary",    iconColor: "text-white" },
  "Processing & Spinning":       { icon: RefreshCw, iconBg: "bg-blue-600",   iconColor: "text-white" },
  "Scouring & Processing":       { icon: RefreshCw, iconBg: "bg-blue-600",   iconColor: "text-white" },
  "Fabric Production":           { icon: Scissors,  iconBg: "bg-purple-600", iconColor: "text-white" },
  "Spinning & Knitting":         { icon: Scissors,  iconBg: "bg-purple-600", iconColor: "text-white" },
  "Dyeing & Finishing":          { icon: Droplets,  iconBg: "bg-amber-500",  iconColor: "text-white" },
  "Garment Manufacturing":       { icon: Shirt,     iconBg: "bg-pink-500",   iconColor: "text-white" },
  "Garment Assembly":            { icon: Shirt,     iconBg: "bg-pink-500",   iconColor: "text-white" },
  "Quality Control & Packaging": { icon: Package,   iconBg: "bg-slate-500",  iconColor: "text-white" },
};
const DEFAULT_ICON = { icon: Zap, iconBg: "bg-slate-400", iconColor: "text-white" };

interface TraceRow {
  stage: string;
  subtitle: string;
  icon: ElementType;
  iconColor: string;
  iconBg: string;
  location: string;
  locSub: string;
  matSub: string;
  certs: { name: string; color: string; alert?: boolean }[];
  co2Val: string;
  co2Pos: boolean;
  waterVal: string;
  flagged: boolean;
}

export function Traceability({ onViewDPP }: { onViewDPP?: () => void }) {
  const [selectedProduct, setSelectedProduct] = useState("f1111111-1111-1111-1111-111111111111");
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStages() {
      setLoading(true);
      setFetchError(null);

      if (!supabase) {
        setFetchError("Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Replit Secrets.");
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lifecycle_stages")
        .select(`
          stage_name,
          subtitle,
          co2_impact_kg,
          water_usage_l,
          flagged,
          suppliers (
            name,
            location,
            tier,
            status,
            data_completeness
          )
        `)
        .eq("product_id", selectedProduct)
        .order("stage_order", { ascending: true });

      if (cancelled) return;

      if (error) {
        setFetchError(error.message);
        setRows([]);
      } else {
        const mapped: TraceRow[] = (data ?? []).map((r: Record<string, unknown>) => {
          const sup = Array.isArray(r.suppliers)
            ? (r.suppliers[0] as Record<string, unknown>)
            : (r.suppliers as Record<string, unknown> | null);
          const iconMeta = STAGE_ICON_MAP[r.stage_name as string] ?? DEFAULT_ICON;
          const tier = sup?.tier != null ? `Tier ${sup.tier}` : null;
          const status = sup?.status as string | null;
          const matSub = [tier, status].filter(Boolean).join(" · ") || "—";
          return {
            stage:    (r.stage_name as string) ?? "—",
            subtitle: (r.subtitle   as string) ?? "",
            icon:      iconMeta.icon,
            iconColor: iconMeta.iconColor,
            iconBg:    iconMeta.iconBg,
            location:  (sup?.location as string) ?? "—",
            locSub:    (sup?.name     as string) ?? "—",
            matSub,
            certs: [],
            co2Val:   r.co2_impact_kg != null ? `${r.co2_impact_kg} kg CO₂e` : "—",
            co2Pos:   true,
            waterVal: r.water_usage_l != null
              ? `${Number(r.water_usage_l).toLocaleString()} L`
              : "—",
            flagged: (r.flagged as boolean) ?? false,
          };
        });
        setRows(mapped);
      }

      setLoading(false);
    }

    fetchStages();
    return () => { cancelled = true; };
  }, [selectedProduct]);

  const productLabels: Record<string, string> = {
    "f1111111-1111-1111-1111-111111111111": "Summer Collection 2023 — Essential Cotton Tee",
    "f2222222-2222-2222-2222-222222222222": "Winter Collection 2023 — Merino Wool Sweater",
  };

  const hasFlagged = rows.some(r => r.flagged);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Journey</h1>
          <p className="text-sm text-muted-foreground mt-1">Track materials sourcing, production stages, and environmental impact</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            data-testid="select-product"
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
            className="bg-white border border-border rounded-md px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-72"
          >
            {Object.entries(productLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {onViewDPP && (
            <button onClick={onViewDPP} data-testid="button-view-dpp" className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0">
              <FileCheck className="w-4 h-4" /> View DPP
            </button>
          )}
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Copilot / anomaly banner — derived from live flagged column */}
      {!loading && hasFlagged && (
        <div className="bg-[#FEF3C7] border border-amber-300 rounded-lg p-4 flex items-start sm:items-center gap-4 shadow-sm">
          <div className="bg-amber-100 p-2 rounded-full shrink-0"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">AI Copilot Anomaly Detected</h4>
            <p className="text-sm text-amber-800 mt-0.5">One or more stages are flagged for review. Check highlighted rows below.</p>
          </div>
          <button className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm mt-2 sm:mt-0">Review</button>
        </div>
      )}
      {!loading && !hasFlagged && !fetchError && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800"><span className="font-semibold">All clear.</span> No anomalies detected across the supply chain for this SKU.</p>
        </div>
      )}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 shadow-sm">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800"><span className="font-semibold">Failed to load stages.</span> {fetchError}</p>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border border-card-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-gray-50/50 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Product Lifecycle Stages</h2>
          <span className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${rows.length} stages tracked`}
          </span>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Fetching supply chain data…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !fetchError && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Package className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No stages found for this product in the database.</p>
          </div>
        )}

        {/* Table — only rendered when we have rows */}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-6 py-3 font-semibold">Stage</th>
                  <th className="px-6 py-3 font-semibold">Location</th>
                  <th className="px-6 py-3 font-semibold">Supplier</th>
                  <th className="px-6 py-3 font-semibold">Certifications</th>
                  <th className="px-6 py-3 font-semibold">CO₂ Impact</th>
                  <th className="px-6 py-3 font-semibold">Water Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {rows.map((row, i) => {
                  const IconComp = row.icon;
                  return (
                    <tr key={i} className={`hover:bg-muted/50 transition-colors ${row.flagged ? "bg-amber-50/40" : ""}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`${row.iconBg} w-8 h-8 rounded-md flex items-center justify-center shrink-0 shadow-sm`}>
                            <IconComp className={`w-4 h-4 ${row.iconColor}`} />
                          </div>
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              {row.stage}
                              {row.flagged && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{row.subtitle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-foreground">{row.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-foreground">{row.locSub}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.matSub}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.certs.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.certs.map((cert, j) => (
                              <span key={j} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cert.color}`}>
                                {cert.alert && <AlertTriangle className="w-3 h-3" />}
                                {cert.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-medium ${row.co2Pos ? "text-primary" : "text-foreground"}`}>{row.co2Val}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">{row.waterVal}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
