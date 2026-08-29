import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { usePermissions } from "../lib/auth/usePermissions";
import { useOrg } from "../lib/api/useOrg";
import { TeamAccess } from "../components/TeamAccess";
import { requestEvidenceSecurityScan, type EvidenceUploadClient } from "../lib/evidenceUpload";

type EvidenceState = { evidence_id: string; evidence_status: string; scan_status: string };

export function Settings() {
  const { isAdmin, role } = usePermissions();
  const { data: org } = useOrg();
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"account" | "team" | "privacy">("account");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const tabs = [{ id: "account" as const, label: "Account" }, ...(isAdmin ? [{ id: "team" as const, label: "Team Access" }] : []), { id: "privacy" as const, label: "Privacy & Data" }];
  useEffect(() => { void supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);

  async function requestErasure() {
    if (!supabase || !window.confirm("Request deletion of your account identity and access?")) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("request_personal_data_erasure");
    setStatus(error?.message ?? `Request received. Current status: ${(data as { status?: string } | null)?.status ?? "requested"}.`);
    setSubmitting(false);
  }

  async function retryPendingEvidenceScans() {
    if (!supabase || !isAdmin) return;
    setScanning(true); setScanStatus(null);
    const { data, error } = await supabase.rpc("get_my_organization_evidence", { p_product_id: null });
    if (error) {
      setScanStatus(`Unable to load pending evidence: ${error.message}`);
      setScanning(false);
      return;
    }
    const pendingIds = [...new Set(((data ?? []) as EvidenceState[])
      .filter(item => item.evidence_status === "quarantined" && item.scan_status === "pending")
      .map(item => item.evidence_id))];
    if (pendingIds.length === 0) {
      setScanStatus("No quarantined evidence is waiting for a security scan.");
      setScanning(false);
      return;
    }

    let started = 0;
    let failed = 0;
    for (const evidenceId of pendingIds) {
      const warning = await requestEvidenceSecurityScan(
        supabase as unknown as Pick<EvidenceUploadClient, "functions">,
        evidenceId,
      );
      if (warning) failed += 1;
      else started += 1;
    }
    setScanStatus(failed === 0
      ? `${started} pending evidence scan${started === 1 ? "" : "s"} completed successfully.`
      : `${started} scan${started === 1 ? "" : "s"} completed; ${failed} remain quarantined because the scanner was unavailable or rejected the request.`);
    setScanning(false);
  }

  return <main className="p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6">
    <header><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground mt-1">Working account and data controls.</p></header>
    <nav className="flex gap-5 border-b" aria-label="Settings sections">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`pb-3 text-sm font-medium border-b-2 ${tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{item.label}</button>)}</nav>
    {tab === "account" && <section className="space-y-5">
      <div className="bg-card border rounded-lg p-6"><h2 className="font-semibold mb-5">Account</h2><dl className="grid sm:grid-cols-2 gap-5"><div><dt className="text-xs uppercase text-muted-foreground">Email</dt><dd className="mt-1">{email || "—"}</dd></div><div><dt className="text-xs uppercase text-muted-foreground">Organization</dt><dd className="mt-1">{org?.name ?? "—"}</dd></div><div><dt className="text-xs uppercase text-muted-foreground">Role</dt><dd className="mt-1 capitalize">{role ?? "—"}</dd></div></dl>{isAdmin && <a href="/profile" className="inline-block mt-6 text-sm text-primary font-medium">Edit organization profile</a>}</div>
      {isAdmin && <div className="bg-card border rounded-lg p-6"><h2 className="font-semibold">Evidence security operations</h2><p className="text-sm text-muted-foreground mt-2">Retry malware scanning only for evidence that is still quarantined and untrusted. A retry cannot approve evidence or supply a scan verdict.</p><button onClick={() => void retryPendingEvidenceScans()} disabled={scanning} className="mt-5 border rounded-md px-4 py-2 text-sm disabled:opacity-50">{scanning ? "Scanning pending evidence…" : "Retry pending security scans"}</button>{scanStatus && <p role="status" className="mt-4 text-sm">{scanStatus}</p>}</div>}
    </section>}
    {tab === "team" && isAdmin && <TeamAccess />}
    {tab === "privacy" && <section className="bg-card border rounded-lg p-6 max-w-2xl"><h2 className="font-semibold">Privacy &amp; Data</h2><p className="text-sm text-muted-foreground mt-2">Request removal of your account access and personal identity. Required company and security records may be retained.</p><button onClick={() => void requestErasure()} disabled={submitting} className="mt-5 border border-red-300 text-red-700 rounded-md px-4 py-2 text-sm disabled:opacity-50">{submitting ? "Submitting…" : "Request account deletion"}</button>{status && <p role="status" className="mt-4 text-sm">{status}</p>}</section>}
  </main>;
}
