import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Organization } from "../types";

async function fetchOrg(): Promise<Organization | null> {
  if (!supabase) return null;
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (client
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle() as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId: string | null = (member as any)?.organization_id ?? null;
  if (!orgId) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle() as any);

  if (error) throw new Error(error.message);
  return (data as Organization) ?? null;
}

export function useOrg() {
  return useQuery<Organization | null>({
    queryKey: ["org"],
    queryFn: fetchOrg,
  });
}
