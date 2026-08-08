import { useState } from "react";
import { Grid } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { currentMembershipQueryKey } from "../lib/auth/useCurrentMembership";

export function Onboarding({
  session,
  onComplete,
}: {
  session: Session;
  onComplete: () => void;
}) {
  const [brandName, setBrandName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !brandName.trim()) return;
    setSaving(true);
    setError(null);
    const client = supabase;

    // Supplier invitation redemption requires a dedicated, token-verifying RPC.
    // Do not create an unrelated brand organization for invited suppliers.
    const savedToken = localStorage.getItem("refashioned_invite_token");
    if (savedToken) {
      // TODO: redeem through the dedicated supplier-invitation flow.
      setError("Supplier invitations are not available in onboarding yet. Please contact your administrator.");
      setSaving(false);
      return;
    }

    const { error: rpcError } = await client.rpc<
      "create_organization_with_admin",
      { organization_name: string }
    >("create_organization_with_admin", {
      organization_name: brandName.trim(),
    });
    if (rpcError) {
      setError("We couldn't create your organization. Please try again or contact support.");
      setSaving(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: currentMembershipQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["org"] });

    onComplete();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "hsl(152 53% 8%)" }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(145 65% 20% / 0.35) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div className="relative mb-8 flex flex-col items-center gap-3">
        <div className="p-3 rounded-xl shadow-lg" style={{ background: "hsl(145 65% 66%)" }}>
          <Grid className="w-6 h-6" style={{ color: "hsl(152 53% 11%)" }} />
        </div>
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "hsl(0 0% 95%)" }}
          >
            RE:Fashioned
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(0 0% 95% / 0.45)" }}>
            Sustainability Intelligence Platform
          </p>
        </div>
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "hsl(152 40% 11%)",
          border: "1px solid hsl(152 40% 18%)",
        }}
      >
        {/* Card header */}
        <div
          className="px-6 pt-6 pb-5"
          style={{ borderBottom: "1px solid hsl(152 40% 18% / 0.7)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "hsl(0 0% 95%)" }}>
            Welcome! Let&apos;s set up your brand.
          </h2>
          <p className="text-sm mt-1" style={{ color: "hsl(0 0% 95% / 0.45)" }}>
            Just one step before you get started.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wider"
              style={{ color: "hsl(0 0% 95% / 0.55)" }}
            >
              Brand Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="e.g. Patagonia, PANGAIA…"
              className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2"
              style={{
                background: "hsl(152 53% 8% / 0.6)",
                border: "1px solid hsl(152 40% 22%)",
                color: "hsl(0 0% 95%)",
              }}
            />
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
              style={{
                background: "hsl(0 84% 60% / 0.1)",
                border: "1px solid hsl(0 84% 60% / 0.3)",
                color: "hsl(0 84% 75%)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !brandName.trim()}
            className="w-full font-semibold text-sm py-2.5 rounded-lg transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "hsl(145 65% 66%)",
              color: "hsl(152 53% 11%)",
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin w-4 h-4 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Setting up your brand…
              </>
            ) : (
              "Complete Setup"
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          className="px-6 pb-6 flex justify-center"
          style={{ borderTop: "1px solid hsl(152 40% 18% / 0.5)" }}
        >
          <p className="text-xs pt-4" style={{ color: "hsl(0 0% 95% / 0.35)" }}>
            Signed in as{" "}
            <span style={{ color: "hsl(0 0% 95% / 0.6)" }}>{session.user.email}</span>
          </p>
        </div>
      </div>

      <p
        className="relative mt-8 text-xs text-center"
        style={{ color: "hsl(0 0% 95% / 0.2)" }}
      >
        © 2025 RE:Fashioned · Sustainability Intelligence
      </p>
    </div>
  );
}
