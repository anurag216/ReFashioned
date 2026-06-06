import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { supabase } from "../lib/supabaseClient";
import { CheckCircle2, AlertCircle, RefreshCw, Grid } from "lucide-react";

export function Join() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const token = new URLSearchParams(search).get("token");

  const [loading, setLoading]   = useState(true);
  const [invite, setInvite]     = useState<{ supplier_name: string; org_name: string } | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invite token found in this link.");
      setLoading(false);
      return;
    }
    if (!supabase) {
      setError("Service temporarily unavailable.");
      setLoading(false);
      return;
    }
    const client = supabase;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (client.from("supplier_invites") as any)
        .select("supplier_name, organization_id, status")
        .eq("token", token)
        .maybeSingle();

      if (fetchError || !data) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any).status === "expired") {
        setError("This invite link has expired. Please ask the brand to send a new one.");
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: org } = await (client.from("organizations") as any)
        .select("name")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("id", (data as any).organization_id)
        .maybeSingle();

      setInvite({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supplier_name: (data as any).supplier_name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        org_name: (org as any)?.name ?? "RE:Fashioned",
      });
      setLoading(false);
    })();
  }, [token]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-sans"
      style={{ background: "hsl(152 53% 8%)" }}
    >
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#6AE096]/20 border border-[#6AE096]/30 rounded-2xl p-3.5 mb-4">
            <Grid className="w-8 h-8" style={{ color: "#6AE096" }} />
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">RE:Fashioned</h1>
          <p className="text-white/50 text-xs mt-1">Sustainability Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#6AE096" }} />
              <p className="text-sm text-muted-foreground">Verifying your invite…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-base font-semibold text-foreground mb-2">Invite not found</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
            </div>
          )}

          {/* Invite found */}
          {!loading && invite && (
            <>
              <div className="px-8 pt-8 pb-6 text-center border-b border-border">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(106,224,150,0.15)" }}
                >
                  <CheckCircle2 className="w-7 h-7" style={{ color: "#6AE096" }} />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-3">You're invited!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{invite.org_name}</span> has invited{" "}
                  <span className="font-semibold text-foreground">{invite.supplier_name}</span> to join
                  RE:Fashioned as a supply chain partner.
                </p>
              </div>
              <div className="px-8 py-6 space-y-3">
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "#6AE096", color: "#0d2b1e" }}
                >
                  Create Supplier Account
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("/")}
                    className="underline hover:text-foreground transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © 2025 RE:Fashioned · Sustainability Intelligence
        </p>
      </div>
    </div>
  );
}
