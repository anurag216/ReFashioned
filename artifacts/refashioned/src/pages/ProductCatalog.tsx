import { useState, useEffect, useRef } from "react";
import {
  Plus, Package, Search, X, CheckCircle2, Clock,
  AlertCircle, Trash2, RefreshCw, ShoppingBag,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { Product } from "../lib/types";

type ProductStatus = "draft" | "in_review" | "published";

const statusConfig: Record<ProductStatus, {
  label: string; dot: string; bg: string; color: string; border: string; icon: typeof Clock;
}> = {
  draft:      { label: "Draft",       dot: "bg-slate-400",  bg: "bg-slate-50",  color: "text-slate-600",  border: "border-slate-200", icon: Clock         },
  in_review:  { label: "In Review",   dot: "bg-amber-400",  bg: "bg-amber-50",  color: "text-amber-700",  border: "border-amber-200", icon: AlertCircle   },
  published:  { label: "Published",   dot: "bg-green-500",  bg: "bg-green-50",  color: "text-green-700",  border: "border-green-200", icon: CheckCircle2  },
};

const SEASONS = ["SS24", "AW24", "SS25", "AW25", "SS26", "AW26", "Evergreen"];

interface FormState {
  name: string;
  sku: string;
  season: string;
  status: ProductStatus;
}

const EMPTY_FORM: FormState = { name: "", sku: "", season: "", status: "draft" };

export function ProductCatalog() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { if (showModal) setTimeout(() => nameRef.current?.focus(), 80); }, [showModal]);

  async function fetchProducts() {
    setLoading(true);
    setFetchError(null);
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setFetchError(error.message);
    else setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // Capture to a local const so TypeScript keeps the non-null narrowing across awaits
    const client = supabase;
    if (!client || !form.name.trim()) return;
    setSaving(true);
    setSaveError(null);

    // 1. Identify current user
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      setSaveError("Not authenticated. Please sign in again.");
      setSaving(false);
      return;
    }

    // 2. Look up organization_id via organization_members (tenant model)
    const { data: member, error: memberError } = await client
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError) {
      setSaveError(`organization_members lookup failed: ${memberError.message} (code: ${memberError.code})`);
      setSaving(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(member as any)?.organization_id) {
      setSaveError(`No organization_members row found for profile_id = ${user.id}`);
      setSaving(false);
      return;
    }

    // 3. Insert product with correct tenant scoping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await client
      .from("products")
      .insert({
        name:                 form.name.trim(),
        sku:                  form.sku.trim()    || null,
        season:               form.season.trim() || null,
        status:               form.status,
        organization_id:      (member as any).organization_id as string,
        created_by:           user.id,
        category:             null,
        description:          null,
        image_url:            null,
        material_composition: null,
        country_of_origin:    null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    if (insertError) {
      setSaveError(insertError.message);
      setSaving(false);
      return;
    }

    setShowModal(false);
    setForm(EMPTY_FORM);
    fetchProducts();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    setDeletingId(id);
    await supabase.from("products").delete().eq("id", id);
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
    (p.season?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  function closeModal() { setShowModal(false); setForm(EMPTY_FORM); setSaveError(null); }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""} in your catalog`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-[0_0_20px_hsl(145_65%_50%/0.35)] shrink-0"
          style={{ background: "linear-gradient(135deg,#6AE096 0%,#3dcc72 100%)", color: "#0d2a1f" }}
        >
          <Plus className="w-4 h-4" /> Create Product
        </button>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, SKU, or season…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Error banner ───────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{fetchError}</span>
          <button onClick={fetchProducts} className="ml-auto flex items-center gap-1 text-xs font-medium hover:underline">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── No Supabase banner ─────────────────────────────────────── */}
      {!supabase && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Supabase is not configured. Add <code className="px-1 bg-amber-100 rounded text-xs">VITE_SUPABASE_URL</code> and <code className="px-1 bg-amber-100 rounded text-xs">VITE_SUPABASE_ANON_KEY</code> to your environment to enable live data.
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-left">
              <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Product</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">SKU</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Season</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
              <th className="px-5 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">

            {/* Loading skeleton */}
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-40" /></td>
                <td className="px-5 py-4 hidden sm:table-cell"><div className="h-4 bg-muted rounded w-20" /></td>
                <td className="px-5 py-4 hidden md:table-cell"><div className="h-4 bg-muted rounded w-14" /></td>
                <td className="px-5 py-4"><div className="h-5 bg-muted rounded-full w-20" /></td>
                <td className="px-5 py-4 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-24" /></td>
                <td className="px-5 py-4" />
              </tr>
            ))}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="w-7 h-7 text-primary/60" />
                    </div>
                    <p className="font-medium text-foreground">
                      {search ? "No products match your search" : "No products yet"}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {search
                        ? `Try a different name, SKU, or season.`
                        : "Create your first product to start tracking its lifecycle, certifications, and sustainability data."}
                    </p>
                    {!search && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="mt-1 flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all"
                        style={{ background: "#6AE096", color: "#0d2a1f" }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Create your first product
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Product rows */}
            {!loading && filtered.map(product => {
              const sc = statusConfig[product.status as ProductStatus] ?? statusConfig.draft;
              const StatusIcon = sc.icon;
              return (
                <tr key={product.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-primary/70" />
                      </div>
                      <span className="font-medium text-foreground truncate max-w-[200px]">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-muted-foreground font-mono text-xs">
                      {product.sku ?? <span className="italic opacity-40">—</span>}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-muted-foreground text-xs">
                      {product.season ?? <span className="italic opacity-40">—</span>}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color} ${sc.border}`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-xs text-muted-foreground">
                    {new Date(product.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="p-1.5 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30"
                      title="Delete product"
                    >
                      {deletingId === product.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Create Product Modal ────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#6AE096" }}>
                  <Package className="w-4 h-4" style={{ color: "#0d2a1f" }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">New Product</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Add a product to your catalog</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  required
                  placeholder="e.g. Essential Organic Cotton Tee"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. ECT-001"
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Season</label>
                  <select
                    value={form.season}
                    onChange={e => setForm(f => ({ ...f, season: e.target.value }))}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-colors"
                  >
                    <option value="">— None —</option>
                    {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["draft", "in_review", "published"] as ProductStatus[]).map(s => {
                    const sc = statusConfig[s];
                    const active = form.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                          active
                            ? `${sc.bg} ${sc.color} ${sc.border} shadow-sm ring-2 ring-offset-1 ring-primary/20`
                            : "bg-white text-muted-foreground border-border hover:bg-muted/50"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save error */}
              {saveError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#6AE096 0%,#3dcc72 100%)", color: "#0d2a1f" }}
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {saving ? "Saving…" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
