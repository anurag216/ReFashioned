import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { useOrg } from "./useOrg";
import { parseActionItems, parseProductReadiness } from "../readiness";

export function useProductReadiness() {
  const { data: org } = useOrg();
  return useQuery({ queryKey: ["product-readiness",org?.id], enabled: !!org?.id, queryFn: async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data,error }=await supabase.rpc("get_organization_product_readiness");
    if (error) throw new Error(error.message);
    return parseProductReadiness(data);
  } });
}

export function useActionCenter() {
  const { data: org } = useOrg();
  return useQuery({ queryKey: ["action-center",org?.id], enabled: !!org?.id, queryFn: async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data,error }=await supabase.rpc("get_organization_action_center");
    if (error) throw new Error(error.message);
    return parseActionItems(data);
  } });
}
