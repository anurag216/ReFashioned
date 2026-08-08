import { useState, useEffect } from "react";
import { PackagePlus, AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../lib/api/useOrg";

interface Props {
  calcCo2: number;
}

export function LogStagePanel({ calcCo2 }: Props) {
  const { data: org } = useOrg();
  const isStarterPlan = (org?.plan ?? "starter") === "starter";

  const [liveProducts,   setLiveProducts]   = useState<{ id: string; name: string }[]>([]);
  const [liveSuppliers,  setLiveSuppliers]  = useState<{ id: string; name: string }[]>([]);
  const [calcProductId,  setCalcProductId]  = useState<string>("");
  const [calcSupplierId, setCalcSupplierId] = useState<string>("");
  const [calcStageName,  setCalcStageName]  = useState<string>("Raw Material Sourcing");
  const [calcWaterL,     setCalcWaterL]     = useState<string>("");
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    async function load() {
      const orgId = org?.id ?? null;
      if (!orgId) return;
      const [prodRes, supRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.from("products").select("id, name").eq("organization_id", orgId).order("name") as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.from("suppliers").select("id, name").eq("organization_id", orgId).order("name") as any),
      ]);
      const prods = (prodRes.data ?? []) as { id: string; name: string }[];
      const sups  = (supRes.data  ?? []) as { id: string; name: string }[];
      setLiveProducts(prods);
      setLiveSuppliers(sups);
      if (prods.length > 0) setCalcProductId(prods[0].id);
    }
    load();
  }, [org?.id]);

  async function handleSaveStage() {
    if (!supabase) return;
    if (!calcProductId)       { setSaveError("Please select a product."); return; }
    if (!calcStageName.trim()) { setSaveError("Please enter a stage name."); return; }
    if (calcCo2 <= 0)          { setSaveError("Enter a valid weight greater than 0."); return; }
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    const client = supabase;
    try {
      const orgId = org?.id ?? null;
      if (!orgId) throw new Error("No organisation found");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (client.from("lifecycle_stages").select("stage_order").eq("product_id", calcProductId).order("stage_order", { ascending: false }).limit(1).maybeSingle() as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextOrder = ((existing as any)?.stage_order ?? 0) + 1;
      const payload: Record<string, unknown> = {
        product_id:      calcProductId,
        organization_id: orgId,
        stage_name:      calcStageName.trim(),
        stage_order:     nextOrder,
        co2_impact_kg:   calcCo2,
      };
      if (calcSupplierId) payload.supplier_id = calcSupplierId;
      const waterNum = parseFloat(calcWaterL);
      if (!isNaN(waterNum) && waterNum > 0) payload.water_usage_l = waterNum;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client.from("lifecycle_stages").insert(payload as any) as any);
      if (error) throw error;
      setSaveSuccess(true);
      setCalcStageName("Raw Material Sourcing");
      setCalcWaterL("");
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
          <PackagePlus className="w-4 h-4 text-green-600" />
        </div>
        <h3 className="font-semibold text-foreground">Log to Product</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-5 ml-10">
        Save the calculated CO₂ directly as a lifecycle stage on one of your products
      </p>

      <div className="space-y-4">
        {/* Product selector */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Product</label>
          {liveProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2.5 border border-border">
              No products found — add a product in the Traceability page first.
            </p>
          ) : (
            <select
              value={calcProductId}
              onChange={e => setCalcProductId(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {liveProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {/* Supplier selector */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Supplier <span className="normal-case font-normal">(optional)</span>
          </label>
          <select
            value={calcSupplierId}
            onChange={e => setCalcSupplierId(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">— No supplier —</option>
            {liveSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Stage name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Stage Name</label>
          <input
            type="text"
            value={calcStageName}
            onChange={e => setCalcStageName(e.target.value)}
            placeholder="e.g. Raw Material Sourcing"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Water usage (optional) */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Water Usage (L) <span className="normal-case font-normal">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={calcWaterL}
            onChange={e => setCalcWaterL(e.target.value)}
            placeholder="e.g. 1800"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* CO₂ preview row */}
        <div className="bg-muted/40 border border-border rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">CO₂ to log</p>
          <p className={`text-base font-bold ${calcCo2 > 0 ? "text-primary" : "text-muted-foreground/50"}`}>
            {calcCo2 > 0 ? `${calcCo2.toFixed(2)} kg CO₂e` : "—"}
          </p>
        </div>

        {/* Paywall banner */}
        {isStarterPlan && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-snug">
              <strong>Growth plan required.</strong> Upgrade to the Growth plan to save Carbon calculations directly to your products.{" "}
              <a href="/settings/billing" className="underline font-semibold hover:no-underline">Upgrade now →</a>
            </p>
          </div>
        )}

        {/* Error / success feedback */}
        {saveError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{saveError}</p>
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 font-medium">Stage saved! View it in the Lifecycle Traceability page.</p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSaveStage}
          disabled={saving || liveProducts.length === 0 || calcCo2 <= 0 || isStarterPlan}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Saving…</>
            : <><Save className="w-4 h-4" /> Save Stage</>
          }
        </button>
      </div>
    </div>
  );
}
