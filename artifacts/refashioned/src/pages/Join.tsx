import { useSearch } from "wouter";
import { AlertCircle, Grid } from "lucide-react";

export function Join() {
  const token = new URLSearchParams(useSearch()).get("token");
  const message = token
    ? "Supplier invitation verification is temporarily unavailable. Please contact the organization that invited you."
    : "No invite token was found in this link. Please contact the organization that invited you.";

  // Invitation rows are intentionally not public. Token verification and
  // redemption will be implemented together in a dedicated security RPC.
  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: "hsl(152 53% 8%)" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#6AE096]/20 border border-[#6AE096]/30 rounded-2xl p-3.5 mb-4">
            <Grid className="w-8 h-8" style={{ color: "#6AE096" }} />
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">RE:Fashioned</h1>
          <p className="text-white/50 text-xs mt-1">Sustainability Intelligence Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-2">Invitation verification unavailable</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <p className="text-center text-white/30 text-xs mt-6">© 2025 RE:Fashioned · Sustainability Intelligence</p>
      </div>
    </div>
  );
}
