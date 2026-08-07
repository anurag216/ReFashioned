import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { useOrg } from "./useOrg";

export interface LifecycleStageSummary {
  id: string;
  product_id: string;
  organization_id: string;
  stage_name: string;
  co2_impact_kg: number | null;
  water_usage_l: number | null;
}

async function fetchLifecycleStages(orgId: string | null): Promise<LifecycleStageSummary[]> {
  if (!supabase || !orgId) return [];
  const client = supabase;

  const { data, error } = await client
    .from("lifecycle_stages")
    .select("id, product_id, organization_id, stage_name, co2_impact_kg, water_usage_l")
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);
  return (data ?? []) as LifecycleStageSummary[];
}

export function useLifecycleStages() {
  const { data: org } = useOrg();
  const orgId = org?.id ?? null;

  return useQuery<LifecycleStageSummary[]>({
    queryKey: ["lifecycle_stages", orgId],
    enabled: !!orgId,
    queryFn: ({ queryKey }) => fetchLifecycleStages((queryKey[1] as string | null) ?? null),
  });
}
