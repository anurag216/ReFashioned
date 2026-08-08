import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Organization } from "../types";
import { useCurrentMembership } from "../auth/useCurrentMembership";
import { useAuthUserId } from "../auth/AuthUserContext";

async function fetchOrg(orgId: string | null): Promise<Organization | null> {
  if (!supabase) return null;
  if (!orgId) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle() as any);

  if (error) throw new Error(error.message);
  return (data as Organization) ?? null;
}

export function useOrg() {
  const userId = useAuthUserId();
  const membership = useCurrentMembership(userId);
  const orgId = membership.data?.organization_id ?? null;
  return useQuery<Organization | null>({
    queryKey: ["org", orgId],
    queryFn: () => {
      if (membership.error) throw membership.error;
      return fetchOrg(orgId);
    },
    enabled: !membership.isLoading,
  });
}
