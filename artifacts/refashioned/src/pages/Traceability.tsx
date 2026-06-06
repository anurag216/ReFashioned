import { useState, useEffect, type ElementType } from "react";
import {
  AlertTriangle, Leaf, RefreshCw, Scissors, Droplets, Shirt,
  Package, FileCheck, Download, CheckCircle2, XCircle, Zap, Plus, Paperclip,
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

export function Traceability({ onViewDPP }: { onViewDPP?: (productId: string) => void }) {
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null }[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [orgSuppliers, setOrgSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [addForm, setAddForm] = useState({ stage_name: "", subtitle: "", stage_order: "", co2_impact_kg: "", water_usage_l: "", supplier_id: "" });
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState("Saving…");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  useEffect(() => {
    if (!supabase) { setProductsLoading(false); return; }
    const client = supabase;
    async function loadProducts() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { setProductsLoading(false); return; }
      const { data: member } = await client
        .from("organization_members")
        .select("organization_id")
        .eq("profile_id", user.id)
        .limit(1)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orgId: string | null = (member as any)?.organization_id ?? null;
      if (!orgId) { setProductsLoading(false); return; }
      const { data } = await client
        .from("products")
        .select("id, name, sku")
        .eq("organization_id", orgId)
        .neq("status", "archived")
        .order("name");
      const list = (data ?? []) as { id: string; name: string; sku: string | null }[];
      setProducts(list);
      if (list.length > 0) setSelectedProduct(list[0].id);
      setProductsLoading(false);
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    async function fetchOrgSuppliers() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data: member } = await client
        .from("organization_members")
        .select("organization_id")
        .eq("profile_id", user.id)
        .limit(1)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orgId = (member as any)?.organization_id as string | undefined;
      if (!orgId) return;
      const { data } = await client
        .from("suppliers")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name");
      setOrgSuppliers((data ?? []) as { id: string; name: string }[]);
    }
    fetchOrgSuppliers();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchStages() {
      if (!selectedProduct) { setRows([]); setLoading(false); return; }
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
  }, [selectedProduct, refreshKey]);

  async function handleAddStage() {
    if (!addForm.stage_name.trim()) { setSaveError("Stage name is required."); return; }
    setSaving(true); setSaveError(null);
    const client = supabase;
    if (!client) { setSaveError("Supabase not configured."); setSaving(false); return; }
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setSaveError("Not authenticated."); setSaving(false); return; }
    const { data: member, error: memberError } = await client
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();
    if (memberError) {
      setSaveError(`Org lookup failed: ${memberError.message} (${memberError.code})`);
      setSaving(false); return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(member as any)?.organization_id) {
      setSaveError(`No org found for profile_id = ${user.id}`);
      setSaving(false); return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgId = (member as any).organization_id as string;

    // Upload certificate evidence if a file was attached
    let certificateUrl: string | null = null;
    if (certificateFile) {
      setSavingLabel("Uploading evidence…");
      const filePath = `${orgId}/${Date.now()}_${certificateFile.name}`;
      const { error: uploadError } = await client.storage
        .from("compliance_docs")
        .upload(filePath, certificateFile);
      if (uploadError) {
        setSaveError(`Certificate upload failed: ${uploadError.message}`);
        setSavingLabel("Saving…");
        setSaving(false);
        return;
      }
      const { data: urlData } = client.storage
        .from("compliance_docs")
        .getPublicUrl(filePath);
      certificateUrl = urlData.publicUrl;
      setSavingLabel("Saving…");
    }

    const { error: insertError } = await client
      .from("lifecycle_stages")
      .insert({
        product_id:      selectedProduct,
        organization_id: orgId,
        stage_name:      addForm.stage_name.trim(),
        subtitle:        addForm.subtitle.trim() || null,
        stage_order:     addForm.stage_order !== "" ? Number(addForm.stage_order) : 0,
        co2_impact_kg:   addForm.co2_impact_kg !== "" ? Number(addForm.co2_impact_kg) : null,
        water_usage_l:   addForm.water_usage_l !== "" ? Number(addForm.water_usage_l) : null,
        supplier_id:     addForm.supplier_id || null,
        certificate_url: certificateUrl,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    if (insertError) { setSaveError(insertError.message); setSaving(false); return; }
    setShowAddModal(false);
    setAddForm({ stage_name: "", subtitle: "", stage_order: "", co2_impact_kg: "", water_usage_l: "", supplier_id: "" });
    setCertificateFile(null);
    setSavingLabel("Saving…");
    setRefreshKey(k => k + 1);
    setSaving(false);
  }

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
            {productsLoading
              ? <option value="" disabled>Loading products…</option>
              : products.length === 0
              ? <option value="" disabled>No products found</option>
              : products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.sku ? ` — ${p.sku}` : ""}
                  </option>
                ))
            }
          </select>
          {onViewDPP && (
            <button onClick={() => onViewDPP(selectedProduct)} data-testid="button-view-dpp" className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0">
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${rows.length} stages tracked`}
            </span>
            {selectedProduct && (
              <button
                onClick={() => { setShowAddModal(true); setSaveError(null); }}
                className="flex items-center gap-1.5 bg-[#6AE096] hover:bg-[#5acc85] text-[#0d2b1e] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stage
              </button>
            )}
          </div>
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-gray-50/50">
              <h3 className="font-semibold text-foreground">Add Lifecycle Stage</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Attach a new supply chain stage to the selected product</p>
            </div>
            <div className="p-6 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{saveError}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Stage Name <span className="text-red-500">*</span></label>
                <input type="text" value={addForm.stage_name}
                  onChange={e => setAddForm(f => ({ ...f, stage_name: e.target.value }))}
                  placeholder="e.g. Raw Material Sourcing"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Subtitle / Location</label>
                <input type="text" value={addForm.subtitle}
                  onChange={e => setAddForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="e.g. Maharashtra, India"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Supplier</label>
                <select
                  value={addForm.supplier_id}
                  onChange={e => setAddForm(f => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">— No supplier —</option>
                  {orgSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Order</label>
                  <input type="number" min="0" value={addForm.stage_order}
                    onChange={e => setAddForm(f => ({ ...f, stage_order: e.target.value }))}
                    placeholder="1"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">CO₂ (kg)</label>
                  <input type="number" min="0" step="0.1" value={addForm.co2_impact_kg}
                    onChange={e => setAddForm(f => ({ ...f, co2_impact_kg: e.target.value }))}
                    placeholder="42.3"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Water (L)</label>
                  <input type="number" min="0" value={addForm.water_usage_l}
                    onChange={e => setAddForm(f => ({ ...f, water_usage_l: e.target.value }))}
                    placeholder="1800"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Upload Certificate (PDF/Image)</label>
                <label className="flex items-center gap-2 w-full border border-dashed border-border rounded-md px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/30 transition-colors">
                  <Paperclip className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className={`truncate ${certificateFile ? "text-foreground" : "text-muted-foreground"}`}>
                    {certificateFile ? certificateFile.name : "Choose a file…"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="sr-only"
                    onChange={e => setCertificateFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); setCertificateFile(null); setSavingLabel("Saving…"); }}
                disabled={saving}
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleAddStage} disabled={saving || !addForm.stage_name.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {savingLabel}</>
                  : "Save Stage"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
