import { useState, useEffect, type ElementType } from "react";
import { useSearch } from "wouter";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowLeft, Grid, ScanLine, Share, FileCheck, ShieldCheck,
  Leaf, RefreshCw, Package, Shirt, Recycle, MapPin,
  CheckCircle2, ThumbsUp, ThumbsDown, AlertTriangle, Droplets,
} from "lucide-react";

interface DppStageRow {
  label: string;
  icon: ElementType;
  title: string;
  location: string;
  supplier: string;
  desc: string;
  cert: string;
  certColor: string;
  co2: string;
  water: string;
}

const DPP_STAGE_ICON_MAP: Record<string, { icon: ElementType }> = {
  "Raw Material Sourcing":    { icon: Leaf      },
  "Processing & Spinning":    { icon: RefreshCw },
  "Scouring & Processing":    { icon: RefreshCw },
  "Fabric Production":        { icon: Package   },
  "Spinning & Knitting":      { icon: Package   },
  "Dyeing & Finishing":       { icon: Droplets  },
  "Garment Manufacturing":    { icon: Shirt     },
  "Garment Assembly":         { icon: Shirt     },
  "Shipping & Logistics":     { icon: Package   },
  "Care & Use":               { icon: Shirt     },
  "Circularity & Recycling":  { icon: Recycle   },
};
const DPP_DEFAULT_ICON = { icon: Package };

