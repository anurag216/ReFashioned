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
  const [role, setRole]       = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;

    (async () => {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: member, error: memberError } = await (client
          .from("organization_members")
          .select("role")
          .eq("profile_id", user.id)
          .limit(1)
          .maybeSingle() as any);

        if (memberError) {
          console.error("[usePermissions] organization_members lookup failed:", memberError.message);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetched = (member as any)?.role ?? null;
        setRole(fetched as Role | null);
      } catch (err) {
        console.error("[usePermissions] unexpected error:", err);
      } finally {
        setLoading(false);
      }
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
