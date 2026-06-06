import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Product } from "../types";

async function fetchProducts(): Promise<Product[]> {
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
    .from("products")
    .select("*")
    .eq("organization_id", orgId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}
