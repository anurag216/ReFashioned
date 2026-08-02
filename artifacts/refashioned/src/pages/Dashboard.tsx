import { useState, useMemo } from "react";
import {
  Download, Leaf, RefreshCw, Droplets, ChevronRight, Package, Building2,
  BarChart2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { useProducts } from "../lib/api/useProducts";
import { useSuppliers } from "../lib/api/useSuppliers";
import { useLifecycleStages } from "../lib/api/useLifecycleStages";

// ── Tier colours ──────────────────────────────────────────────────────────────
const TIER_META = [
  { tier: 1, label: "Tier 1", color: "#6AE096" },
  { tier: 2, label: "Tier 2", color: "#3B82F6" },
  { tier: 3, label: "Tier 3", color: "#A855F7" },
];

// ── Static projection datasets (Monthly / Quarterly toggles) ──────────────────
const CO2_STATIC = {
  Monthly: [
    { name: "Jan", lastYear: 45, thisYear: 52 }, { name: "Feb", lastYear: 48, thisYear: 58 },
    { name: "Mar", lastYear: 54, thisYear: 66 }, { name: "Apr", lastYear: 60, thisYear: 74 },
    { name: "May", lastYear: 68, thisYear: 82 }, { name: "Jun", lastYear: 72, thisYear: 90 },
    { name: "Jul", lastYear: 75, thisYear: 95 }, { name: "Aug", lastYear: 78, thisYear: 99 },
    { name: "Sep", lastYear: 80, thisYear: 104 }, { name: "Oct", lastYear: 84, thisYear: 110 },
    { name: "Nov", lastYear: 88, thisYear: 116 }, { name: "Dec", lastYear: 92, thisYear: 128 },
  ],
  Quarterly: [
    { name: "Q1", lastYear: 120, thisYear: 150 }, { name: "Q2", lastYear: 180, thisYear: 200 },
    { name: "Q3", lastYear: 160, thisYear: 220 }, { name: "Q4", lastYear: 140, thisYear: 280 },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtL = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : `${n}`;

function truncate(s: string, max = 14) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Empty state inside a chart card ──────────────────────────────────────────
function ChartEmpty({ icon: Icon, message }: { icon: typeof BarChart2; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-[200px] leading-snug">{message}</p>
    </div>
  );
}

// ── Custom Pie label ──────────────────────────────────────────────────────────
interface PieLabelProps {
  cx: number; cy: number; midAngle: number;
  outerRadius: number; value: number; name: string;
}
function PieLabel({ cx, cy, midAngle, outerRadius, value, name }: PieLabelProps) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {name} ({value})
    </text>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard({ onViewMetrics }: { onViewMetrics?: () => void }) {
  const [chartToggle1, setChartToggle1] = useState("Live");
  const [timePeriod,   setTimePeriod]   = useState("year");

  const { data: products  = [], isLoading: productsLoading  } = useProducts();
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: stages    = [], isLoading: stagesLoading    } = useLifecycleStages();

  const dbLoading = productsLoading || suppliersLoading || stagesLoading;

  // ── KPI aggregates ──────────────────────────────────────────────────────────
  const totalCo2Kg  = stages.reduce((s, r) => s + (r.co2_impact_kg ?? 0), 0);
  const totalWaterL = stages.reduce((s, r) => s + (r.water_usage_l  ?? 0), 0);
  const avgCompleteness = suppliers.length > 0
    ? Math.round(suppliers.reduce((s, r) => s + (r.dataCompleteness ?? 0), 0) / suppliers.length)
    : 0;
  const activeCount = suppliers.filter(s => s.status === "active").length;

  const liveHasStages    = stages.length > 0;
  const liveHasSuppliers = suppliers.length > 0;

  // ── Sparkline series ────────────────────────────────────────────────────────
  const sparkCo2   = useMemo(() =>
    stages.map((_, i, a) => ({ v: parseFloat((a.slice(0, i + 1).reduce((s, r) => s + (r.co2_impact_kg ?? 0), 0) / 1000).toFixed(2)) })),
    [stages]);
  const sparkWater = useMemo(() =>
    stages.map((_, i, a) => ({ v: Math.round(a.slice(0, i + 1).reduce((s, r) => s + (r.water_usage_l  ?? 0), 0)) })),
    [stages]);
  const sparkComp  = useMemo(() =>
    suppliers.map((_, i, a) => ({ v: Math.round(a.slice(0, i + 1).reduce((s, r) => s + (r.dataCompleteness ?? 0), 0) / (i + 1)) })),
    [suppliers]);

  // Static fallback sparklines
  const KPI_STATIC = {
    "30d":    { co2: "72.1",  water: "98K",  comp: "76.8", sparkCo2: [{ v: 55 }, { v: 58 }, { v: 61 }, { v: 59 }, { v: 64 }, { v: 68 }, { v: 72 }], sparkWater: [{ v: 72 }, { v: 76 }, { v: 81 }, { v: 84 }, { v: 90 }, { v: 95 }, { v: 98 }], sparkComp: [{ v: 75 }, { v: 75.5 }, { v: 76 }, { v: 76.2 }, { v: 76.4 }, { v: 76.6 }, { v: 76.8 }] },
    "quarter":{ co2: "211.4", water: "304K", comp: "76.8", sparkCo2: [{ v: 148 }, { v: 162 }, { v: 180 }, { v: 195 }, { v: 200 }, { v: 206 }, { v: 211 }], sparkWater: [{ v: 220 }, { v: 240 }, { v: 261 }, { v: 272 }, { v: 285 }, { v: 296 }, { v: 304 }], sparkComp: [{ v: 73 }, { v: 74 }, { v: 74.5 }, { v: 75 }, { v: 75.8 }, { v: 76.4 }, { v: 76.8 }] },
    "year":   { co2: "847.3", water: "1.2M", comp: "76.8", sparkCo2: [{ v: 400 }, { v: 450 }, { v: 500 }, { v: 600 }, { v: 650 }, { v: 800 }, { v: 847 }], sparkWater: [{ v: 800 }, { v: 850 }, { v: 900 }, { v: 950 }, { v: 1100 }, { v: 1150 }, { v: 1200 }], sparkComp: [{ v: 60 }, { v: 62 }, { v: 65 }, { v: 68 }, { v: 71 }, { v: 74 }, { v: 76.8 }] },
  };
  const kpiFb = KPI_STATIC[timePeriod as keyof typeof KPI_STATIC];

  const displayCo2  = liveHasStages    ? (totalCo2Kg / 1000).toFixed(1) : kpiFb.co2;
  const displayWater = liveHasStages   ? fmtL(totalWaterL)               : kpiFb.water;
  const displayComp  = liveHasSuppliers ? String(avgCompleteness)         : kpiFb.comp;
  const co2Trend     = liveHasStages    ? `${activeCount} active suppliers`        : "+12.4% vs. last period";
  const waterTrend   = liveHasStages    ? `${stages.length} stages tracked`        : "+8.7% vs. last period";
  const compTrend    = liveHasSuppliers ? `${suppliers.length} suppliers`           : "+5.2% vs. last period";
  const displaySparkCo2   = liveHasStages    ? sparkCo2  : kpiFb.sparkCo2;
  const displaySparkWater = liveHasStages    ? sparkWater : kpiFb.sparkWater;
  const displaySparkComp  = liveHasSuppliers ? sparkComp  : kpiFb.sparkComp;

  // ── Chart 1: CO₂ by Product (Live) ─────────────────────────────────────────
  const co2ByProduct = useMemo(() => {
    const map: Record<string, { name: string; co2: number }> = {};
    for (const stage of stages) {
      const product = products.find(p => p.id === stage.product_id);
      const key = stage.product_id;
      if (!map[key]) map[key] = { name: product?.name ?? "Unknown", co2: 0 };
      map[key].co2 += stage.co2_impact_kg ?? 0;
    }
    return Object.values(map)
      .map(v => ({ name: truncate(v.name), co2: parseFloat(v.co2.toFixed(1)) }))
      .sort((a, b) => b.co2 - a.co2);
  }, [stages, products]);

  // Static projection for non-Live toggles
  const co2StaticData = CO2_STATIC[chartToggle1 as keyof typeof CO2_STATIC] ?? CO2_STATIC.Quarterly;

  // ── Chart 2: Suppliers by Tier ──────────────────────────────────────────────
  const suppliersByTier = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const s of suppliers) counts[s.tier] = (counts[s.tier] ?? 0) + 1;
    return TIER_META
      .map(t => ({ ...t, value: counts[t.tier] ?? 0 }))
      .filter(t => t.value > 0);
  }, [suppliers]);

  const totalSupplierCount = suppliersByTier.reduce((s, t) => s + t.value, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sustainability Metrics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your brand's environmental impact and progress
            {!dbLoading && liveHasStages && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live data
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timePeriod}
            onChange={e => setTimePeriod(e.target.value)}
            className="bg-white border border-border rounded-md px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="30d">Last 30 days</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* ── Summary count cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products",  value: dbLoading ? "…" : String(products.length),  icon: Package,   color: "text-primary",    bg: "bg-primary/10"  },
          { label: "Total Suppliers", value: dbLoading ? "…" : String(suppliers.length), icon: Building2, color: "text-blue-600",   bg: "bg-blue-50"     },
          { label: "Stages Tracked",  value: dbLoading ? "…" : String(stages.length),    icon: RefreshCw, color: "text-purple-600", bg: "bg-purple-50"   },
          { label: "Total CO₂ (kg)",  value: dbLoading ? "…" : totalCo2Kg.toFixed(1),    icon: Leaf,      color: "text-green-600",  bg: "bg-green-50"    },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-card-border flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${dbLoading ? "text-muted-foreground" : "text-foreground"}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── KPI sparkline cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CO₂ */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between relative">
          {dbLoading && <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center z-10"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" /> CO₂ Footprint</p>
              <h3 className="text-3xl font-bold mt-2">{displayCo2} <span className="text-lg font-normal text-muted-foreground">tons</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium max-w-[120px] text-right leading-tight">{co2Trend}</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displaySparkCo2}><Area type="monotone" dataKey="v" stroke="#12382B" fill="#12382B" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between relative">
          {dbLoading && <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center z-10"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /> Water Usage</p>
              <h3 className="text-3xl font-bold mt-2">{displayWater} <span className="text-lg font-normal text-muted-foreground">liters</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium max-w-[120px] text-right leading-tight">{waterTrend}</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displaySparkWater}><Area type="monotone" dataKey="v" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier coverage */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between relative">
          {dbLoading && <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center z-10"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4 text-purple-500" /> Supplier Data Coverage</p>
              <h3 className="text-3xl font-bold mt-2">{displayComp} <span className="text-lg font-normal text-muted-foreground">%</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium max-w-[120px] text-right leading-tight">{compTrend}</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displaySparkComp}><Area type="monotone" dataKey="v" stroke="#A855F7" fill="#A855F7" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1 — CO₂ by Product ──────────────────────────────── */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="font-semibold text-foreground">
                {chartToggle1 === "Live" ? "CO₂ Impact by Product" : "CO₂ Reduction Trend"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {chartToggle1 === "Live"
                  ? "Total kg CO₂e per product from all lifecycle stages"
                  : "Projected reduction vs. previous period"}
              </p>
            </div>
            <div className="flex bg-muted rounded-md p-1 shrink-0">
              {["Live", "Monthly", "Quarterly"].map(t => (
                <button
                  key={t}
                  onClick={() => setChartToggle1(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle1 === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            {/* Loading */}
            {dbLoading && chartToggle1 === "Live" && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading product data…</p>
              </div>
            )}

            {/* Live: empty state */}
            {!dbLoading && chartToggle1 === "Live" && co2ByProduct.length === 0 && (
              <ChartEmpty
                icon={BarChart2}
                message="No CO₂ data yet. Add lifecycle stages to products to see impact here."
              />
            )}

            {/* Live: bar chart */}
            {!dbLoading && chartToggle1 === "Live" && co2ByProduct.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={co2ByProduct} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    width={55}
                    tickFormatter={v => `${v} kg`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontSize: 12 }}
                    formatter={(v: number) => [`${v} kg CO₂e`, "Total CO₂"]}
                  />
                  <Bar dataKey="co2" name="CO₂ (kg)" fill="#6AE096" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Static projections */}
            {chartToggle1 !== "Live" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={co2StaticData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} unit=" t" width={52} />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontSize: 12 }}
                    formatter={(v: number) => [`${v} t CO₂e`]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="lastYear" name="Last Year"  fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={chartToggle1 === "Monthly" ? 14 : 28} />
                  <Bar dataKey="thisYear" name="This Year"  fill="#6AE096" radius={[4, 4, 0, 0]} barSize={chartToggle1 === "Monthly" ? 14 : 28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2 — Suppliers by Tier ────────────────────────────── */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="font-semibold text-foreground">Suppliers by Tier</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Distribution of your {totalSupplierCount > 0 ? totalSupplierCount : ""} supplier{totalSupplierCount !== 1 ? "s" : ""} across supply chain tiers
              </p>
            </div>
            {liveHasSuppliers && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live
              </span>
            )}
          </div>

          <div className="h-64">
            {/* Loading */}
            {dbLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading supplier data…</p>
              </div>
            )}

            {/* Empty state */}
            {!dbLoading && suppliersByTier.length === 0 && (
              <ChartEmpty
                icon={Building2}
                message="No suppliers yet. Add suppliers in the Supplier Portal to see tier breakdown here."
              />
            )}

            {/* Pie chart */}
            {!dbLoading && suppliersByTier.length > 0 && (
              <div className="flex items-center h-full gap-4">
                <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={suppliersByTier}
                        cx="50%"
                        cy="50%"
                        innerRadius="42%"
                        outerRadius="68%"
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={PieLabel}
                      >
                        {suppliersByTier.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontSize: 12 }}
                        formatter={(v: number, name: string) => [`${v} supplier${v !== 1 ? "s" : ""}`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend sidebar */}
                <div className="flex flex-col gap-3 pr-2 shrink-0">
                  {suppliersByTier.map(t => (
                    <div key={t.tier} className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-none">{t.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.label}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-1 pt-2 border-t border-border">
                    <p className="text-sm font-semibold text-foreground leading-none">{totalSupplierCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lifecycle CTA ────────────────────────────────────────────── */}
      {onViewMetrics && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-primary font-medium">Explore SKU-level impact data in the Lifecycle Traceability view.</p>
          <button
            onClick={onViewMetrics}
            className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            View Lifecycle Data <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
