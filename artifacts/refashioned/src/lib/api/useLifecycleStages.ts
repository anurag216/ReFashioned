import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export interface LifecycleStageSummary {
  id: string;
  product_id: string;
  organization_id: string;
  stage_name: string;
  co2_impact_kg: number | null;
  water_usage_l: number | null;
}

async function fetchLifecycleStages(): Promise<LifecycleStageSummary[]> {
  if (!supabase) return [];
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (client
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle() as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId: string | null = (member as any)?.organization_id ?? null;
  if (!orgId) return [];

  const { data, error } = await client
    .from("lifecycle_stages")
    .select("id, product_id, organization_id, stage_name, co2_impact_kg, water_usage_l")
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);
  return (data ?? []) as LifecycleStageSummary[];
}

export function useLifecycleStages() {
  return useQuery<LifecycleStageSummary[]>({
    queryKey: ["lifecycle_stages"],
    queryFn: fetchLifecycleStages,
  });
}
