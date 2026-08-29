import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { usePermissions } from "../lib/auth/usePermissions";
import { useOrg } from "../lib/api/useOrg";
import { TeamAccess } from "../components/TeamAccess";

export function Settings() {
  const { isAdmin, role } = usePermissions();
  const { data: org } = useOrg();
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"account" | "team" | "privacy">("account");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tabs = [{ id: "account" as const, label: "Account" }, ...(isAdmin ? [{ id: "team" as const, label: "Team Access" }] : []), { id: "privacy" as const, label: "Privacy & Data" }];
  useEffect(() => { void supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);

  async function requestErasure() {
    if (!supabase || !window.confirm("Request deletion of your account identity and access?")) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("request_personal_data_erasure");
    setStatus(error?.message ?? `Request received. Current status: ${(data as { status?: string } | null)?.status ?? "requested"}.`);
    setSubmitting(false);
  }

  return <main className="p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6">
    <header><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground mt-1">Working account and data controls.</p></header>
    <nav className="flex gap-5 border-b" aria-label="Settings sections">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`pb-3 text-sm font-medium border-b-2 ${tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{item.label}</button>)}</nav>
    {tab === "account" && <section className="bg-card border rounded-lg p-6"><h2 className="font-semibold mb-5">Account</h2><dl className="grid sm:grid-cols-2 gap-5"><div><dt className="text-xs uppercase text-muted-foreground">Email</dt><dd className="mt-1">{email || "—"}</dd></div><div><dt className="text-xs uppercase text-muted-foreground">Organization</dt><dd className="mt-1">{org?.name ?? "—"}</dd></div><div><dt className="text-xs uppercase text-muted-foreground">Role</dt><dd className="mt-1 capitalize">{role ?? "—"}</dd></div></dl>{isAdmin && <a href="/profile" className="inline-block mt-6 text-sm text-primary font-medium">Edit organization profile</a>}</section>}
    {tab === "team" && isAdmin && <TeamAccess />}
    {tab === "privacy" && <section className="bg-card border rounded-lg p-6 max-w-2xl"><h2 className="font-semibold">Privacy &amp; Data</h2><p className="text-sm text-muted-foreground mt-2">Request removal of your account access and personal identity. Required company and security records may be retained.</p><button onClick={() => void requestErasure()} disabled={submitting} className="mt-5 border border-red-300 text-red-700 rounded-md px-4 py-2 text-sm disabled:opacity-50">{submitting ? "Submitting…" : "Request account deletion"}</button>{status && <p role="status" className="mt-4 text-sm">{status}</p>}</section>}
  </main>;
}