export function DigitalProductPassport({ onBack }: { onBack: () => void }) {
  const search = useSearch();
  const productId = new URLSearchParams(search).get("productId");
  const [activeStage, setActiveStage] = useState(0);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [productName, setProductName] = useState("Essential Cotton Tee");
  const [productSku, setProductSku] = useState<string | null>(null);
  const [productLoading, setProductLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setProductLoading(false); return; }
    const client = supabase;
    async function fetchProduct() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (client.from("products").select("name, sku") as any);
      if (productId) q = q.eq("id", productId);
      else q = q.order("name");
      const { data } = await q.limit(1).maybeSingle();
      if (data) {
        setProductName(data.name ?? "Unknown Product");
        setProductSku(data.sku ?? null);
      }
      setProductLoading(false);
    }
    fetchProduct();
  }, [productId]);

  const [liveStages, setLiveStages] = useState<DppStageRow[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);

  useEffect(() => {
    setActiveStage(0);
    if (!supabase) { setStagesLoading(false); return; }
    const client = supabase;
    async function fetchLiveStages() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQ = (client.from("lifecycle_stages").select(
        "stage_name, subtitle, location, description, co2_impact_kg, water_usage_l, certification, certification_status, suppliers(name)"
      ) as any);
      const q = productId ? baseQ.eq("product_id", productId) : baseQ;
      const { data } = await q.order("stage_order", { ascending: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: DppStageRow[] = (data ?? []).map((r: any) => {
        const iconMeta = DPP_STAGE_ICON_MAP[r.stage_name as string] ?? DPP_DEFAULT_ICON;
        const certColor =
          r.certification_status === "verified" ? "bg-green-100 text-green-700 border-green-200" :
          r.certification_status === "expired"  ? "bg-red-100 text-red-700 border-red-200" :
                                                  "bg-amber-100 text-amber-700 border-amber-200";
        return {
          label:    ((r.stage_name as string) ?? "Stage").split(/\s+/)[0],
          icon:     iconMeta.icon,
          title:    (r.stage_name  as string) ?? "—",
          location: (r.location    as string) ?? "—",
          supplier: (r.suppliers as any)?.name ?? "—",
          desc:     (r.description as string) ?? (r.subtitle as string) ?? "",
          cert:     (r.certification as string) ?? "",
          certColor,
          co2:   r.co2_impact_kg != null ? `${r.co2_impact_kg} kg CO₂e` : "—",
          water: r.water_usage_l  != null ? `${Number(r.water_usage_l).toLocaleString()} L` : "—",
        };
      });
      setLiveStages(mapped);
      setStagesLoading(false);
    }
    fetchLiveStages();
  }, [productId]);

  const stages = [
    {
      label: "Sourcing",
      icon: Leaf,
      title: "Raw Material Sourcing",
      location: "Maharashtra, India",
      supplier: "EcoFibers Cooperative Ltd.",
      desc: "EcoFibers is a cooperative of organic cotton farmers dedicated to regenerative agriculture and fair labor practices. Cotton is grown without synthetic pesticides using rain-fed irrigation.",
      cert: "GOTS Certified",
      certColor: "bg-green-100 text-green-700 border-green-200",
      co2: "42.3 kg CO₂e",
      water: "1,800 L",
    },
    {
      label: "Spinning",
      icon: RefreshCw,
      title: "Processing & Spinning",
      location: "Tamil Nadu, India",
      supplier: "EcoSpin Facility",
      desc: "Spun, woven, and sewn in Portugal using renewable energy. The facility is powered by 100% solar and wind energy, significantly reducing the carbon footprint of this stage.",
      cert: "BlueSign Approved",
      certColor: "bg-blue-100 text-blue-700 border-blue-200",
      co2: "18.7 kg CO₂e",
      water: "450 L",
    },
    {
      label: "Logistics",
      icon: Package,
      title: "Shipping & Logistics",
      location: "Rotterdam, Netherlands",
      supplier: "GreenShip Logistics",
      desc: "Shipped via low-height sea freight to reduce emissions. Carbon offset credits applied for remaining emissions. Packaging is fully compostable and plastic-free.",
      cert: "Carbon Neutral",
      certColor: "bg-teal-100 text-teal-700 border-teal-200",
      co2: "5.1 kg CO₂e",
      water: "12 L",
    },
    {
      label: "Use Phase",
      icon: Shirt,
      title: "Care & Use",
      location: "End Consumer",
      supplier: "You",
      desc: "Care instructions designed for a long life. Wash at 30°C, line dry. This garment is designed to last 5+ years with proper care, dramatically reducing its lifetime impact.",
      cert: "Designed for Longevity",
      certColor: "bg-purple-100 text-purple-700 border-purple-200",
      co2: "Est. 12.4 kg CO₂e",
      water: "Est. 680 L",
    },
    {
      label: "End of Life",
      icon: Recycle,
      title: "Circularity & Recycling",
      location: "Take-Back Network",
      supplier: "RE:Fashion Take-Back",
      desc: "Fully recyclable and compostable at end of life. Return via the EcoThread take-back programme for textile recycling or composting. Zero waste to landfill commitment.",
      cert: "Circular Certified",
      certColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      co2: "–12.1 kg CO₂e (offset)",
      water: "0 L",
    },
  ];

  const certs = [
    { name: "Global Organic Textile Standard (GOTS)", desc: "For all organic cotton components", icon: Leaf, color: "text-green-600" },
    { name: "Fair Trade Certified", desc: "Ensuring ethical treatment of workers", icon: ShieldCheck, color: "text-amber-600" },
    { name: "BlueSign Approved", desc: "Responsible chemical management", icon: Droplets, color: "text-blue-600" },
    { name: "OEKO-TEX Standard 100", desc: "Under review — limited validity", icon: AlertTriangle, color: "text-red-500", flagged: true },
  ];

  const comparisons = [
    { label: "CO₂ Emissions", unit: "kg", thisProd: 84.5, industryAvg: 250, less: "66% Less CO₂", barColor: "bg-[#6AE096]", avgColor: "bg-slate-300" },
    { label: "Water Consumption", unit: "L", thisProd: 2965, industryAvg: 33000, less: "91% Less Water", barColor: "bg-blue-400", avgColor: "bg-slate-300" },
    { label: "Circularity Score", unit: "/100", thisProd: 85, industryAvg: 38, less: "85/100 Score", barColor: "bg-purple-400", avgColor: "bg-slate-300", higherIsBetter: true },
  ];

  const displayStages = !stagesLoading && liveStages.length > 0 ? liveStages : stages;

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      {/* Public top nav */}
      <header className="bg-white border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              data-testid="button-dpp-back"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="bg-primary text-white p-1 rounded-md">
                <Grid className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-sm text-foreground">RE:Fashioned</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-full px-3 py-1 bg-muted/50">
              <ScanLine className="w-3.5 h-3.5" /> Scanned via QR Code
            </div>
            <button
              data-testid="button-dpp-share"
              className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary/90 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              <Share className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[#12382B] text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#6AE096]/20 text-[#6AE096] border border-[#6AE096]/30 rounded-full px-3 py-1 mb-4">
            <FileCheck className="w-3.5 h-3.5" /> Product Journey
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {productLoading ? <span className="opacity-50">Loading…</span> : productName}
          </h1>
          <p className="text-sm text-white/60 mb-1">
            {productSku ? `SKU: ${productSku}` : "By EcoThread"}
          </p>
          <p className="text-sm text-white/70 max-w-xl mt-3 leading-relaxed">
            A testament to sustainable craft, this tee is designed for timeless style and minimal impact. Discover its journey from seed to shirt.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-[#6AE096]/10 border border-[#6AE096]/30 rounded-md px-4 py-2">
            <ShieldCheck className="w-4 h-4 text-[#6AE096]" />
            <span className="text-sm text-[#6AE096] font-medium">Every component's lifecycle is verified by RE:Fashioned.</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="bg-white/10 rounded-lg px-5 py-3 border border-white/20">
              <p className="text-2xl font-bold text-[#6AE096]">84.5 kg</p>
              <p className="text-xs text-white/60 mt-0.5">CO₂ Reduced vs. conventional</p>
            </div>
            <div className="bg-white/10 rounded-lg px-5 py-3 border border-white/20">
              <p className="text-2xl font-bold text-blue-300">2,965 L</p>
              <p className="text-xs text-white/60 mt-0.5">Water Saved vs. industry avg</p>
            </div>
            <div className="bg-white/10 rounded-lg px-5 py-3 border border-white/20">
              <p className="text-2xl font-bold text-purple-300">4</p>
              <p className="text-xs text-white/60 mt-0.5">Active Certifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Lifecycle Journey */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Product Lifecycle Journey</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Click a stage to explore its details</p>
          </div>

          {/* Stage stepper */}
          <div className="px-6 py-5 border-b border-border overflow-x-auto">
            <div className="flex items-start gap-0 min-w-max">
              {displayStages.map((s, i) => (
                <div key={i} className="flex items-center">
                  <button
                    data-testid={`button-stage-${i}`}
                    onClick={() => setActiveStage(i)}
                    className={`flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all group ${activeStage === i ? "bg-primary/8" : "hover:bg-muted/50"}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${activeStage === i ? "bg-primary border-primary text-white shadow-md scale-110" : "bg-white border-border text-muted-foreground group-hover:border-primary/40"}`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${activeStage === i ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                  </button>
                  {i < displayStages.length - 1 && (
                    <div className={`h-0.5 w-8 transition-colors ${i < activeStage ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active stage detail */}
          <div className="p-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {(() => { const Icon = displayStages[activeStage].icon; return <Icon className="w-5 h-5 text-primary" />; })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{displayStages[activeStage].title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" /> {displayStages[activeStage].location}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{displayStages[activeStage].desc}</p>
                <div className="mt-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${displayStages[activeStage].certColor}`}>
                    <ShieldCheck className="w-3 h-3" /> {displayStages[activeStage].cert}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 content-start">
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Supplier</p>
                  <p className="text-sm font-medium text-foreground">{displayStages[activeStage].supplier}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Location</p>
                  <p className="text-sm font-medium text-foreground">{displayStages[activeStage].location}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">CO₂ Impact</p>
                  <p className="text-sm font-semibold text-green-700">{displayStages[activeStage].co2}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Water Used</p>
                  <p className="text-sm font-semibold text-blue-700">{displayStages[activeStage].water}</p>
                </div>
              </div>
            </div>

            {/* Stage navigation */}
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setActiveStage(Math.max(0, activeStage - 1))}
                disabled={activeStage === 0}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-xs text-muted-foreground">{activeStage + 1} of {displayStages.length}</span>
              <button
                onClick={() => setActiveStage(Math.min(displayStages.length - 1, activeStage + 1))}
                disabled={activeStage === displayStages.length - 1}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                Next <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Impact comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-base font-semibold text-foreground mb-1">How We Compare</h2>
            <p className="text-sm text-muted-foreground mb-6">This product's impact vs. a conventional cotton t-shirt</p>
            <div className="space-y-7">
              {comparisons.map((c, i) => {
                const maxVal = Math.max(c.thisProd, c.industryAvg);
                const thisPct = Math.round((c.thisProd / maxVal) * 100);
                const avgPct = 100;
                return (
                  <div key={i} data-testid={`comparison-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">{c.label}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.higherIsBetter ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>{c.less}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">This Tee</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`${c.barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${c.higherIsBetter ? avgPct : thisPct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground w-20 text-right">{c.thisProd}{c.unit}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">Industry Avg</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`${c.avgColor} h-full rounded-full transition-all duration-500`} style={{ width: `${c.higherIsBetter ? Math.round((c.industryAvg / maxVal) * 100) : avgPct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-20 text-right">{c.industryAvg}{c.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-base font-semibold text-foreground mb-1">Certifications & Standards</h2>
            <p className="text-sm text-muted-foreground mb-6">Verified standards held by this product's supply chain</p>
            <div className="space-y-4">
              {certs.map((cert, i) => (
                <div key={i} data-testid={`cert-${i}`} className={`flex items-start gap-4 p-4 rounded-lg border ${cert.flagged ? "bg-red-50/50 border-red-200" : "bg-muted/30 border-border"}`}>
                  <div className={`mt-0.5 ${cert.color}`}>
                    <cert.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${cert.flagged ? "text-red-700" : "text-foreground"}`}>{cert.name}</p>
                      {cert.flagged && (
                        <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">Under Review</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cert.desc}</p>
                  </div>
                  {!cert.flagged && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>

            {/* EU DPP compliance badge */}
            <div className="mt-6 bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-md">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">EU Digital Product Passport Ready</p>
                <p className="text-xs text-muted-foreground mt-0.5">Compliant with ESPR Regulation 2024/1781 — Article 9</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Was this information useful?</h3>
          <p className="text-xs text-muted-foreground mb-4">Your feedback helps brands improve their transparency reporting.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              data-testid="button-feedback-up"
              onClick={() => setFeedback("up")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-all ${feedback === "up" ? "bg-green-500 text-white border-green-500 scale-105 shadow-sm" : "bg-white text-foreground border-border hover:border-green-400 hover:text-green-600"}`}
            >
              <ThumbsUp className="w-4 h-4" /> Yes, very
            </button>
            <button
              data-testid="button-feedback-down"
              onClick={() => setFeedback("down")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-all ${feedback === "down" ? "bg-red-500 text-white border-red-500 scale-105 shadow-sm" : "bg-white text-foreground border-border hover:border-red-400 hover:text-red-500"}`}
            >
              <ThumbsDown className="w-4 h-4" /> Not really
            </button>
          </div>
          {feedback && (
            <p className="text-xs text-muted-foreground mt-3 animate-in fade-in duration-300">
              {feedback === "up" ? "Thank you! We're glad this data is helping you make informed choices." : "Thanks for the feedback — we'll work on making this clearer."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-muted-foreground border-t border-border">
          © 2023 EcoThread &nbsp;|&nbsp; Impact verified by RE:Fashioned &nbsp;|&nbsp; The Future of Fashion is Transparent
        </div>
      </div>
    </div>
  );
}
