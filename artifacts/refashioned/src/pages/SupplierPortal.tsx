import { useEffect, useState } from "react";
import {
  Building, UserCheck, Clock, AlertTriangle, XCircle, RefreshCcw,
  Plus, Search, Send, CheckCircle2, X, MapPin, MoreHorizontal,
  Link2, MailOpen, Upload, FileBadge, Copy,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useSuppliers, type SupplierRow } from "../lib/api/useSuppliers";
import { useAuthUserId } from "../lib/auth/AuthUserContext";
import { useCurrentMembership } from "../lib/auth/useCurrentMembership";

type SupplierAccessAdminRow = {
  supplier_contact_id: string | null;
  contact_name: string | null;
  contact_email: string;
  active_access_membership_id: string | null;
  access_state: string;
  pending_invitation_id: string | null;
  invitation_state: string;
  invitation_expires_at: string | null;
};

export function SupplierPortal() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ supplierId: "", email: "", message: "" });
  const [inviteSending, setInviteSending] = useState(false);
  const [magicLink, setMagicLink]         = useState<string | null>(null);
  const [linkCopied, setLinkCopied]       = useState(false);
  const [inviteExpiry, setInviteExpiry]   = useState<string | null>(null);
  const [inviteError, setInviteError]     = useState<string | null>(null);
  const [selectedCerts, setSelectedCerts] = useState<string[]>(["GOTS", "Fair Trade"]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", location: "", tier: "1", status: "active" as "active" | "inactive" | "under_review" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [accessRows, setAccessRows] = useState<SupplierAccessAdminRow[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [revocationReason, setRevocationReason] = useState("");
  const userId = useAuthUserId();
  const { data: membership } = useCurrentMembership(userId);
  const isAdmin = membership?.role === "admin";
  const canEdit = isAdmin || membership?.role === "manager";

  const { data: suppliers = [], isLoading: loading, error: fetchErrorObj, refetch } = useSuppliers();
  const fetchError = fetchErrorObj instanceof Error ? fetchErrorObj.message : null;

  async function loadAccessAdmin(supplierId: string) {
    if (!supabase) return;
    setAccessLoading(true); setAccessError(null);
    const { data, error } = await supabase.rpc("get_supplier_access_admin", { p_supplier_id: supplierId });
    if (error) setAccessError(error.code === "42501" ? "You are not authorized to view this supplier's portal access." : "Unable to load supplier portal access.");
    else setAccessRows((data ?? []) as SupplierAccessAdminRow[]);
    setAccessLoading(false);
  }

  useEffect(() => { if (selectedSupplierId) void loadAccessAdmin(selectedSupplierId); }, [selectedSupplierId]);

  async function revokeInvitation(invitationId: string) {
    if (!supabase || !selectedSupplierId) return;
    const { error } = await supabase.rpc("revoke_supplier_invite", { p_invitation_id: invitationId });
    if (error) setAccessError(error.code === "42501" ? "You are not authorized to revoke this invitation." : error.message);
    else await loadAccessAdmin(selectedSupplierId);
  }

  async function revokeAccess(membershipId: string) {
    if (!supabase || !selectedSupplierId) return;
    const reason = revocationReason.trim();
    if (reason.length < 3) { setAccessError("Enter a meaningful revocation reason."); return; }
    const { error } = await supabase.rpc("revoke_supplier_access", { p_access_membership_id: membershipId, p_reason: reason });
    if (error) setAccessError(error.code === "42501" ? "You are not authorized to revoke this access." : error.message);
    else { setRevocationReason(""); await loadAccessAdmin(selectedSupplierId); }
  }

  const statusConfig: Record<SupplierRow["status"], { label: string; color: string; bg: string; border: string; dot: string }> = {
    "active":       { label: "Active",        color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500"  },
    "needs-action": { label: "Needs Action",  color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500"    },
    "pending":      { label: "Data Pending",  color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500"  },
    "invited":      { label: "Invited",       color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-400"   },
    "not-invited":  { label: "Not Invited",   color: "text-slate-600", bg: "bg-slate-50",  border: "border-slate-200",  dot: "bg-slate-400"  },
  };

  const certConfig: Record<string, string> = {
    uploaded: "bg-green-100 text-green-700 border-green-200",
    missing:  "bg-red-50 text-red-600 border-red-200",
    expiring: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const tierColors = ["", "bg-primary text-white", "bg-blue-600 text-white", "bg-slate-500 text-white"];

  const filters = [
    { id: "all", label: "All Suppliers" },
    { id: "tier1", label: "Tier 1" },
    { id: "tier2", label: "Tier 2" },
    { id: "tier3", label: "Tier 3" },
    { id: "needs-action", label: "Needs Action" },
    { id: "not-invited", label: "Not Invited" },
  ];

  const filteredSuppliers = suppliers.filter(s => {
    const matchFilter =
      activeFilter === "all" ? true :
      activeFilter === "tier1" ? s.tier === 1 :
      activeFilter === "tier2" ? s.tier === 2 :
      activeFilter === "tier3" ? s.tier === 3 :
      s.status === activeFilter;
    const matchSearch = searchQuery === "" || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = [
    { label: "Total Suppliers", value: suppliers.length, icon: Building, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active & Complete", value: suppliers.filter(s => s.status === "active").length, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Awaiting Data", value: suppliers.filter(s => s.status === "pending" || s.status === "invited").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Needs Attention", value: suppliers.filter(s => s.status === "needs-action" || s.status === "not-invited").length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  ];

  const certOptions = ["GOTS", "Fair Trade", "OEKO-TEX", "BlueSign", "ZDHC", "SA8000", "REACH", "FSC", "ISO 14001"];

  async function handleAddSupplier() {
    if (!addForm.name.trim()) { setSaveError("Supplier name is required."); return; }
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
    if (!member?.organization_id) {
      setSaveError(`No org found for profile_id = ${user.id}`);
      setSaving(false); return;
    }
    const { error: insertError } = await client
      .from("suppliers")
      .insert({
        organization_id: member.organization_id,
        name:     addForm.name.trim(),
        tier:     Number(addForm.tier) as 1 | 2 | 3,
        status:   addForm.status,
        location: addForm.location.trim() || null,
      });
    if (insertError) { setSaveError(insertError.message); setSaving(false); return; }
    setShowAddModal(false);
    setAddForm({ name: "", location: "", tier: "1", status: "active" });
    void refetch();
    setSaving(false);
  }

  function closeInviteModal() {
    setShowInviteModal(false);
    setMagicLink(null);
    setLinkCopied(false);
    setInviteError(null);
    setInviteForm({ supplierId: "", email: "", message: "" });
  }

  async function handleSendInvite() {
    if (!supabase || !inviteForm.supplierId || !inviteForm.email.trim()) return;
    setInviteSending(true);
    setInviteError(null);
    const client = supabase;
    const { data, error: inviteRpcError } = await client.rpc("create_supplier_invite", { p_supplier_id: inviteForm.supplierId, p_email: inviteForm.email });
    const invite = data?.[0];
    if (inviteRpcError || !invite?.token) {
      setInviteError(inviteRpcError?.message?.includes("already has active portal access")
        ? "This supplier contact already has portal access."
        : inviteRpcError?.code === "42501" ? "Only organization administrators can invite suppliers." : "Failed to create a secure invitation.");
      setInviteSending(false);
      return;
    }
    setMagicLink(`${window.location.origin}/join?token=${invite.token}`);
    setInviteExpiry(invite.expires_at);
    setInviteSending(false);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supplier Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Onboard suppliers, track data submissions, and manage certification uploads</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && <button
            onClick={() => { setShowAddModal(true); setSaveError(null); }}
            className="flex items-center gap-2 bg-[#6AE096] hover:bg-[#5acc85] text-[#0d2b1e] px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>}
          {isAdmin && <button
            data-testid="button-invite-supplier"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" /> Invite
          </button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-card-border flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            data-testid="input-supplier-search"
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.id}
              data-testid={`filter-${f.id}`}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeFilter === f.id ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:text-foreground hover:border-primary/40"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier table */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {loading ? "Loading…" : `${filteredSuppliers.length} suppliers`}
          </span>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" /> Sync data
          </button>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Fetching supplier data…</p>
          </div>
        )}

        {/* Error state */}
        {!loading && fetchError && (
          <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-800"><span className="font-semibold">Failed to load suppliers.</span> {fetchError}</p>
          </div>
        )}

        {!loading && !fetchError && filteredSuppliers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">No suppliers match your filter.</div>
        ) : !loading && !fetchError ? (
          <div className="divide-y divide-border">
            {filteredSuppliers.map(s => {
              const sc = statusConfig[s.status];
              return (
                <div key={s.id} data-testid={`supplier-row-${s.id}`} className="px-6 py-5 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                    {/* Name + meta */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                        <Building className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{s.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierColors[s.tier]}`}>T{s.tier}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>
                          <span className="text-xs text-muted-foreground">{s.stage}</span>
                        </div>
                        {s.contact !== "—" && (
                          <p className="text-xs text-muted-foreground mt-0.5">Contact: {s.contact}</p>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 lg:w-36 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>

                    {/* Certifications */}
                    <div className="flex flex-wrap gap-1.5 lg:w-56 shrink-0">
                      {s.certs.map((c, j) => (
                        <span key={j} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${certConfig[c.status]}`}>
                          {c.status === "uploaded" && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {c.status === "missing"  && <XCircle className="w-2.5 h-2.5" />}
                          {c.status === "expiring" && <AlertTriangle className="w-2.5 h-2.5" />}
                          {c.name}
                        </span>
                      ))}
                    </div>

                    {/* Data completeness */}
                    <div className="lg:w-36 shrink-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Data completeness</span>
                        <span className={`text-xs font-semibold ${s.dataCompleteness === 100 ? "text-green-600" : s.dataCompleteness >= 60 ? "text-amber-600" : "text-red-500"}`}>{s.dataCompleteness}%</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${s.dataCompleteness}%`,
                            backgroundColor: s.dataCompleteness === 100 ? "#6AE096" : s.dataCompleteness >= 60 ? "#F59E0B" : "#EF4444"
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{s.lastActivity}</p>
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === "active" && (
                        <button onClick={() => setSelectedSupplierId(String(s.id))} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors px-3 py-1.5 border border-primary/30 rounded-md hover:bg-primary/5">
                          View
                        </button>
                      )}
                      {s.status === "needs-action" && (
                        <button className="text-xs text-red-600 font-medium hover:text-red-700 transition-colors px-3 py-1.5 border border-red-200 rounded-md hover:bg-red-50 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Resolve
                        </button>
                      )}
                      {(s.status === "pending" || s.status === "invited") && (
                        <button className="text-xs text-amber-700 font-medium hover:text-amber-800 transition-colors px-3 py-1.5 border border-amber-200 rounded-md hover:bg-amber-50 flex items-center gap-1">
                          <Send className="w-3 h-3" /> Remind
                        </button>
                      )}
                      {s.status === "not-invited" && isAdmin && (
                        <button
                          onClick={() => { setInviteForm(f => ({ ...f, company: s.name, tier: String(s.tier) })); setShowInviteModal(true); }}
                          className="text-xs text-primary font-medium hover:text-primary/80 transition-colors px-3 py-1.5 border border-primary/30 rounded-md hover:bg-primary/5 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Invite
                        </button>
                      )}
                      <button aria-label={`Manage portal access for ${s.name}`} onClick={() => setSelectedSupplierId(String(s.id))} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {selectedSupplierId && <section aria-label="Supplier portal access" className="bg-card rounded-xl shadow-sm border border-card-border p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="font-semibold">Portal access</h2><p className="text-xs text-muted-foreground">Manage verified access and pending invitations for this supplier.</p></div>
          <button onClick={() => setSelectedSupplierId(null)} className="rounded p-2 hover:bg-muted" aria-label="Close portal access"><X className="h-4 w-4" /></button>
        </div>
        {accessLoading && <p className="mt-4 text-sm text-muted-foreground">Loading portal access…</p>}
        {accessError && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{accessError}</p>}
        {!accessLoading && accessRows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No supplier contacts or pending invitations.</p>}
        <div className="mt-4 space-y-3">
          {accessRows.map((row, index) => <div key={`${row.contact_email}-${index}`} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.contact_name ?? "Pending contact"}</p>
                <p className="text-sm text-muted-foreground">{row.contact_email}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1">Access: {row.access_state}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Invitation: {row.invitation_state}</span>
                </div>
                {row.invitation_expires_at && <p className="mt-2 text-xs text-muted-foreground">Expires {new Date(row.invitation_expires_at).toLocaleString()}</p>}
              </div>
              {isAdmin && <div className="flex flex-col items-end gap-2">
                {row.pending_invitation_id && <button onClick={() => void revokeInvitation(row.pending_invitation_id!)} className="rounded border border-red-200 px-3 py-1 text-xs text-red-700">Revoke invitation</button>}
                {row.active_access_membership_id && <>
                  <input aria-label="Access revocation reason" value={revocationReason} onChange={event => setRevocationReason(event.target.value)} placeholder="Revocation reason" className="rounded border px-3 py-1 text-xs" />
                  <button onClick={() => void revokeAccess(row.active_access_membership_id!)} className="rounded border border-red-200 px-3 py-1 text-xs text-red-700">Revoke access</button>
                </>}
              </div>}
            </div>
          </div>)}
        </div>
      </section>}

      {/* Onboarding checklist summary */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Onboarding Checklist — Tier 2 Gap Analysis</h3>
        <p className="text-sm text-muted-foreground mb-5">Your CSRD Scope 3 disclosure requires data from all Tier 2 suppliers. Current coverage: <span className="font-semibold text-amber-600">60%</span>.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Accept invitation", count: "2 of 3", done: false, icon: MailOpen },
            { label: "Upload company profile", count: "1 of 3", done: false, icon: Upload },
            { label: "Submit certifications", count: "0 of 3", done: false, icon: FileBadge },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <step.icon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.count} suppliers complete</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Supplier modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50/50">
              <div>
                <h3 className="font-semibold text-foreground">Add Supplier</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Create a new supplier record in your organization</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{saveError}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Supplier Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sunrise Ginning Co."
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Location</label>
                <input
                  type="text"
                  value={addForm.location}
                  onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Gujarat, India"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Supply Chain Tier</label>
                  <select
                    value={addForm.tier}
                    onChange={e => setAddForm(f => ({ ...f, tier: e.target.value }))}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="1">Tier 1 — Direct</option>
                    <option value="2">Tier 2 — Secondary</option>
                    <option value="3">Tier 3 — Raw material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Status</label>
                  <select
                    value={addForm.status}
                    onChange={e => setAddForm(f => ({ ...f, status: e.target.value as "active" | "inactive" | "under_review" }))}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="under_review">Under Review</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex items-center justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleAddSupplier} disabled={saving || !addForm.name.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : "Save Supplier"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-border w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">Invite a Supplier</h2>
                <p className="text-xs text-muted-foreground mt-0.5">They'll receive an email with a secure link to submit their data</p>
              </div>
              <button onClick={closeInviteModal} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {!magicLink ? (
            <div className="p-6 space-y-4">
              {inviteError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {inviteError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1.5">Existing supplier</label>
                  <select
                    data-testid="select-invite-supplier"
                    value={inviteForm.supplierId}
                    onChange={e => setInviteForm(f => ({ ...f, supplierId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  ><option value="">Select a supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1.5">Contact email</label>
                  <input
                    data-testid="input-invite-email"
                    type="email"
                    placeholder="contact@supplier.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Language</label>
                  <select className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Bengali</option>
                    <option>Dutch</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Required certifications to upload</label>
                <div className="flex flex-wrap gap-2">
                  {certOptions.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCerts(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${selectedCerts.includes(c) ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40"}`}
                    >
                      {selectedCerts.includes(c) && <span className="mr-1">✓</span>}{c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Personal message (optional)</label>
                <textarea
                  data-testid="input-invite-message"
                  rows={3}
                  placeholder="Hi, we'd like to invite you to join our supply chain transparency platform..."
                  value={inviteForm.message}
                  onChange={e => setInviteForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
            ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Invite created!</p>
                  <p className="text-xs text-green-700 mt-0.5">Share this one-time link with the selected supplier.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Magic Link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={magicLink ?? ""}
                    onClick={e => (e.target as HTMLInputElement).select()}
                    className="flex-1 min-w-0 px-3 py-2 text-xs border border-border rounded-md bg-muted font-mono focus:outline-none cursor-text"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(magicLink ?? "");
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors shrink-0"
                  >
                    {linkCopied
                      ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Copied!</>
                      : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                </div>
              </div>
              {inviteExpiry && <p className="text-xs text-muted-foreground">Expires {new Date(inviteExpiry).toLocaleString()}.</p>}
            </div>
            )}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              {!magicLink ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Generating a replacement invalidates the previous pending link.</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={closeInviteModal} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors font-medium">
                      Cancel
                    </button>
                    <button
                      data-testid="button-send-invite"
                      onClick={handleSendInvite}
                      disabled={!inviteForm.supplierId || !inviteForm.email || inviteSending}
                      className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all shadow-sm bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteSending
                        ? <><RefreshCcw className="w-4 h-4 animate-spin" /> Generating…</>
                        : <><Send className="w-4 h-4" /> Send Invitation</>}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end w-full">
                  <button onClick={closeInviteModal} className="px-5 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
