import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

type Role = "admin" | "manager" | "viewer";

export interface Permissions {
  role:     Role | null;
  isAdmin:  boolean;
  canEdit:  boolean;
  isViewer: boolean;
  loading:  boolean;
}

export function usePermissions(): Permissions {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { setLoading(false); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: member } = await (client
        .from("organization_members")
        .select("role")
        .eq("profile_id", user.id)
        .limit(1)
        .maybeSingle() as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRole((member as any)?.role ?? null);
      setLoading(false);
    })();
  }, []);

  return {
    role,
    isAdmin:  role === "admin",
    canEdit:  role === "admin" || role === "manager",
    isViewer: role === "viewer",
    loading,
  };
}
