import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { useOrg } from "./useOrg";
import type { ActionItem, ProductReadiness } from "../readiness";

async function rpc<T>(name: string): Promise<T> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const client = supabase;
  // The migration is newer than the checked-in generated schema declaration.
  const { data, error } = await (client.rpc as (fn: string) => ReturnType<typeof client.rpc>)(name);
  if (error) throw new Error(error.message);
  return data as T;
}

export function useProductReadiness() {
  const { data: org } = useOrg();
  return useQuery<ProductReadiness[]>({ queryKey: ["product-readiness",org?.id], enabled: !!org?.id, queryFn: () => rpc("get_organization_product_readiness") });
}

export function useActionCenter() {
  const { data: org } = useOrg();
  return useQuery<ActionItem[]>({ queryKey: ["action-center",org?.id], enabled: !!org?.id, queryFn: () => rpc("get_organization_action_center") });
}
