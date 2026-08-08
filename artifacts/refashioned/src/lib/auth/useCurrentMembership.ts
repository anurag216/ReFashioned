import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export type OrganizationRole = "admin" | "manager" | "viewer";

export interface CurrentMembership {
  id: string;
  organization_id: string;
  role: OrganizationRole;
}

export const currentMembershipQueryKey = ["current-membership"] as const;

export async function fetchCurrentMembership(): Promise<CurrentMembership | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, role")
    .eq("profile_id", user.id);

  if (error) throw new Error("Unable to load your organization membership.");
  if (data.length > 1) {
    throw new Error("Multiple organization memberships are not supported yet. Contact support.");
  }
  return data[0] ?? null;
}

export function useCurrentMembership() {
  return useQuery({
    queryKey: currentMembershipQueryKey,
    queryFn: fetchCurrentMembership,
  });
}
