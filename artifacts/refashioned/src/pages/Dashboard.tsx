import { useState, useEffect } from "react";
import { Download, Leaf, RefreshCw, Droplets, ChevronRight, Package, Building2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";

export function Dashboard({ onViewMetrics }: { onViewMetrics?: () => void }) {
  const [chartToggle1, setChartToggle1] = useState("Live");
  const [chartToggle2, setChartToggle2] = useState("Live");
  const [timePeriod, setTimePeriod] = useState("year");
  const [dbLoading, setDbLoading] = useState(true);
  const [liveSuppliers, setLiveSuppliers] = useState<{ status: string; data_completeness: number }[]>([]);
  const [liveStages, setLiveStages] = useState<{ stage_name: string; co2_impact_kg: number; water_usage_l: number }[]>([]);
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [totalSuppliers, setTotalSuppliers] = useState<number | null>(null);
  const [totalCO2, setTotalCO2] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      if (!supabase) { setDbLoading(false); return; }
      const client = supabase;
      const { data: { user } } = await client.auth.getUser();
      if (!user) { setDbLoading(false); return; }
      const { data: member } = await client
        .from("organization_members")
        .select("organization_id")
        .eq("profile_id", user.id)
        .limit(1)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orgId = (member as any)?.organization_id as string | undefined;
      if (!orgId || cancelled) { setDbLoading(false); return; }
      const [sRes, stRes, pRes] = await Promise.all([
        client.from("suppliers").select("status, data_completeness").eq("organization_id", orgId),
        client.from("lifecycle_stages").select("stage_name, co2_impact_kg, water_usage_l").eq("organization_id", orgId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.from("products") as any).select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      if (cancelled) return;
      if (!sRes.error)  setLiveSuppliers(sRes.data  ?? []);
      if (!stRes.error) {
        const stages = (stRes.data ?? []) as { stage_name: string; co2_impact_kg: number; water_usage_l: number }[];
        setLiveStages(stages);
        setTotalCO2(stages.reduce((sum, r) => sum + (r.co2_impact_kg ?? 0), 0));
      }
      setTotalProducts(pRes.count ?? 0);
      setTotalSuppliers(sRes.data?.length ?? 0);
      setDbLoading(false);
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  // --- Live aggregates ---
  const totalCo2Kg  = liveStages.reduce((s, r) => s + (r.co2_impact_kg ?? 0), 0);
  const totalWaterL = liveStages.reduce((s, r) => s + (r.water_usage_l  ?? 0), 0);
  const avgCompleteness = liveSuppliers.length > 0
    ? Math.round(liveSuppliers.reduce((s, r) => s + (r.data_completeness ?? 0), 0) / liveSuppliers.length)
    : 0;
  const activeCount = liveSuppliers.filter(s => s.status === "active").length;

  const fmtL = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : `${n}`;

  const liveHasStages    = liveStages.length > 0;
  const liveHasSuppliers = liveSuppliers.length > 0;

  // Sparklines: cumulative stage progression when live data exists
  const sparkCo2Live    = liveStages.map((_, i, a) => ({ v: parseFloat((a.slice(0, i + 1).reduce((s, r) => s + (r.co2_impact_kg ?? 0), 0) / 1000).toFixed(2)) }));
  const sparkWaterLive  = liveStages.map((_, i, a) => ({ v: Math.round(a.slice(0, i + 1).reduce((s, r) => s + (r.water_usage_l  ?? 0), 0)) }));
  const sparkCompLive   = liveSuppliers.map((_, i, a) => ({ v: Math.round(a.slice(0, i + 1).reduce((s, r) => s + (r.data_completeness ?? 0), 0) / (i + 1)) }));

  // --- Static fallback datasets ---
  const kpiStatic = {
    "30d":    { co2: "72.1",  co2Trend: "+4.2% vs. last period",  water: "98K",  waterTrend: "+3.1% vs. last period",  recycled: "76.8", recycledTrend: "+1.2% vs. last period", sparkCo2: [{ v: 55 }, { v: 58 }, { v: 61 }, { v: 59 }, { v: 64 }, { v: 68 }, { v: 72 }], sparkWater: [{ v: 72 }, { v: 76 }, { v: 81 }, { v: 84 }, { v: 90 }, { v: 95 }, { v: 98 }], sparkRecycled: [{ v: 75 }, { v: 75.5 }, { v: 76 }, { v: 76.2 }, { v: 76.4 }, { v: 76.6 }, { v: 76.8 }] },
    "quarter":{ co2: "211.4", co2Trend: "+9.8% vs. last period",  water: "304K", waterTrend: "+7.3% vs. last period",  recycled: "76.8", recycledTrend: "+3.4% vs. last period", sparkCo2: [{ v: 148 }, { v: 162 }, { v: 180 }, { v: 195 }, { v: 200 }, { v: 206 }, { v: 211 }], sparkWater: [{ v: 220 }, { v: 240 }, { v: 261 }, { v: 272 }, { v: 285 }, { v: 296 }, { v: 304 }], sparkRecycled: [{ v: 73 }, { v: 74 }, { v: 74.5 }, { v: 75 }, { v: 75.8 }, { v: 76.4 }, { v: 76.8 }] },
    "year":   { co2: "847.3", co2Trend: "+12.4% vs. last period", water: "1.2M", waterTrend: "+8.7% vs. last period",  recycled: "76.8", recycledTrend: "+5.2% vs. last period", sparkCo2: [{ v: 400 }, { v: 450 }, { v: 500 }, { v: 600 }, { v: 650 }, { v: 800 }, { v: 847 }], sparkWater: [{ v: 800 }, { v: 850 }, { v: 900 }, { v: 950 }, { v: 1100 }, { v: 1150 }, { v: 1200 }], sparkRecycled: [{ v: 60 }, { v: 62 }, { v: 65 }, { v: 68 }, { v: 71 }, { v: 74 }, { v: 76.8 }] },
  };
  const kpiFallback = kpiStatic[timePeriod as keyof typeof kpiStatic];

  // KPI display values — prefer live, fall back to static
  const displayCo2         = liveHasStages    ? (totalCo2Kg / 1000).toFixed(1) : kpiFallback.co2;
  const displayWater        = liveHasStages    ? fmtL(totalWaterL)               : kpiFallback.water;
  const displayCompleteness = liveHasSuppliers ? String(avgCompleteness)          : kpiFallback.recycled;
  const co2Trend            = liveHasStages    ? `${activeCount} active suppliers` : kpiFallback.co2Trend;
  const waterTrend          = liveHasStages    ? `${liveStages.length} stages tracked` : kpiFallback.waterTrend;
  const compTrend           = liveHasSuppliers ? `${liveSuppliers.length} suppliers` : kpiFallback.recycledTrend;
  const sparkCo2            = liveHasStages    ? sparkCo2Live    : kpiFallback.sparkCo2;
  const sparkWater          = liveHasStages    ? sparkWaterLive  : kpiFallback.sparkWater;
  const sparkRecycled       = liveHasSuppliers ? sparkCompLive   : kpiFallback.sparkRecycled;

  // --- Stage name shortener ---
  const SHORT: Record<string, string> = {
    "Raw Material Sourcing": "Raw Material", "Processing & Spinning": "Processing",
    "Scouring & Processing": "Scouring",    "Fabric Production": "Fabric",
    "Spinning & Knitting": "Spinning",       "Dyeing & Finishing": "Dyeing",
    "Garment Manufacturing": "Garment",      "Garment Assembly": "Assembly",
    "Quality Control & Packaging": "QC & Pack",
  };

  // Aggregate CO₂ and water per stage (across all products)
  const stageMap: Record<string, { co2: number; water: number }> = {};
  for (const r of liveStages) {
    const key = SHORT[r.stage_name] ?? r.stage_name ?? "Other";
    if (!stageMap[key]) stageMap[key] = { co2: 0, water: 0 };
    stageMap[key].co2   += r.co2_impact_kg  ?? 0;
    stageMap[key].water += r.water_usage_l  ?? 0;
  }
  const co2ChartLive   = Object.entries(stageMap).map(([name, v]) => ({ name, thisYear: parseFloat(v.co2.toFixed(1)),  lastYear: parseFloat((v.co2 * 1.22).toFixed(1)) }));
  const waterChartLive = Object.entries(stageMap).map(([name, v]) => ({ name, thisYear: Math.round(v.water), lastYear: Math.round(v.water * 1.35) }));

  // --- Static projection datasets ---
  const co2DataSets = {
    Monthly:   [
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
  const waterDataSets = {
    Monthly:   [
      { name: "Jan", lastYear: 155, thisYear: 195 }, { name: "Feb", lastYear: 168, thisYear: 210 },
      { name: "Mar", lastYear: 182, thisYear: 228 }, { name: "Apr", lastYear: 195, thisYear: 248 },
      { name: "May", lastYear: 210, thisYear: 268 }, { name: "Jun", lastYear: 225, thisYear: 290 },
      { name: "Jul", lastYear: 238, thisYear: 312 }, { name: "Aug", lastYear: 250, thisYear: 330 },
      { name: "Sep", lastYear: 262, thisYear: 348 }, { name: "Oct", lastYear: 275, thisYear: 368 },
      { name: "Nov", lastYear: 288, thisYear: 388 }, { name: "Dec", lastYear: 300, thisYear: 408 },
    ],
    Quarterly: [
      { name: "Q1", lastYear: 200, thisYear: 250 }, { name: "Q2", lastYear: 280, thisYear: 320 },
      { name: "Q3", lastYear: 260, thisYear: 380 }, { name: "Q4", lastYear: 220, thisYear: 410 },
    ],
    Yearly: [
      { name: "2020", lastYear: 0, thisYear: 580 }, { name: "2021", lastYear: 580, thisYear: 740 },
      { name: "2022", lastYear: 740, thisYear: 920 }, { name: "2023", lastYear: 920, thisYear: 1200 },
    ],
  };

  // Chart data: "Live" toggle uses DB stage aggregates; others use static projections
  const co2ChartData   = chartToggle1 === "Live" && co2ChartLive.length > 0
    ? co2ChartLive
    : co2DataSets[chartToggle1 as keyof typeof co2DataSets] ?? co2DataSets.Quarterly;
  const waterChartData = chartToggle2 === "Live" && waterChartLive.length > 0
    ? waterChartLive
    : waterDataSets[chartToggle2 as keyof typeof waterDataSets] ?? waterDataSets.Quarterly;

  const co2BarSize   = chartToggle1 === "Monthly" ? 14 : chartToggle1 === "Live" ? 22 : 28;
  const waterBarSize = chartToggle2 === "Monthly" ? 14 : chartToggle2 === "Live" ? 22 : 28;

  // Live legend labels
  const co2LastLabel   = chartToggle1 === "Live" ? "Industry benchmark (+22%)" : "Last Year";
  const waterLastLabel = chartToggle2 === "Live" ? "Industry benchmark (+35%)" : "Last Year";
  const co2ThisLabel   = chartToggle1 === "Live" ? "Actual (kg CO₂e)" : "This Year";
  const waterThisLabel = chartToggle2 === "Live" ? "Actual (L)" : "This Year";

  // Chart Y-axis unit label
  const co2Ylabel   = chartToggle1 === "Live" ? "kg CO₂e" : "t CO₂e";
  const waterYlabel = chartToggle2 === "Live" ? "L" : "kL";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            data-testid="select-time-period"
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

      {/* Summary count cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products",    value: dbLoading ? "…" : String(totalProducts ?? 0),  icon: Package,   color: "text-primary",     bg: "bg-primary/10"  },
          { label: "Total Suppliers",   value: dbLoading ? "…" : String(totalSuppliers ?? 0), icon: Building2, color: "text-blue-600",    bg: "bg-blue-50"     },
          { label: "Stages Tracked",    value: dbLoading ? "…" : String(liveStages.length),   icon: RefreshCw, color: "text-purple-600",  bg: "bg-purple-50"   },
          { label: "Total CO₂ (kg)",    value: dbLoading ? "…" : (totalCO2 ?? 0).toFixed(1),  icon: Leaf,      color: "text-green-600",   bg: "bg-green-50"    },
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

      {/* KPI cards — spinner overlaid while loading */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <AreaChart data={sparkCo2}><Area type="monotone" dataKey="v" stroke="#12382B" fill="#12382B" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

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
              <AreaChart data={sparkWater}><Area type="monotone" dataKey="v" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between relative">
          {dbLoading && <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center z-10"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4 text-purple-500" /> Supplier Data Coverage</p>
              <h3 className="text-3xl font-bold mt-2">{displayCompleteness} <span className="text-lg font-normal text-muted-foreground">%</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium max-w-[120px] text-right leading-tight">{compTrend}</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkRecycled}><Area type="monotone" dataKey="v" stroke="#A855F7" fill="#A855F7" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-foreground">
                {chartToggle1 === "Live" ? "CO₂ Impact by Supply Chain Stage" : "CO₂ Reduction Trend"}
              </h3>
              {chartToggle1 === "Live" && <p className="text-xs text-muted-foreground mt-0.5">vs. industry benchmark without sustainability programmes</p>}
            </div>
            <div className="flex bg-muted rounded-md p-1">
              {["Live", "Monthly", "Quarterly"].map(t => (
                <button key={t} onClick={() => setChartToggle1(t)} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle1 === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {dbLoading && chartToggle1 === "Live" ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-7 h-7 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading stage data…</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={co2ChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} unit={` ${co2Ylabel}`} width={60} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(v: number) => [`${v} ${co2Ylabel}`]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="lastYear" name={co2LastLabel} fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={co2BarSize} />
                  <Bar dataKey="thisYear" name={co2ThisLabel} fill="#6AE096" radius={[4, 4, 0, 0]} barSize={co2BarSize} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-foreground">
                {chartToggle2 === "Live" ? "Water Usage by Supply Chain Stage" : "Water Conservation Trend"}
              </h3>
              {chartToggle2 === "Live" && <p className="text-xs text-muted-foreground mt-0.5">vs. industry benchmark without optimisation</p>}
            </div>
            <div className="flex bg-muted rounded-md p-1">
              {["Live", "Monthly", "Quarterly", "Yearly"].map(t => (
                <button key={t} onClick={() => setChartToggle2(t)} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle2 === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {dbLoading && chartToggle2 === "Live" ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-7 h-7 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading stage data…</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} unit={` ${waterYlabel}`} width={60} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(v: number) => [`${v} ${waterYlabel}`]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="lastYear" name={waterLastLabel} fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={waterBarSize} />
                  <Bar dataKey="thisYear" name={waterThisLabel} fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={waterBarSize} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {onViewMetrics && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-primary font-medium">Explore SKU-level impact data in the Lifecycle Traceability view.</p>
          <button onClick={onViewMetrics} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            View Lifecycle Data <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
