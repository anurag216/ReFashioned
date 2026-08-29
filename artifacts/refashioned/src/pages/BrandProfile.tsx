import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { usePermissions } from "../lib/auth/usePermissions";
import { useOrg } from "../lib/api/useOrg";

export function BrandProfile() {
  const { data: org, isLoading } = useOrg();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setName(org?.name ?? ""), [org?.name]);

  async function save() {
    if (!supabase) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc("update_organization_profile", { p_name: name });
    if (error) setMessage(error.message);
    else {
      await queryClient.invalidateQueries({ queryKey: ["org"] });
      setMessage("Organization name updated.");
    }
    setSaving(false);
  }

  return <main className="p-6 md:p-8 max-w-3xl w-full mx-auto space-y-6">
    <header>
      <h1 className="text-2xl font-bold">Organization Profile</h1>
      <p className="text-sm text-muted-foreground mt-1">Persisted information for your current organization.</p>
    </header>
    <section className="bg-card border border-card-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6"><Building2 className="w-5 h-5"/><h2 className="font-semibold">Organization</h2></div>
      <dl className="grid sm:grid-cols-2 gap-5 mb-6">
        <div><dt className="text-xs uppercase text-muted-foreground">Current organization</dt><dd className="mt-1 font-medium">{isLoading ? "Loading…" : org?.name}</dd></div>
        <div><dt className="text-xs uppercase text-muted-foreground">Internal plan</dt><dd className="mt-1 font-medium capitalize">{isLoading ? "Loading…" : org?.plan}</dd></div>
      </dl>
      {isAdmin && <div className="border-t pt-5">
        <label htmlFor="organization-name" className="text-sm font-medium">Organization name</label>
        <div className="flex gap-2 mt-2">
          <input id="organization-name" maxLength={120} value={name} onChange={e => setName(e.target.value)} className="flex-1 border rounded-md px-3 py-2 text-sm" />
          <button type="button" onClick={() => void save()} disabled={saving || !name.trim()} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>}
      {message && <p role="status" className="text-sm mt-4">{message}</p>}
    </section>
  </main>;
}
