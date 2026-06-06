import { useState } from "react";
import {
  Check, Zap, Building2, Sparkles, ArrowUpRight, Loader2, CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useOrg } from "../lib/api/useOrg";
import { useQueryClient } from "@tanstack/react-query";

type PlanId = "starter" | "growth" | "enterprise";

interface Tier {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string | null;
  accent: string;
  ring: string;
  badge: string;
}

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "forever",
    tagline: "For brands starting their sustainability journey.",
    features: [
      "Up to 10 products",
      "Basic lifecycle tracking",
      "1 Digital Product Passport",
      "Supplier portal (up to 5)",
      "Community support",
    ],
    cta: null,
    accent: "text-slate-600",
    ring: "ring-slate-200",
    badge: "bg-slate-100 text-slate-600",
  },
  {
    id: "growth",
    name: "Growth",
    price: "$99",
    period: "per month",
    tagline: "For brands scaling sustainability operations.",
    features: [
      "Unlimited products",
      "Full lifecycle traceability",
      "Unlimited Digital Product Passports",
      "Supplier portal (unlimited)",
      "CSRD / ESRS reporting",
      "Carbon footprint modelling",
      "Priority support",
    ],
    cta: "Upgrade to Growth",
    accent: "text-[#6AE096]",
    ring: "ring-[#6AE096]/40",
    badge: "bg-[#6AE096]/15 text-[#6AE096]",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    tagline: "For multi-brand groups with complex compliance needs.",
    features: [
      "Everything in Growth",
      "Multi-brand / multi-tenant",
      "Custom integrations & APIs",
      "Dedicated compliance consultant",
      "SLA & uptime guarantees",
      "SSO / SAML",
    ],
    cta: "Contact Sales",
    accent: "text-purple-500",
    ring: "ring-purple-300/40",
    badge: "bg-purple-100 text-purple-600",
  },
];

export function Billing() {
  const { data: org, isLoading: orgLoading } = useOrg();
  const queryClient = useQueryClient();

  const [upgrading, setUpgrading]     = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgraded, setUpgraded]       = useState(false);

  const currentPlan: PlanId = org?.plan ?? "starter";
  const orgId = org?.id ?? null;

  async function handleUpgradeGrowth() {
    if (!supabase || !orgId) return;
    setUpgrading(true);
    setUpgradeError(null);
    setUpgraded(false);

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("organizations") as any)
      .update({ plan: "growth" })
      .eq("id", orgId);

    setUpgrading(false);
    if (error) {
      setUpgradeError(error.message);
      return;
    }
    setUpgraded(true);
    void queryClient.invalidateQueries({ queryKey: ["org"] });
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Billing &amp; Plan</h1>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits your brand. Upgrade or downgrade at any time.
        </p>
      </div>

      {/* Current plan badge */}
      {!orgLoading && org && (
        <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-[#6AE096]/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#6AE096]" />
          </div>
          <div>
            <p className="text-sm font-semibold capitalize">
              {org.name} · <span className="text-[#6AE096]">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan</span>
            </p>
            <p className="text-xs text-muted-foreground">Active subscription</p>
          </div>
        </div>
      )}

      {/* Success banner */}
      {upgraded && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">Upgraded to Growth Plan — all features are now unlocked.</p>
        </div>
      )}

      {/* Error banner */}
      {upgradeError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {upgradeError}
        </div>
      )}

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map(tier => {
          const isCurrent = currentPlan === tier.id;
          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ring-2 transition-shadow ${
                isCurrent ? tier.ring : "ring-transparent"
              } ${tier.id === "growth" ? "shadow-lg" : ""}`}
            >
              {/* Most popular ribbon */}
              {tier.id === "growth" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#6AE096] text-[hsl(152_53%_8%)] text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tier.id === "starter"    && <Zap      className="w-4 h-4 text-slate-400" />}
                    {tier.id === "growth"     && <Sparkles className="w-4 h-4 text-[#6AE096]" />}
                    {tier.id === "enterprise" && <Building2 className="w-4 h-4 text-purple-400" />}
                    <span className={`text-sm font-semibold ${tier.accent}`}>{tier.name}</span>
                  </div>
                  {isCurrent && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tier.badge}`}>
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">{tier.price}</span>
                  <span className="text-xs text-muted-foreground mb-1">/ {tier.period}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tier.tagline}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                    <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tier.accent}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.id === "growth" && !isCurrent && tier.cta && (
                <button
                  onClick={handleUpgradeGrowth}
                  disabled={upgrading || orgLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[#6AE096] text-[hsl(152_53%_8%)] hover:bg-[#6AE096]/90 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {upgrading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Upgrading…</>
                    : <><Zap className="w-4 h-4" /> {tier.cta}</>
                  }
                </button>
              )}
              {tier.id === "growth" && isCurrent && (
                <div className="w-full text-center text-xs text-[#6AE096] font-semibold py-2.5 rounded-lg border border-[#6AE096]/30 bg-[#6AE096]/5">
                  ✓ Your current plan
                </div>
              )}
              {tier.id === "enterprise" && tier.cta && (
                <button className="w-full flex items-center justify-center gap-2 border border-purple-300 text-purple-600 hover:bg-purple-50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                  <ArrowUpRight className="w-4 h-4" /> {tier.cta}
                </button>
              )}
              {tier.id === "starter" && !isCurrent && (
                <div className="w-full text-center text-xs text-muted-foreground py-2.5">
                  Downgrade not available from UI
                </div>
              )}
              {tier.id === "starter" && isCurrent && (
                <div className="w-full text-center text-xs text-slate-500 font-medium py-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  ✓ Your current plan
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ / legal note */}
      <p className="text-xs text-muted-foreground text-center">
        All plans are billed monthly. No contracts. Cancel or change at any time.
        Tax may apply depending on your jurisdiction.
      </p>
    </div>
  );
}
