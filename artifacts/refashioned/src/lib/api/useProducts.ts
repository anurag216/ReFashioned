import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type { Product } from "../types";
import { useOrg } from "./useOrg";

async function fetchProducts(orgId: string | null): Promise<Product[]> {
  if (!supabase || !orgId) return [];
  const client = supabase;

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
  const { data: org } = useOrg();
  const orgId = org?.id ?? null;

  return useQuery<Product[]>({
    queryKey: ["products", orgId],
    enabled: !!orgId,
    queryFn: ({ queryKey }) => fetchProducts((queryKey[1] as string | null) ?? null),
  });
}
