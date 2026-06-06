import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export type SupplierStatus = "active" | "needs-action" | "pending" | "invited" | "not-invited";

export type SupplierRow = {
  id: string | number;
  name: string;
  contact: string;
  location: string;
  tier: 1 | 2 | 3;
  status: SupplierStatus;
  stage: string;
  certs: { name: string; status: "uploaded" | "missing" | "expiring" }[];
  dataCompleteness: number;
  lastActivity: string;
};

async function fetchSuppliers(): Promise<SupplierRow[]> {
  if (!supabase) {
    throw new Error(
      "Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Replit Secrets."
    );
  }
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberRow } = await (client
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle() as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId: string | null = (memberRow as any)?.organization_id ?? null;
  if (!orgId) return [];

  const { data, error } = await client
    .from("suppliers")
    .select("id, name, contact_name, location, tier, status, stage, data_completeness, last_activity")
    .eq("organization_id", orgId)
    .order("tier", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:               r.id as string | number,
    name:             (r.name          as string) ?? "—",
    contact:          (r.contact_name  as string) ?? "—",
    location:         (r.location      as string) ?? "—",
    tier:             (r.tier          as 1 | 2 | 3) ?? 1,
    status:           (r.status        as SupplierStatus) ?? "not-invited",
    stage:            (r.stage         as string) ?? "—",
    certs:            [],
    dataCompleteness: (r.data_completeness as number) ?? 0,
    lastActivity:     (r.last_activity as string) ?? "—",
  }));
}

export function useSuppliers() {
  return useQuery<SupplierRow[]>({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });
}
