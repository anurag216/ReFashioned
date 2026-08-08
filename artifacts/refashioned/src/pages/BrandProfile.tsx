import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Organization } from "../lib/types";
import { usePermissions } from "../lib/auth/usePermissions";
import { useOrg } from "../lib/api/useOrg";
import {
  Share, CheckCircle2, Copy, QrCode, Edit2, Leaf, Droplets,
  RefreshCw, User, ChevronRight, Save, X, AlertTriangle,
} from "lucide-react";

export function BrandProfile({ onViewDashboard }: { onViewDashboard?: () => void }) {
  type OrganizationProfileView = Organization & {
    website: string | null;
    industryLabel: string | null;
    headquarters: string | null;
  };
  const organizationQuery = useOrg();
  const orgLoading = organizationQuery.isLoading;
  const orgId = organizationQuery.data?.id ?? null;
  const [org, setOrg] = useState<OrganizationProfileView | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editHq, setEditHq] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { isAdmin } = usePermissions();

  useEffect(() => {
    if (!organizationQuery.data) return;
    setOrg({ ...organizationQuery.data, website: null, industryLabel: null, headquarters: null });
  }, [organizationQuery.data]);

  function startEdit() {
    setEditName(org?.name ?? "");
    setEditWebsite(org?.website ?? "");
    setEditIndustry(org?.industryLabel ?? "");
    setEditHq(org?.headquarters ?? "");
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!supabase || !orgId) return;
    if (!editName.trim()) { setSaveError("Brand name cannot be empty."); return; }
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    const client = supabase;
    try {
      const { error } = await client.from("organizations").update({ name: editName.trim() }).eq("id", orgId);
      if (error) throw error;
      setOrg(prev => prev ? {
        ...prev,
        name: editName.trim(),
        website: editWebsite.trim() || null,
        industryLabel: editIndustry.trim() || null,
        headquarters: editHq.trim() || null,
      } : prev);
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const displayName    = orgLoading ? "…" : (org?.name ?? "Your Brand");
  const displayWebsite = org?.website ?? null;
  const displayIndustry = org?.industryLabel ?? "Sustainable Fashion";
  const displayHq      = org?.headquarters ?? null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brand Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Your public-facing sustainability profile</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors shadow-sm bg-white">
            Preview
          </button>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            <Share className="w-4 h-4" /> Share Profile
          </button>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <div>
            <h4 className="text-sm font-medium text-primary">Your brand profile is public</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {orgLoading ? "Loading…" : `Profile for ${displayName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-border rounded-md pl-3 pr-1 py-1 shadow-sm w-full sm:w-auto">
          <span className="text-xs text-muted-foreground truncate">
            refashioned.com/brands/{org?.id ?? "your-brand"}
          </span>
          <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy URL">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors border-l border-border ml-1 pl-2" title="Show QR">
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">Brand profile updated successfully.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Brand Information card ────────────────────────────── */}
        <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
          {!editing ? (
            <>
              {isAdmin && (
                <button
                  onClick={startEdit}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  title="Edit brand information"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <h3 className="font-semibold text-foreground mb-4">Brand Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Company</p>
                  <p className={`text-sm font-medium text-foreground ${orgLoading ? "opacity-40" : ""}`}>{displayName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Tagline</p>
                  <p className="text-sm text-foreground">Sustainable fashion brand focused on eco-friendly materials and ethical production practices</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Industry</p>
                    <p className="text-sm text-foreground">{orgLoading ? "…" : displayIndustry}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Headquarters</p>
                    <p className="text-sm text-foreground">{orgLoading ? "…" : (displayHq ?? "—")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Website</p>
                    {displayWebsite ? (
                      <a href={displayWebsite} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                        {displayWebsite.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 italic">Not set</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Plan</p>
                    <p className="text-sm text-foreground capitalize">{orgLoading ? "…" : (org?.plan ?? "—")}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Edit Brand Information</h3>
                <button
                  onClick={cancelEdit}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Website URL</label>
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={e => setEditWebsite(e.target.value)}
                    placeholder="https://yourbrand.com"
                    className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</label>
                    <input
                      type="text"
                      value={editIndustry}
                      onChange={e => setEditIndustry(e.target.value)}
                      placeholder="e.g. Sustainable Fashion"
                      className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HQ Country</label>
                    <input
                      type="text"
                      value={editHq}
                      onChange={e => setEditHq(e.target.value)}
                      placeholder="e.g. Sweden"
                      className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700">{saveError}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving
                      ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Saving…</>
                      : <><Save className="w-3.5 h-3.5" /> Save Changes</>
                    }
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Sustainability Snapshot card ─────────────────────── */}
        <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
          <h3 className="font-semibold text-foreground mb-6">Sustainability Snapshot</h3>
          <div className="space-y-5">
            {[
              { label: "CO₂ Reduction", val: "42%", icon: Leaf, bg: "bg-primary/10", color: "text-primary" },
              { label: "Water Conservation", val: "35%", icon: Droplets, bg: "bg-blue-500/10", color: "text-blue-600" },
              { label: "Recycled Materials", val: "76.8%", icon: RefreshCw, bg: "bg-purple-500/10", color: "text-purple-600" },
              { label: "Fair Labor", val: "100%", icon: User, bg: "bg-amber-500/10", color: "text-amber-600" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${row.bg} p-2 rounded-md`}>
                    <row.icon className={`w-4 h-4 ${row.color}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
                <span className={`text-lg font-semibold ${row.color}`}>{row.val}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <button onClick={onViewDashboard} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View detailed metrics <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Sustainability Journey timeline ───────────────────── */}
      <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border">
        <h3 className="font-semibold text-foreground mb-6">Sustainability Journey</h3>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {[
            { year: "2018", title: "Founded with Sustainability Mission", desc: "Launched with a commitment to sustainable materials and ethical production practices." },
            { year: "2020", title: "100% Organic Cotton", desc: "Transitioned entire cotton supply chain to GOTS certified organic." },
            { year: "2021", title: "Launched Take-Back Program", desc: "Introduced circularity initiative for post-consumer garments." },
            { year: "2023", title: "Joined RE:Fashioned", desc: "Committed to radical transparency and data verification." },
          ].map((item, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <span className="text-[10px] font-bold">{item.year.slice(2)}</span>
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-border shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                  <span className="text-xs font-medium text-primary px-2 py-0.5 bg-primary/10 rounded-full">{item.year}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
