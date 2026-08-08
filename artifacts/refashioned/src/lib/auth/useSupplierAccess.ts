import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export interface SupplierAccess { supplier_name: string; organization_name: string }
export const supplierAccessQueryKey = (userId: string | null) => ["supplier-access", userId] as const;

export async function fetchSupplierAccess(): Promise<SupplierAccess | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_my_supplier_access");
  if (error) throw new Error("Unable to load supplier access.");
  if (data.length > 1) throw new Error("Conflicting supplier identities. Contact support.");
  return data[0] ?? null;
}

export function useSupplierAccess(userId: string | null) {
  return useQuery({ queryKey: supplierAccessQueryKey(userId), queryFn: fetchSupplierAccess, enabled: userId !== null });
}
