import { LayoutDashboard, GitBranch, Building2, Settings as SettingsIcon, Download, AlertTriangle, Leaf, RefreshCw, Scissors, Droplets, Shirt, Package, Share, Copy, QrCode, Edit2, Bell, Grid, ChevronDown, CheckCircle2, User, Camera, ScanLine, ArrowLeft, ShieldCheck, MapPin, ThumbsUp, ThumbsDown, Recycle, FileCheck, ClipboardList, TrendingUp, Clock, FileText, ChevronRight, Target, Globe, Users, Briefcase, Zap, Circle, Info, XCircle, Send, Upload, Link2, MailOpen, UserCheck, FileBadge, X, Filter, Search, ChevronDown as ChevDown, Building, MoreHorizontal, Plus, RefreshCcw, Calculator, Sliders, ArrowRight, FlameKindling } from "lucide-react";
import type { ReactNode } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ReferenceLine, ComposedChart, Cell } from 'recharts';
import { useState } from "react";

export function Dashboard({ onViewMetrics }: { onViewMetrics?: () => void }) {
  const [chartToggle1, setChartToggle1] = useState("Quarterly");
  const [chartToggle2, setChartToggle2] = useState("Quarterly");
  const [timePeriod, setTimePeriod] = useState("year");

  const kpiData = {
    "30d":    { co2: "72.1",  co2Trend: "+4.2%",  water: "98K",   waterTrend: "+3.1%",  recycled: "76.8", recycledTrend: "+1.2%", sparkCo2: [{ v: 55 }, { v: 58 }, { v: 61 }, { v: 59 }, { v: 64 }, { v: 68 }, { v: 72 }], sparkWater: [{ v: 72 }, { v: 76 }, { v: 81 }, { v: 84 }, { v: 90 }, { v: 95 }, { v: 98 }], sparkRecycled: [{ v: 75 }, { v: 75.5 }, { v: 76 }, { v: 76.2 }, { v: 76.4 }, { v: 76.6 }, { v: 76.8 }] },
    "quarter":{ co2: "211.4", co2Trend: "+9.8%",  water: "304K",  waterTrend: "+7.3%",  recycled: "76.8", recycledTrend: "+3.4%", sparkCo2: [{ v: 148 }, { v: 162 }, { v: 180 }, { v: 195 }, { v: 200 }, { v: 206 }, { v: 211 }], sparkWater: [{ v: 220 }, { v: 240 }, { v: 261 }, { v: 272 }, { v: 285 }, { v: 296 }, { v: 304 }], sparkRecycled: [{ v: 73 }, { v: 74 }, { v: 74.5 }, { v: 75 }, { v: 75.8 }, { v: 76.4 }, { v: 76.8 }] },
    "year":   { co2: "847.3", co2Trend: "+12.4%", water: "1.2M",  waterTrend: "+8.7%",  recycled: "76.8", recycledTrend: "+5.2%", sparkCo2: [{ v: 400 }, { v: 450 }, { v: 500 }, { v: 600 }, { v: 650 }, { v: 800 }, { v: 847 }], sparkWater: [{ v: 800 }, { v: 850 }, { v: 900 }, { v: 950 }, { v: 1100 }, { v: 1150 }, { v: 1200 }], sparkRecycled: [{ v: 60 }, { v: 62 }, { v: 65 }, { v: 68 }, { v: 71 }, { v: 74 }, { v: 76.8 }] },
  };
  const kpi = kpiData[timePeriod as keyof typeof kpiData];

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

  const co2ChartData = co2DataSets[chartToggle1 as keyof typeof co2DataSets] ?? co2DataSets.Quarterly;
  const waterChartData = waterDataSets[chartToggle2 as keyof typeof waterDataSets] ?? waterDataSets.Quarterly;
  const barSize = chartToggle1 === "Monthly" ? 14 : 28;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sustainability Metrics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your brand's environmental impact and progress</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" /> CO₂ Saved</p>
              <h3 className="text-3xl font-bold mt-2">{kpi.co2} <span className="text-lg font-normal text-muted-foreground">tons</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium">{kpi.co2Trend}</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.sparkCo2}><Area type="monotone" dataKey="v" stroke="#12382B" fill="#12382B" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /> Water Saved</p>
              <h3 className="text-3xl font-bold mt-2">{kpi.water} <span className="text-lg font-normal text-muted-foreground">liters</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium">{kpi.waterTrend}</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.sparkWater}><Area type="monotone" dataKey="v" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4 text-purple-500" /> Recycled Materials</p>
              <h3 className="text-3xl font-bold mt-2">{kpi.recycled} <span className="text-lg font-normal text-muted-foreground">%</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium">{kpi.recycledTrend}</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.sparkRecycled}><Area type="monotone" dataKey="v" stroke="#A855F7" fill="#A855F7" fillOpacity={0.1} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-foreground">CO₂ Reduction Trend</h3>
            <div className="flex bg-muted rounded-md p-1">
              {["Monthly", "Quarterly"].map(t => (
                <button key={t} onClick={() => setChartToggle1(t)} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle1 === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={co2ChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="lastYear" name="Last Year" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={barSize} />
                <Bar dataKey="thisYear" name="This Year" fill="#6AE096" radius={[4, 4, 0, 0]} barSize={barSize} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-foreground">Water Conservation Trend</h3>
            <div className="flex bg-muted rounded-md p-1">
              {["Monthly", "Quarterly", "Yearly"].map(t => (
                <button key={t} onClick={() => setChartToggle2(t)} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle2 === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="lastYear" name="Last Year" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={chartToggle2 === "Monthly" ? 14 : 28} />
                <Bar dataKey="thisYear" name="This Year" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={chartToggle2 === "Monthly" ? 14 : 28} />
              </BarChart>
            </ResponsiveContainer>
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

export function Traceability({ onViewDPP }: { onViewDPP?: () => void }) {
  const [selectedProduct, setSelectedProduct] = useState("cotton-tee");

  const products = {
    "cotton-tee": {
      label: "Summer Collection 2023 — Essential Cotton Tee",
      copilot: { show: true, message: "Tier 2 processing data (Dyeing & Finishing) conflicts with OEKO-TEX certificate validity dates. Human review required." },
      rows: [
        { stage: "Raw Material Sourcing", subtitle: "Organic Cotton", icon: Leaf, iconColor: "text-white", iconBg: "bg-primary", location: "Maharashtra, India", locSub: "Cooperative Farm", materials: "100% Organic Cotton", matSub: "Non-GMO Seeds", certs: [{ name: "GOTS", color: "bg-green-100 text-green-700 border-green-200" }, { name: "Fair Trade", color: "bg-green-100 text-green-700 border-green-200" }], co2: "-30% vs. conventional", co2Val: "42.3 kg CO₂e", co2Pos: true, water: "-40% vs. conventional", waterVal: "1,800 L", flagged: false },
        { stage: "Processing & Spinning", subtitle: "Yarn Production", icon: RefreshCw, iconColor: "text-white", iconBg: "bg-blue-600", location: "Tamil Nadu, India", locSub: "EcoSpin Facility", materials: "Organic Cotton Yarn", matSub: "30/1 Combed", certs: [{ name: "BlueSign", color: "bg-blue-100 text-blue-700 border-blue-200" }, { name: "ZDHC", color: "bg-teal-100 text-teal-700 border-teal-200" }], co2: "-15% vs. industry avg", co2Val: "18.7 kg CO₂e", co2Pos: true, water: "-25% vs. industry avg", waterVal: "450 L", flagged: false },
        { stage: "Fabric Production", subtitle: "Knitting & Weaving", icon: Scissors, iconColor: "text-white", iconBg: "bg-purple-600", location: "Tiruppur, India", locSub: "GreenWeave Mills", materials: "Jersey Knit Fabric", matSub: "180 GSM", certs: [{ name: "GOTS", color: "bg-green-100 text-green-700 border-green-200" }, { name: "BlueSign", color: "bg-blue-100 text-blue-700 border-blue-200" }], co2: "-20% vs. industry avg", co2Val: "15.2 kg CO₂e", co2Pos: true, water: "-30% vs. industry avg", waterVal: "380 L", flagged: false },
        { stage: "Dyeing & Finishing", subtitle: "Natural Dye Process", icon: Droplets, iconColor: "text-white", iconBg: "bg-amber-500", location: "Tiruppur, India", locSub: "EcoDye Facility", materials: "Natural Indigo Dye", matSub: "Low-Impact Process", certs: [{ name: "ZDHC", color: "bg-teal-100 text-teal-700 border-teal-200" }, { name: "OEKO-TEX", color: "bg-red-100 text-red-700 border-red-200", alert: true }], co2: "-45% vs. chemical dyes", co2Val: "8.3 kg CO₂e", co2Pos: true, water: "-60% vs. chemical dyes", waterVal: "210 L", flagged: true },
        { stage: "Garment Manufacturing", subtitle: "Cutting & Sewing", icon: Shirt, iconColor: "text-white", iconBg: "bg-pink-500", location: "Dhaka, Bangladesh", locSub: "FairStitch Factory", materials: "T-shirt, Dress, Pants", matSub: "Summer Collection", certs: [{ name: "Fair Trade", color: "bg-green-100 text-green-700 border-green-200" }, { name: "SA8000", color: "bg-purple-100 text-purple-700 border-purple-200" }], co2: "-10% vs. industry avg", co2Val: "5.8 kg CO₂e", co2Pos: true, water: "-5% vs. industry avg", waterVal: "120 L", flagged: false },
        { stage: "Quality Control & Packaging", subtitle: "Final Inspection", icon: Package, iconColor: "text-white", iconBg: "bg-slate-500", location: "Dhaka, Bangladesh", locSub: "FairStitch Factory", materials: "Recycled Paper Tags", matSub: "Compostable Packaging", certs: [{ name: "FSC", color: "bg-green-100 text-green-700 border-green-200" }, { name: "Plastic-Free", color: "bg-blue-100 text-blue-700 border-blue-200" }], co2: "-70% vs. plastic packaging", co2Val: "1.2 kg CO₂e", co2Pos: true, water: "-90% vs. plastic packaging", waterVal: "5 L", flagged: false },
      ],
    },
    "wool-sweater": {
      label: "Winter Collection 2023 — Merino Wool Sweater",
      copilot: { show: false, message: "" },
      rows: [
        { stage: "Raw Material Sourcing", subtitle: "Merino Wool", icon: Leaf, iconColor: "text-white", iconBg: "bg-primary", location: "Canterbury, New Zealand", locSub: "PureWool Cooperative", materials: "100% Merino Wool", matSub: "ZQ Certified Fleece", certs: [{ name: "ZQ Merino", color: "bg-green-100 text-green-700 border-green-200" }, { name: "Responsible Wool", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }], co2: "-18% vs. conventional wool", co2Val: "31.6 kg CO₂e", co2Pos: true, water: "-28% vs. industry avg", waterVal: "620 L", flagged: false },
        { stage: "Scouring & Processing", subtitle: "Wool Cleaning", icon: RefreshCw, iconColor: "text-white", iconBg: "bg-blue-600", location: "Biella, Italy", locSub: "AlpinaWool Mills", materials: "Scoured Merino Top", matSub: "18.5 micron", certs: [{ name: "OEKO-TEX 100", color: "bg-green-100 text-green-700 border-green-200" }, { name: "GOTS", color: "bg-green-100 text-green-700 border-green-200" }], co2: "-12% vs. industry avg", co2Val: "22.1 kg CO₂e", co2Pos: true, water: "-20% vs. industry avg", waterVal: "310 L", flagged: false },
        { stage: "Spinning & Knitting", subtitle: "Fine Gauge Knitting", icon: Scissors, iconColor: "text-white", iconBg: "bg-purple-600", location: "Biella, Italy", locSub: "AlpinaWool Mills", materials: "2/28 nm Merino Yarn", matSub: "7-gauge knit", certs: [{ name: "BlueSign", color: "bg-blue-100 text-blue-700 border-blue-200" }, { name: "Woolmark", color: "bg-slate-100 text-slate-700 border-slate-200" }], co2: "-8% vs. industry avg", co2Val: "9.4 kg CO₂e", co2Pos: true, water: "-15% vs. industry avg", waterVal: "180 L", flagged: false },
        { stage: "Dyeing & Finishing", subtitle: "Low-Impact Dyeing", icon: Droplets, iconColor: "text-white", iconBg: "bg-amber-500", location: "Biella, Italy", locSub: "AlpinaWool Mills", materials: "Reactive Dye — Cold Process", matSub: "Closed-loop system", certs: [{ name: "ZDHC", color: "bg-teal-100 text-teal-700 border-teal-200" }, { name: "OEKO-TEX", color: "bg-green-100 text-green-700 border-green-200" }], co2: "-38% vs. conventional dyeing", co2Val: "6.2 kg CO₂e", co2Pos: true, water: "-52% vs. conventional", waterVal: "95 L", flagged: false },
        { stage: "Garment Assembly", subtitle: "Linking & Pressing", icon: Shirt, iconColor: "text-white", iconBg: "bg-pink-500", location: "Porto, Portugal", locSub: "SuturaTex Factory", materials: "Merino Knit Panels", matSub: "Winter Sweater Collection", certs: [{ name: "Fair Trade", color: "bg-green-100 text-green-700 border-green-200" }, { name: "SA8000", color: "bg-purple-100 text-purple-700 border-purple-200" }], co2: "-6% vs. industry avg", co2Val: "4.1 kg CO₂e", co2Pos: true, water: "Industry standard", waterVal: "90 L", flagged: false },
        { stage: "Quality Control & Packaging", subtitle: "Final Inspection", icon: Package, iconColor: "text-white", iconBg: "bg-slate-500", location: "Porto, Portugal", locSub: "SuturaTex Factory", materials: "FSC Cardboard Box", matSub: "Plastic-free garment bag", certs: [{ name: "FSC", color: "bg-green-100 text-green-700 border-green-200" }, { name: "Plastic-Free", color: "bg-blue-100 text-blue-700 border-blue-200" }], co2: "-65% vs. plastic packaging", co2Val: "1.4 kg CO₂e", co2Pos: true, water: "-88% vs. plastic", waterVal: "8 L", flagged: false },
      ],
    },
  };

  const product = products[selectedProduct as keyof typeof products];
  const rows = product.rows;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Journey</h1>
          <p className="text-sm text-muted-foreground mt-1">Track materials sourcing, production stages, and environmental impact</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            data-testid="select-product"
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
            className="bg-white border border-border rounded-md px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-72"
          >
            <option value="cotton-tee">Summer Collection 2023 — Essential Cotton Tee</option>
            <option value="wool-sweater">Winter Collection 2023 — Merino Wool Sweater</option>
          </select>
          {onViewDPP && (
            <button onClick={onViewDPP} data-testid="button-view-dpp" className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0">
              <FileCheck className="w-4 h-4" /> View DPP
            </button>
          )}
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {product.copilot.show && (
        <div className="bg-[#FEF3C7] border border-amber-300 rounded-lg p-4 flex items-start sm:items-center gap-4 shadow-sm">
          <div className="bg-amber-100 p-2 rounded-full shrink-0"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">AI Copilot Anomaly Detected</h4>
            <p className="text-sm text-amber-800 mt-0.5">{product.copilot.message}</p>
          </div>
          <button className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm mt-2 sm:mt-0">Review</button>
        </div>
      )}

      {!product.copilot.show && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800"><span className="font-semibold">All clear.</span> No anomalies detected across the supply chain for this SKU.</p>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border border-card-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-gray-50/50 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Product Lifecycle Stages</h2>
          <span className="text-xs text-muted-foreground">{rows.length} stages tracked</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-6 py-3 font-semibold">Stage</th>
                <th className="px-6 py-3 font-semibold">Location</th>
                <th className="px-6 py-3 font-semibold">Materials</th>
                <th className="px-6 py-3 font-semibold">Certifications</th>
                <th className="px-6 py-3 font-semibold">CO₂ Impact</th>
                <th className="px-6 py-3 font-semibold">Water Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {rows.map((row, i) => (
                <tr key={i} className={`hover:bg-muted/50 transition-colors ${row.flagged ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`${row.iconBg} w-8 h-8 rounded-md flex items-center justify-center shrink-0 shadow-sm`}>
                        <row.icon className={`w-4 h-4 ${row.iconColor}`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{row.stage}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.subtitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-foreground">{row.location}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{row.locSub}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-foreground">{row.materials}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{row.matSub}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      {row.certs.map((cert, j) => (
                        <span key={j} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cert.color}`}>
                          {(cert as { alert?: boolean }).alert && <AlertTriangle className="w-3 h-3" />}
                          {cert.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-muted-foreground">{row.co2}</div>
                    <div className={`font-medium mt-0.5 ${row.co2Pos ? 'text-primary' : 'text-foreground'}`}>{row.co2Val}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-muted-foreground">{row.water}</div>
                    <div className="font-medium mt-0.5 text-foreground">{row.waterVal}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DigitalProductPassport({ onBack }: { onBack: () => void }) {
  const [activeStage, setActiveStage] = useState(0);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

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
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Essential Cotton Tee</h1>
          <p className="text-sm text-white/60 mb-1">By EcoThread</p>
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
              {stages.map((s, i) => (
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
                  {i < stages.length - 1 && (
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
                    {(() => { const Icon = stages[activeStage].icon; return <Icon className="w-5 h-5 text-primary" />; })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{stages[activeStage].title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" /> {stages[activeStage].location}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{stages[activeStage].desc}</p>
                <div className="mt-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${stages[activeStage].certColor}`}>
                    <ShieldCheck className="w-3 h-3" /> {stages[activeStage].cert}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 content-start">
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Supplier</p>
                  <p className="text-sm font-medium text-foreground">{stages[activeStage].supplier}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Location</p>
                  <p className="text-sm font-medium text-foreground">{stages[activeStage].location}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">CO₂ Impact</p>
                  <p className="text-sm font-semibold text-green-700">{stages[activeStage].co2}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Water Used</p>
                  <p className="text-sm font-semibold text-blue-700">{stages[activeStage].water}</p>
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
              <span className="text-xs text-muted-foreground">{activeStage + 1} of {stages.length}</span>
              <button
                onClick={() => setActiveStage(Math.min(stages.length - 1, activeStage + 1))}
                disabled={activeStage === stages.length - 1}
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

export function BrandProfile({ onViewDashboard }: { onViewDashboard?: () => void }) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brand Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Your public-facing sustainability profile</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors shadow-sm bg-white">
            Preview
          </button>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            <Share className="w-4 h-4" /> Share Profile
          </button>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <div>
            <h4 className="text-sm font-medium text-primary">Your brand profile is public</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Last updated: June 15, 2023</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-border rounded-md pl-3 pr-1 py-1 shadow-sm w-full sm:w-auto">
          <span className="text-xs text-muted-foreground truncate">refashioned.com/brands/ecothread</span>
          <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy URL">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors border-l border-border ml-1 pl-2" title="Show QR">
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
          <button className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-foreground mb-4">Brand Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Company</p>
              <p className="text-sm font-medium text-foreground">EcoThread</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Tagline</p>
              <p className="text-sm text-foreground">Sustainable fashion brand focused on eco-friendly materials and ethical production practices</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Founded</p>
                <p className="text-sm text-foreground">2018</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Headquarters</p>
                <p className="text-sm text-foreground">Stockholm, Sweden</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Website</p>
                <a href="#" className="text-sm text-blue-600 hover:underline">ecothread.com</a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Industry</p>
                <p className="text-sm text-foreground">Sustainable Fashion</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
          <button className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-foreground mb-6">Sustainability Snapshot</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-md">
                  <Leaf className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">CO₂ Reduction</span>
              </div>
              <span className="text-lg font-semibold text-primary">42%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-md">
                  <Droplets className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Water Conservation</span>
              </div>
              <span className="text-lg font-semibold text-blue-600">35%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-2 rounded-md">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Recycled Materials</span>
              </div>
              <span className="text-lg font-semibold text-purple-600">76.8%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-md">
                  <User className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Fair Labor</span>
              </div>
              <span className="text-lg font-semibold text-amber-600">100%</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <button onClick={onViewDashboard} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View detailed metrics <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
        <button className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-foreground mb-6">Sustainability Journey</h3>
        
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {[
            { year: "2018", title: "Founded with Sustainability Mission", desc: "Launched with a commitment to sustainable materials and ethical production practices." },
            { year: "2020", title: "100% Organic Cotton", desc: "Transitioned entire cotton supply chain to GOTS certified organic." },
            { year: "2021", title: "Launched Take-Back Program", desc: "Introduced circularity initiative for post-consumer garments." },
            { year: "2023", title: "Joined RE:Fashioned", desc: "Committed to radical transparency and data verification." }
          ].map((item, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <span className="text-[10px] font-bold">{item.year.slice(2)}</span>
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-border shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                  <span className="text-xs font-medium text-primary px-2 py-0.5 bg-primary/10 rounded-full">{item.year}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState("account");

  const tabs = [
    { id: "account", label: "Account Information" },
    { id: "notifications", label: "Notifications" },
    { id: "preferences", label: "Preferences" },
    { id: "api", label: "API Access" },
    { id: "security", label: "Security" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize your account information and platform features</p>
        </div>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
          Save Changes
        </button>
      </div>

      <div className="border-b border-border overflow-x-auto hide-scrollbar">
        <div className="flex gap-6 min-w-max px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "account" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border text-center flex flex-col items-center">
              <div className="relative mb-4 group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="font-semibold text-foreground">Emma Johnson</h3>
              <p className="text-sm text-muted-foreground mb-4">Sustainability Manager</p>
              
              <div className="flex gap-2 w-full">
                <button className="flex-1 bg-white border border-border hover:bg-muted text-foreground text-xs font-medium py-2 rounded transition-colors shadow-sm">
                  Upload New
                </button>
                <button className="px-3 bg-white border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-muted-foreground text-xs font-medium py-2 rounded transition-colors shadow-sm">
                  Remove
                </button>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Account Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-sm text-muted-foreground">Account Type</span>
                  <span className="text-sm font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Enterprise Plan</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Subscription</span>
                    <a href="#" className="text-sm text-blue-600 hover:underline">Manage</a>
                  </div>
                  <span className="text-sm font-medium text-foreground">Renews on Nov 15, 2023</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border">
              <h3 className="font-semibold text-foreground mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">First Name</label>
                  <input type="text" defaultValue="Emma" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Last Name</label>
                  <input type="text" defaultValue="Johnson" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <input type="email" defaultValue="emma.johnson@fashionbrand.com" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Phone Number</label>
                  <input type="tel" defaultValue="+1(555) 123-4567" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Job Title</label>
                  <input type="text" defaultValue="Sustainability Manager" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Department</label>
                  <select className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>Sustainability</option>
                    <option>Sourcing & Procurement</option>
                    <option>Compliance</option>
                    <option>Operations</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border">
              <h3 className="font-semibold text-foreground mb-4">Company Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Company Name</label>
                    <input type="text" defaultValue="EcoStyle Fashion" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Industry</label>
                    <select className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option>Apparel & Fashion</option>
                      <option>Textile Manufacturing</option>
                      <option>Retail</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Company Address</label>
                  <input type="text" defaultValue="123 Fashion Avenue, Suite 500" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-2" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="City" defaultValue="New York" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 col-span-1" />
                    <input type="text" placeholder="State" defaultValue="NY" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 col-span-1" />
                    <input type="text" placeholder="Zip" defaultValue="10001" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 col-span-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab !== "account" && (
        <div className="bg-card rounded-lg p-12 shadow-sm border border-card-border text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <SettingsIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">Settings section coming soon</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">This section is currently under development. Please check back later for updates to these preferences.</p>
        </div>
      )}
    </div>
  );
}

function ComplianceRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#6AE096" : score >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <svg width="136" height="136" viewBox="0 0 136 136" className="rotate-[-90deg]">
      <circle cx="68" cy="68" r={r} fill="none" stroke="#E2E8F0" strokeWidth="12" />
      <circle cx="68" cy="68" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
    </svg>
  );
}

export function CSRDReport() {
  const [expandedSection, setExpandedSection] = useState<string | null>("e1");
  const [reportYear, setReportYear] = useState("2023");

  const yearData = {
    "2023": {
      overallScore: 74,
      scopeData: [
        { scope: "Scope 1", tonnes: 12.4, fill: "#12382B" },
        { scope: "Scope 2", tonnes: 28.7, fill: "#6AE096" },
        { scope: "Scope 3", tonnes: 806.2, fill: "#94A3B8" },
      ],
      esrsScores: { e1: 82, e2: 68, e3: 79, s1: 91, s2: 63, g1: 88 },
      keyActions: [
        { priority: "high" as const, action: "Renew OEKO-TEX certificate for Dyeing & Finishing stage", deadline: "Jan 31, 2024", owner: "Supply Chain" },
        { priority: "high" as const, action: "Complete Tier 3 supplier REACH substance declarations", deadline: "Mar 31, 2024", owner: "Procurement" },
        { priority: "medium" as const, action: "Submit SBTi target validation package", deadline: "Apr 30, 2024", owner: "Sustainability" },
        { priority: "medium" as const, action: "Expand Tier 2 audit coverage from 60% to 90%", deadline: "Dec 31, 2024", owner: "Supply Chain" },
        { priority: "medium" as const, action: "Finalise living wage certification process", deadline: "Mar 31, 2024", owner: "HR & People" },
        { priority: "low" as const, action: "Complete annual GDPR compliance review", deadline: "Feb 28, 2024", owner: "Legal" },
      ],
    },
    "2022": {
      overallScore: 61,
      scopeData: [
        { scope: "Scope 1", tonnes: 15.8, fill: "#12382B" },
        { scope: "Scope 2", tonnes: 34.2, fill: "#6AE096" },
        { scope: "Scope 3", tonnes: 968.5, fill: "#94A3B8" },
      ],
      esrsScores: { e1: 66, e2: 54, e3: 62, s1: 80, s2: 48, g1: 78 },
      keyActions: [
        { priority: "high" as const, action: "Establish Scope 3 supplier emissions data collection process", deadline: "Jun 30, 2023", owner: "Sustainability" },
        { priority: "high" as const, action: "Achieve full ZDHC compliance at Tier 1 dyeing facilities", deadline: "Mar 31, 2023", owner: "Supply Chain" },
        { priority: "high" as const, action: "Implement SA8000 audit programme for all Tier 1 factories", deadline: "Sep 30, 2023", owner: "Supply Chain" },
        { priority: "medium" as const, action: "Formalise climate transition plan for board approval", deadline: "Dec 31, 2023", owner: "Executive" },
        { priority: "medium" as const, action: "Deploy supplier portal for data collection and cert uploads", deadline: "Oct 31, 2023", owner: "Technology" },
        { priority: "low" as const, action: "Publish first Tax Transparency Report", deadline: "Jun 30, 2023", owner: "Legal" },
      ],
    },
  };

  const yd = yearData[reportYear as keyof typeof yearData];
  const overallScore = yd.overallScore;
  const scopeData = yd.scopeData;

  const esrsDisclosures = [
    {
      id: "e1",
      code: "ESRS E1",
      title: "Climate Change",
      icon: Leaf,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      score: 82,
      status: "on-track" as const,
      dataPoints: [
        { label: "Scope 1 Emissions (Direct)", value: "12.4 t CO₂e", status: "complete" as const },
        { label: "Scope 2 Emissions (Energy)", value: "28.7 t CO₂e", status: "complete" as const },
        { label: "Scope 3 Emissions (Supply Chain)", value: "806.2 t CO₂e", status: "complete" as const },
        { label: "Climate Transition Plan", value: "Net Zero by 2040", status: "complete" as const },
        { label: "Science-Based Target (SBTi)", value: "Validation pending", status: "pending" as const },
        { label: "Physical Risk Assessment", value: "Not started", status: "missing" as const },
      ],
      narrative: "EcoThread has mapped GHG emissions across all three scopes for the 2023 reporting period. Scope 3 represents 95.1% of total emissions, primarily from raw material sourcing and processing in India. A climate transition plan targeting Net Zero by 2040 has been approved by the board. SBTi validation is expected in Q2 2024.",
    },
    {
      id: "e2",
      code: "ESRS E2",
      title: "Pollution",
      icon: Droplets,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      score: 68,
      status: "in-progress" as const,
      dataPoints: [
        { label: "ZDHC MRSL Compliance", value: "Tier 1–2 verified", status: "complete" as const },
        { label: "Chemical Inventory (REACH)", value: "Partial — Tier 3 gap", status: "pending" as const },
        { label: "Wastewater Treatment Records", value: "EcoDye Facility", status: "complete" as const },
        { label: "OEKO-TEX Certificate", value: "Under review — flagged", status: "missing" as const },
        { label: "Pollution Incident Register", value: "No incidents 2023", status: "complete" as const },
      ],
      narrative: "Chemical management is verified across Tier 1 and Tier 2 suppliers. A gap exists at Tier 3 level for REACH substance declarations. The OEKO-TEX certificate for the Dyeing & Finishing stage requires immediate renewal; this is the primary compliance risk for this reporting period.",
    },
    {
      id: "e3",
      code: "ESRS E3",
      title: "Water & Marine Resources",
      icon: Droplets,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-200",
      score: 79,
      status: "on-track" as const,
      dataPoints: [
        { label: "Total Water Withdrawal", value: "2,965 L / unit", status: "complete" as const },
        { label: "Water Recycling Rate", value: "43% at processing", status: "complete" as const },
        { label: "Water Stress Area Assessment", value: "Maharashtra (high risk)", status: "complete" as const },
        { label: "Reduction Target (2025)", value: "-20% vs 2021 baseline", status: "pending" as const },
        { label: "Marine Pollution Disclosure", value: "Not applicable", status: "complete" as const },
      ],
      narrative: "Water consumption has been fully measured at SKU level for the Essential Cotton Tee — 2,965 L, representing a 91% reduction vs conventional cotton. Raw material sourcing in Maharashtra is flagged as a water-stressed region under WRI Aqueduct. A formal reduction target is being ratified for the 2025 reporting cycle.",
    },
    {
      id: "s1",
      code: "ESRS S1",
      title: "Own Workforce",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      score: 91,
      status: "on-track" as const,
      dataPoints: [
        { label: "Employee Count", value: "148 FTE", status: "complete" as const },
        { label: "Gender Pay Gap Disclosure", value: "3.2% gap disclosed", status: "complete" as const },
        { label: "Health & Safety Incidents", value: "0 LTIR in 2023", status: "complete" as const },
        { label: "Training Hours / Employee", value: "22 hrs avg", status: "complete" as const },
        { label: "Works Council Engagement", value: "Quarterly cadence", status: "complete" as const },
        { label: "Living Wage Certification", value: "In progress — Q1 2024", status: "pending" as const },
      ],
      narrative: "Own workforce disclosures are substantially complete. EcoThread employs 148 FTE across Stockholm HQ and partner offices. Zero lost-time injury rate was achieved in 2023. A living wage certification process was initiated in October 2023 and is expected to complete in Q1 2024.",
    },
    {
      id: "s2",
      code: "ESRS S2",
      title: "Workers in Value Chain",
      icon: Globe,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      score: 63,
      status: "in-progress" as const,
      dataPoints: [
        { label: "Tier 1 Supplier Audits", value: "100% audited (SA8000)", status: "complete" as const },
        { label: "Tier 2 Supplier Audits", value: "60% audited", status: "pending" as const },
        { label: "Tier 3 Supplier Audits", value: "12% coverage", status: "missing" as const },
        { label: "Supplier Code of Conduct", value: "Signed by all Tier 1", status: "complete" as const },
        { label: "Living Wage — Supply Chain", value: "Gap analysis in progress", status: "pending" as const },
        { label: "Grievance Mechanism", value: "Hotline operational", status: "complete" as const },
      ],
      narrative: "Tier 1 supplier compliance is strong — all facilities are SA8000 certified and have signed the EcoThread Supplier Code of Conduct. Tier 2 and Tier 3 coverage remains the key gap. A supplier engagement programme targeting 90% Tier 2 audit coverage by end of 2024 is underway.",
    },
    {
      id: "g1",
      code: "ESRS G1",
      title: "Business Conduct",
      icon: Briefcase,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      score: 88,
      status: "on-track" as const,
      dataPoints: [
        { label: "Anti-Corruption Policy", value: "Board-approved 2022", status: "complete" as const },
        { label: "Whistleblower Channel", value: "EthicsPoint — active", status: "complete" as const },
        { label: "Lobbying Disclosure", value: "No lobbying activity", status: "complete" as const },
        { label: "Tax Transparency Report", value: "Published June 2023", status: "complete" as const },
        { label: "Conflict Minerals (3TG)", value: "Not applicable", status: "complete" as const },
        { label: "Data Privacy (GDPR)", value: "Annual review pending", status: "pending" as const },
      ],
      narrative: "Governance disclosures are well-established. EcoThread operates an independent whistleblower channel and publishes an annual tax transparency report. GDPR compliance review is scheduled for Q1 2024 to align with the annual CSRD reporting cycle.",
    },
  ];

  const esrsDisclosuresWithScores = esrsDisclosures.map(d => {
    const score = yd.esrsScores[d.id as keyof typeof yd.esrsScores] ?? d.score;
    const status = score >= 80 ? "on-track" as const : score >= 55 ? "in-progress" as const : "at-risk" as const;
    return { ...d, score, status };
  });

  const keyActions = yd.keyActions;

  const statusConfig = {
    "on-track": { label: "On Track", color: "text-green-700", bg: "bg-green-100", border: "border-green-200", dot: "bg-green-500" },
    "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-200", dot: "bg-amber-500" },
    "at-risk": { label: "At Risk", color: "text-red-700", bg: "bg-red-100", border: "border-red-200", dot: "bg-red-500" },
  };

  const dataPointConfig = {
    complete: { icon: CheckCircle2, color: "text-green-500" },
    pending: { icon: Clock, color: "text-amber-500" },
    missing: { icon: XCircle, color: "text-red-400" },
  };

  const materialityTopics = [
    { label: "GHG Emissions", impact: 88, financial: 72, size: "lg" },
    { label: "Water Use", impact: 82, financial: 55, size: "md" },
    { label: "Labor Rights", impact: 79, financial: 60, size: "md" },
    { label: "Chemicals", impact: 65, financial: 80, size: "md" },
    { label: "Packaging", impact: 55, financial: 42, size: "sm" },
    { label: "Biodiversity", impact: 48, financial: 30, size: "sm" },
    { label: "Data Privacy", impact: 30, financial: 65, size: "sm" },
    { label: "Tax", impact: 25, financial: 50, size: "sm" },
  ];

  const sizeClass = { lg: "w-5 h-5", md: "w-3.5 h-3.5", sm: "w-2.5 h-2.5" };


  const priorityConfig = {
    high: { label: "High", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
    medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
    low: { label: "Low", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CSRD Compliance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">EU Corporate Sustainability Reporting Directive — ESRS disclosure overview</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            data-testid="select-report-year"
            value={reportYear}
            onChange={e => setReportYear(e.target.value)}
            className="bg-white border border-border rounded-md px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option>2023</option>
            <option>2022</option>
          </select>
          <button
            data-testid="button-generate-report"
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Compliance overview card */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">

          {/* Score ring */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              <ComplianceRing score={overallScore} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{overallScore}%</span>
                <span className="text-xs text-muted-foreground">Complete</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground mt-2">Overall Readiness</p>
            <span className="mt-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">In Progress</span>
          </div>

          {/* ESRS mini-scores */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">ESRS Disclosure Progress</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> On track</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> In progress</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> At risk</span>
              </div>
            </div>
            <div className="space-y-3">
              {esrsDisclosuresWithScores.map(d => {
                const sc = statusConfig[d.status];
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-muted-foreground w-16 shrink-0">{d.code}</span>
                    <span className="text-xs text-foreground w-44 shrink-0 truncate">{d.title}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${d.score}%`,
                          backgroundColor: d.score >= 80 ? "#6AE096" : d.score >= 65 ? "#F59E0B" : "#EF4444"
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-8 text-right">{d.score}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.color} ${sc.border} hidden sm:inline-flex`}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0 lg:w-48">
            <div className="bg-muted/40 rounded-lg p-3 border border-border text-center">
              <p className="text-xl font-bold text-foreground">847.3</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tonnes CO₂e</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border border-border text-center">
              <p className="text-xl font-bold text-foreground">1.2M</p>
              <p className="text-xs text-muted-foreground mt-0.5">Litres water</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border border-border text-center">
              <p className="text-xl font-bold text-foreground">100%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tier 1 audited</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border border-border text-center">
              <p className="text-xl font-bold text-foreground">4/6</p>
              <p className="text-xs text-muted-foreground mt-0.5">ESRS on track</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scope emissions + Double materiality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Scope 1–2–3 */}
        <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">GHG Emissions by Scope</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Tonnes CO₂e — {reportYear} reporting period</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20">847.3 t total</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scopeData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="scope" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                formatter={(v: number) => [`${v} t CO₂e`, ""]}
              />
              <Bar dataKey="tonnes" radius={[4, 4, 0, 0]}>
                {scopeData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {[
              { label: "Scope 1 — Direct emissions (fuel, fleet)", val: "12.4 t", pct: "1.5%", color: "bg-primary" },
              { label: "Scope 2 — Purchased energy", val: "28.7 t", pct: "3.4%", color: "bg-accent" },
              { label: "Scope 3 — Value chain (upstream + downstream)", val: "806.2 t", pct: "95.1%", color: "bg-slate-300" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${s.color}`} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{s.label}</span>
                <span className="text-xs font-medium text-foreground">{s.val}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">{s.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Double materiality matrix */}
        <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Double Materiality Matrix</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Impact materiality vs. financial materiality — ESRS 1 methodology</p>
          </div>
          <div className="relative border border-border rounded-lg overflow-hidden bg-gradient-to-tr from-muted/20 to-transparent" style={{ height: 220 }}>
            {/* Quadrant labels */}
            <div className="absolute top-2 left-2 text-[10px] text-muted-foreground/60 font-medium">Low / Low</div>
            <div className="absolute top-2 right-2 text-[10px] text-muted-foreground/60 font-medium text-right">Low Impact / High Financial</div>
            <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground/60 font-medium">High Impact / Low Financial</div>
            <div className="absolute bottom-2 right-2 text-[10px] text-primary/70 font-semibold text-right">Material — Both</div>
            {/* Dividers */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
            {/* Dots */}
            {materialityTopics.map((t, i) => (
              <div
                key={i}
                data-testid={`materiality-dot-${i}`}
                className="absolute group"
                style={{
                  left: `${(t.financial / 100) * 88 + 6}%`,
                  bottom: `${(t.impact / 100) * 82 + 6}%`,
                  transform: "translate(-50%, 50%)",
                }}
              >
                <div className={`${sizeClass[t.size as keyof typeof sizeClass]} rounded-full bg-primary opacity-80 group-hover:opacity-100 group-hover:scale-125 transition-all cursor-default shadow-sm`} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-foreground text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {t.label}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-primary/80 inline-block" /> High significance</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary/80 inline-block" /> Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/80 inline-block" /> Low</span>
          </div>
        </div>
      </div>

      {/* ESRS disclosure sections — expandable */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">ESRS Disclosure Sections</h3>
          <span className="text-xs text-muted-foreground">Click a section to expand</span>
        </div>
        <div className="divide-y divide-border">
          {esrsDisclosures.map(d => {
            const sc = statusConfig[d.status];
            const isOpen = expandedSection === d.id;
            return (
              <div key={d.id} data-testid={`section-${d.id}`}>
                <button
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpandedSection(isOpen ? null : d.id)}
                >
                  <div className={`w-9 h-9 rounded-lg ${d.bgColor} border ${d.borderColor} flex items-center justify-center shrink-0`}>
                    <d.icon className={`w-4 h-4 ${d.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-muted-foreground">{d.code}</span>
                      <span className="text-sm font-medium text-foreground">{d.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.color} ${sc.border} hidden sm:inline-flex`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} inline-block mr-1.5`} />{sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${d.score}%`, backgroundColor: d.score >= 80 ? "#6AE096" : d.score >= 65 ? "#F59E0B" : "#EF4444" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{d.score}% complete</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 animate-in fade-in duration-200">
                    <div className="ml-13 space-y-5" style={{ marginLeft: "3.25rem" }}>
                      {/* Narrative */}
                      <div className="bg-muted/30 rounded-lg p-4 border border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" /> Disclosure narrative
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{d.narrative}</p>
                      </div>
                      {/* Data points */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {d.dataPoints.map((dp, j) => {
                          const dpc = dataPointConfig[dp.status];
                          return (
                            <div key={j} className={`flex items-start gap-3 p-3 rounded-lg border ${dp.status === "missing" ? "bg-red-50/50 border-red-200" : dp.status === "pending" ? "bg-amber-50/50 border-amber-200" : "bg-white border-border"}`}>
                              <dpc.icon className={`w-4 h-4 ${dpc.color} shrink-0 mt-0.5`} />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground truncate">{dp.label}</p>
                                <p className="text-sm font-medium text-foreground mt-0.5">{dp.value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key actions */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-gray-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Compliance Action Plan</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Outstanding items required for full CSRD disclosure</p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium">
            {keyActions.length} actions remaining
          </span>
        </div>
        <div className="divide-y divide-border">
          {keyActions.map((a, i) => {
            const pc = priorityConfig[a.priority as keyof typeof priorityConfig];
            return (
              <div key={i} data-testid={`action-${i}`} className="px-6 py-4 flex items-start gap-4 hover:bg-muted/20 transition-colors">
                <div className={`w-2 h-2 rounded-full ${pc.dot} mt-2 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.action}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pc.bg} ${pc.color} ${pc.border}`}>{pc.label} priority</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Due {a.deadline}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> {a.owner}</span>
                  </div>
                </div>
                <button className="text-xs text-primary hover:text-primary/80 font-medium shrink-0 transition-colors mt-0.5">Assign</button>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 bg-primary/5 border-t border-primary/15 flex items-center gap-3">
          <Zap className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-primary font-medium">Resolving the 2 high-priority actions will increase your compliance score to an estimated 87%.</p>
        </div>
      </div>

    </div>
  );
}

export function CarbonCalculator() {
  const [cottonVol, setCottonVol] = useState(12000);
  const [woolVol, setWoolVol] = useState(4500);
  const [cottonMat, setCottonMat] = useState<"organic" | "conventional">("organic");
  const [woolMat, setWoolMat] = useState<"certified" | "standard">("certified");
  const [logistics, setLogistics] = useState<"sea" | "mixed" | "air">("sea");
  const [dyeProcess, setDyeProcess] = useState<"natural" | "synthetic">("natural");
  const [renewableEnergy, setRenewableEnergy] = useState(true);

  const ef = {
    cotton: { organic: 73.5, conventional: 90.3 },
    wool:   { certified: 60.2, standard: 78.4 },
    logistics: { sea: 1.0, mixed: 2.1, air: 4.2 },
    dye:    { natural: 0.85, synthetic: 1.18 },
    energy: { renewable: 41.1, grid: 78.4 },
  };

  const cottonScope3 = (cottonVol * ef.cotton[cottonMat] * ef.logistics[logistics] * ef.dye[dyeProcess]) / 1000;
  const woolScope3   = (woolVol   * ef.wool[woolMat]    * ef.logistics[logistics]) / 1000;
  const scope12      = renewableEnergy ? ef.energy.renewable : ef.energy.grid;
  const totalScope3  = cottonScope3 + woolScope3;
  const total        = totalScope3 + scope12;

  const baseline2023 = 847.3;
  const target2025   = 620;
  const target2030   = 380;
  const reduction    = Math.round(((baseline2023 - total) / baseline2023) * 100);
  const vsTarget     = total - target2025;
  const onTrack      = total <= target2025;

  const trajectoryData = [
    { year: "2022", actual: 1018, target: null,       projected: null },
    { year: "2023", actual: 847,  target: 847,        projected: null },
    { year: "2024", actual: null, target: 720,        projected: Math.round(total * 1.06) },
    { year: "2025", actual: null, target: target2025, projected: Math.round(total) },
    { year: "2026", actual: null, target: 560,        projected: Math.round(total * 0.91) },
    { year: "2028", actual: null, target: 460,        projected: Math.round(total * 0.78) },
    { year: "2030", actual: null, target: target2030, projected: Math.round(total * 0.62) },
  ];

  const scopeBarData = [
    { name: "Scope 1\n(Direct)", value: parseFloat((scope12 * 0.30).toFixed(1)), fill: "#12382B" },
    { name: "Scope 2\n(Energy)", value: parseFloat((scope12 * 0.70).toFixed(1)), fill: "#6AE096" },
    { name: "Scope 3\nCotton Tee", value: parseFloat(cottonScope3.toFixed(1)), fill: "#3B82F6" },
    { name: "Scope 3\nWool Sweater", value: parseFloat(woolScope3.toFixed(1)), fill: "#8B5CF6" },
  ];

  const skuData = [
    { name: "Essential Cotton Tee", vol: cottonVol, perUnit: parseFloat((ef.cotton[cottonMat] * ef.logistics[logistics] * ef.dye[dyeProcess]).toFixed(1)), total: parseFloat(cottonScope3.toFixed(1)), pct: Math.round(cottonScope3 / totalScope3 * 100), color: "bg-blue-500" },
    { name: "Merino Wool Sweater",  vol: woolVol,   perUnit: parseFloat((ef.wool[woolMat]    * ef.logistics[logistics]).toFixed(1)),  total: parseFloat(woolScope3.toFixed(1)),   pct: Math.round(woolScope3   / totalScope3 * 100), color: "bg-purple-500" },
  ];

  function Toggle({ value, options, onChange }: { value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
    return (
      <div className="flex bg-muted rounded-lg p-1 gap-1">
        {options.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${value === o.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carbon Footprint Calculator</h1>
          <p className="text-sm text-muted-foreground mt-1">Model production scenarios and measure progress against your SBTi net-zero trajectory</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Footprint", value: `${total.toFixed(1)}t`, sub: "CO₂e this scenario", icon: FlameKindling, color: "text-primary", bg: "bg-primary/10" },
          { label: "vs 2025 SBTi Target", value: `${onTrack ? "−" : "+"}${Math.abs(vsTarget).toFixed(1)}t`, sub: onTrack ? "Under target — on track" : "Over target — action needed", icon: Target, color: onTrack ? "text-green-600" : "text-red-500", bg: onTrack ? "bg-green-50" : "bg-red-50" },
          { label: "vs 2023 Baseline", value: `−${reduction}%`, sub: `Saved ${(baseline2023 - total).toFixed(1)}t CO₂e`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Scope 3 Share", value: `${Math.round(totalScope3 / total * 100)}%`, sub: `${totalScope3.toFixed(1)}t from supply chain`, icon: Globe, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((k, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-card-border flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground truncate">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{k.label}</p>
              <p className={`text-[10px] mt-0.5 font-medium ${k.color}`}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status banner */}
      <div className={`rounded-lg p-4 flex items-center gap-3 border ${onTrack ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        {onTrack
          ? <><CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /><p className="text-sm text-green-800"><span className="font-semibold">On track for SBTi 2025 target.</span> Your current scenario produces {total.toFixed(1)}t CO₂e — {Math.abs(vsTarget).toFixed(1)}t below the {target2025}t target.</p></>
          : <><AlertTriangle className="w-5 h-5 text-red-500 shrink-0" /><p className="text-sm text-red-800"><span className="font-semibold">Over the 2025 SBTi target by {vsTarget.toFixed(1)}t.</span> Try switching to sea freight, reducing production volumes, or using organic materials.</p></>
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* LEFT: Input controls */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-card rounded-xl shadow-sm border border-card-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <Sliders className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Scenario Inputs</h3>
            </div>
            <div className="space-y-6">

              {/* Production volumes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Production Volumes</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-sm font-medium text-foreground">Essential Cotton Tee</label>
                      <span className="text-sm font-semibold text-primary">{cottonVol.toLocaleString()} units</span>
                    </div>
                    <input type="range" min={1000} max={50000} step={500} value={cottonVol} onChange={e => setCottonVol(+e.target.value)}
                      className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1k</span><span>50k units</span></div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-sm font-medium text-foreground">Merino Wool Sweater</label>
                      <span className="text-sm font-semibold text-purple-600">{woolVol.toLocaleString()} units</span>
                    </div>
                    <input type="range" min={500} max={20000} step={500} value={woolVol} onChange={e => setWoolVol(+e.target.value)}
                      className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-purple-500" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>500</span><span>20k units</span></div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Material choices */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Material Sourcing</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Cotton Tee material</p>
                    <Toggle value={cottonMat} onChange={v => setCottonMat(v as typeof cottonMat)}
                      options={[{ id: "organic", label: "Organic" }, { id: "conventional", label: "Conventional" }]} />
                    <p className="text-[10px] text-muted-foreground mt-1">{cottonMat === "organic" ? "73.5 kg CO₂e/unit — current" : "90.3 kg CO₂e/unit — +23% vs organic"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Wool Sweater grade</p>
                    <Toggle value={woolMat} onChange={v => setWoolMat(v as typeof woolMat)}
                      options={[{ id: "certified", label: "ZQ Certified" }, { id: "standard", label: "Standard" }]} />
                    <p className="text-[10px] text-muted-foreground mt-1">{woolMat === "certified" ? "60.2 kg CO₂e/unit — current" : "78.4 kg CO₂e/unit — +30% vs certified"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Operations */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operations</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Logistics mode</p>
                    <Toggle value={logistics} onChange={v => setLogistics(v as typeof logistics)}
                      options={[{ id: "sea", label: "Sea" }, { id: "mixed", label: "Mixed" }, { id: "air", label: "Air" }]} />
                    <p className="text-[10px] text-muted-foreground mt-1">{logistics === "sea" ? "Baseline — current default" : logistics === "mixed" ? "×2.1 emissions vs sea freight" : "×4.2 emissions vs sea freight"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Dye process</p>
                    <Toggle value={dyeProcess} onChange={v => setDyeProcess(v as typeof dyeProcess)}
                      options={[{ id: "natural", label: "Natural" }, { id: "synthetic", label: "Synthetic" }]} />
                    <p className="text-[10px] text-muted-foreground mt-1">{dyeProcess === "natural" ? "−15% vs synthetic — current" : "+39% vs natural dye process"}</p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Renewable energy</p>
                      <p className="text-[10px] text-muted-foreground">{renewableEnergy ? "41.1t Scope 1+2 — current" : "78.4t Scope 1+2 — grid average"}</p>
                    </div>
                    <button onClick={() => setRenewableEnergy(v => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${renewableEnergy ? "bg-primary" : "bg-slate-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${renewableEnergy ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SKU breakdown table */}
          <div className="bg-card rounded-xl shadow-sm border border-card-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Per-SKU Breakdown</h3>
            <div className="space-y-4">
              {skuData.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{s.total}t CO₂e</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{s.vol.toLocaleString()} units × {s.perUnit} kg CO₂e/unit</span>
                    <span>{s.pct}% of Scope 3</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Charts */}
        <div className="xl:col-span-3 space-y-5">

          {/* Scope breakdown bar chart */}
          <div className="bg-card rounded-xl shadow-sm border border-card-border p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-foreground">Emissions by Scope</h3>
              <span className="text-xs text-muted-foreground">tonnes CO₂e</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Adjust inputs on the left to see real-time impact</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scopeBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(v: number) => [`${v}t CO₂e`]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                    {scopeBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Manual legend */}
            <div className="flex flex-wrap gap-4 mt-2">
              {[
                { label: "Scope 1 (Direct)", color: "#12382B" },
                { label: "Scope 2 (Energy)", color: "#6AE096" },
                { label: "Scope 3 — Cotton", color: "#3B82F6" },
                { label: "Scope 3 — Wool", color: "#8B5CF6" },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-[11px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trajectory chart */}
          <div className="bg-card rounded-xl shadow-sm border border-card-border p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-foreground">Net-Zero Trajectory</h3>
              <span className="text-xs text-muted-foreground">vs SBTi target path</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Projected emissions based on current scenario extrapolated with 9% annual reduction</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trajectoryData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 1100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(v: number, name: string) => [`${v}t CO₂e`, name === "actual" ? "Actual" : name === "target" ? "SBTi Target" : "Projected"]}
                  />
                  <ReferenceLine y={target2025} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "2025 target", position: "insideTopRight", fontSize: 10, fill: "#B45309" }} />
                  <ReferenceLine y={target2030} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "2030 target", position: "insideTopRight", fontSize: 10, fill: "#DC2626" }} />
                  <Bar dataKey="actual" name="actual" fill="#12382B" radius={[4, 4, 0, 0]} barSize={22} />
                  <Line dataKey="target" name="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: "#F59E0B" }} connectNulls />
                  <Line dataKey="projected" name="projected" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {[
                { label: "Actual emissions", color: "#12382B", type: "bar" },
                { label: "SBTi target path", color: "#F59E0B", type: "dash" },
                { label: "Projected (this scenario)", color: "#3B82F6", type: "line" },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {l.type === "bar" && <span className="w-3 h-2.5 rounded-sm" style={{ background: l.color }} />}
                  {l.type === "dash" && <span className="w-5 border-t-2 border-dashed" style={{ borderColor: l.color }} />}
                  {l.type === "line" && <span className="w-5 border-t-2" style={{ borderColor: l.color }} />}
                  <span className="text-[11px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What-if insight */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Biggest lever: switch Cotton Tee to sea freight only</p>
                <p className="text-sm text-muted-foreground">
                  {logistics !== "sea"
                    ? `Switching from ${logistics} to sea freight would save approximately ${((ef.logistics[logistics] - 1.0) * cottonVol * ef.cotton[cottonMat] * ef.dye[dyeProcess] / 1000).toFixed(1)}t CO₂e on the Cotton Tee alone.`
                    : `Your logistics mix is already optimised on sea freight. The next biggest lever is switching Cotton Tee to organic sourcing if not already selected — saves ~${((90.3 - 73.5) * cottonVol / 1000).toFixed(1)}t CO₂e.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegulatoryRadar() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedReg, setExpandedReg] = useState<string | null>("espr");

  type RegStatus = "in-force" | "enacted" | "consultation" | "coming" | "proposed";
  type Impact = "high" | "medium" | "low";

  const regulations: {
    id: string;
    name: string;
    shortName: string;
    jurisdiction: string;
    flag: string;
    status: RegStatus;
    impact: Impact;
    effectiveDate: string;
    daysUntil: number | null;
    affectedSKUs: string;
    affectedSuppliers: number;
    description: string;
    actions: { text: string; done: boolean }[];
    tags: string[];
  }[] = [
    {
      id: "espr", name: "EU Ecodesign for Sustainable Products Regulation", shortName: "ESPR / DPP", jurisdiction: "European Union", flag: "🇪🇺",
      status: "in-force", impact: "high", effectiveDate: "Jul 18, 2026", daysUntil: 427,
      affectedSKUs: "All SKUs sold in EU", affectedSuppliers: 8,
      description: "Requires Digital Product Passports (DPP) for textile products sold in the EU. Products must carry a machine-readable data carrier linking to a standardised set of sustainability attributes — materials, repairability, carbon footprint, and end-of-life instructions.",
      actions: [
        { text: "DPP schema mapping for Essential Cotton Tee", done: true },
        { text: "DPP schema mapping for Merino Wool Sweater", done: false },
        { text: "QR code generation pipeline", done: false },
        { text: "Register with EU DPP registry", done: false },
      ],
      tags: ["DPP", "Product Data", "All SKUs"],
    },
    {
      id: "csrd", name: "Corporate Sustainability Reporting Directive", shortName: "CSRD", jurisdiction: "European Union", flag: "🇪🇺",
      status: "enacted", impact: "high", effectiveDate: "Jan 1, 2025", daysUntil: null,
      affectedSKUs: "Organisation-wide", affectedSuppliers: 10,
      description: "Requires large EU companies to report on sustainability using ESRS standards covering climate, biodiversity, labor, and governance. First CSRD reports due in 2026 covering FY2025. Mandatory double materiality assessment and third-party assurance.",
      actions: [
        { text: "ESRS E1 climate change disclosure", done: true },
        { text: "ESRS S2 value chain worker disclosure", done: false },
        { text: "Third-party assurance engagement", done: false },
        { text: "Double materiality assessment", done: true },
      ],
      tags: ["Reporting", "ESRS", "Scope 3"],
    },
    {
      id: "csddd", name: "Corporate Sustainability Due Diligence Directive", shortName: "CS3D", jurisdiction: "European Union", flag: "🇪🇺",
      status: "enacted", impact: "high", effectiveDate: "Jul 26, 2027", daysUntil: 800,
      affectedSKUs: "Organisation-wide", affectedSuppliers: 10,
      description: "Requires companies to identify, prevent, and remediate actual and potential adverse human rights and environmental impacts throughout their value chain. Includes mandatory climate transition plans and civil liability for harm.",
      actions: [
        { text: "Supply chain due diligence framework", done: false },
        { text: "Tier 2 & 3 supplier risk mapping", done: false },
        { text: "Grievance mechanism audit", done: true },
        { text: "Climate transition plan approval", done: true },
      ],
      tags: ["Due Diligence", "Human Rights", "Supply Chain"],
    },
    {
      id: "agec", name: "Anti-Waste for a Circular Economy Act", shortName: "French AGEC", jurisdiction: "France", flag: "🇫🇷",
      status: "in-force", impact: "medium", effectiveDate: "Jan 1, 2023", daysUntil: null,
      affectedSKUs: "All products sold in France", affectedSuppliers: 5,
      description: "Requires textile producers and importers in France to provide product sustainability info to consumers, including recycled content, repairability index, and end-of-life instructions. Anti-greenwashing provisions apply from 2023.",
      actions: [
        { text: "Publish recycled content % on product pages", done: true },
        { text: "Repairability score for garment categories", done: false },
        { text: "End-of-life collection point registration", done: true },
      ],
      tags: ["Circular Economy", "Consumer Info", "France"],
    },
    {
      id: "lksg", name: "Supply Chain Due Diligence Act", shortName: "German LkSG", jurisdiction: "Germany", flag: "🇩🇪",
      status: "in-force", impact: "medium", effectiveDate: "Jan 1, 2023", daysUntil: null,
      affectedSKUs: "Organisation-wide", affectedSuppliers: 7,
      description: "Obligates companies selling into Germany to conduct human rights and environmental due diligence across their supply chains. Requires risk analysis, preventive measures, remediation, and a grievance mechanism.",
      actions: [
        { text: "Annual risk analysis report", done: true },
        { text: "Supplier Code of Conduct — all tiers", done: false },
        { text: "Grievance mechanism — supplier-accessible", done: true },
      ],
      tags: ["Due Diligence", "Human Rights", "Germany"],
    },
    {
      id: "green-claims", name: "Green Claims Directive", shortName: "EU Green Claims", jurisdiction: "European Union", flag: "🇪🇺",
      status: "consultation", impact: "medium", effectiveDate: "Est. 2026", daysUntil: 365,
      affectedSKUs: "All EU marketing materials", affectedSuppliers: 0,
      description: "Prohibits unsubstantiated environmental claims ('eco-friendly', 'sustainable') without verified evidence. All green claims must be substantiated using the EU Product Environmental Footprint methodology before use in marketing.",
      actions: [
        { text: "Audit all marketing copy for unsubstantiated claims", done: false },
        { text: "Map claims to verified data sources", done: false },
        { text: "PEF methodology assessment for Cotton Tee", done: false },
      ],
      tags: ["Greenwashing", "Marketing", "Claims"],
    },
    {
      id: "epr-uk", name: "Extended Producer Responsibility for Textiles", shortName: "UK EPR", jurisdiction: "United Kingdom", flag: "🇬🇧",
      status: "proposed", impact: "low", effectiveDate: "Est. 2027", daysUntil: null,
      affectedSKUs: "All products sold in UK", affectedSuppliers: 2,
      description: "Proposed UK scheme requiring textile producers to contribute to end-of-life collection, sorting, and recycling infrastructure. Fee structure based on product recyclability and volume. Legislation expected in late 2025.",
      actions: [
        { text: "Monitor DEFRA consultation progress", done: false },
        { text: "Assess UK sales volume for fee estimates", done: false },
      ],
      tags: ["Circular Economy", "UK", "End of Life"],
    },
    {
      id: "forced-labour", name: "EU Forced Labour Regulation", shortName: "EU FLR", jurisdiction: "European Union", flag: "🇪🇺",
      status: "enacted", impact: "medium", effectiveDate: "Dec 14, 2027", daysUntil: 941,
      affectedSKUs: "All products sold in EU", affectedSuppliers: 10,
      description: "Bans products made with forced labour from the EU market. Competent authorities can investigate, require evidence, and order withdrawal from the market. Places burden of proof on companies for high-risk supply chains.",
      actions: [
        { text: "Forced labour risk screening of Tier 1 suppliers", done: true },
        { text: "Tier 2 & 3 screening — high-risk geographies", done: false },
        { text: "Evidence documentation system", done: false },
      ],
      tags: ["Human Rights", "Forced Labour", "Supply Chain"],
    },
  ];

  const statusConfig: Record<RegStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
    "in-force":    { label: "In Force",     color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500"    },
    "enacted":     { label: "Enacted",      color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500"  },
    "consultation":{ label: "Consultation", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-400"   },
    "coming":      { label: "Coming Soon",  color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
    "proposed":    { label: "Proposed",     color: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-200",  dot: "bg-slate-400"  },
  };

  const impactConfig: Record<Impact, { label: string; color: string; bg: string }> = {
    high:   { label: "High Impact",   color: "text-red-600",    bg: "bg-red-100"    },
    medium: { label: "Med. Impact",   color: "text-amber-600",  bg: "bg-amber-100"  },
    low:    { label: "Low Impact",    color: "text-slate-500",  bg: "bg-slate-100"  },
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "high", label: "High Impact" },
    { id: "in-force", label: "In Force" },
    { id: "enacted", label: "Enacted" },
    { id: "eu", label: "EU" },
  ];

  const filteredRegs = regulations.filter(r => {
    if (activeFilter === "all") return true;
    if (activeFilter === "high") return r.impact === "high";
    if (activeFilter === "in-force") return r.status === "in-force";
    if (activeFilter === "enacted") return r.status === "enacted";
    if (activeFilter === "eu") return r.jurisdiction === "European Union";
    return true;
  });

  const summaryStats = [
    { label: "Regulations Tracked", value: regulations.length, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "High Impact", value: regulations.filter(r => r.impact === "high").length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
    { label: "Already In Force", value: regulations.filter(r => r.status === "in-force" || r.status === "enacted").length, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Actions Pending", value: regulations.flatMap(r => r.actions).filter(a => !a.done).length, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  const timeline = [
    { year: "2023", items: ["French AGEC (textiles scope)", "German LkSG"] },
    { year: "2025", items: ["CSRD reporting (FY2025)"] },
    { year: "2026", items: ["ESPR / DPP obligation", "EU Green Claims"] },
    { year: "2027", items: ["CS3D applies", "EU Forced Labour Regulation", "UK EPR (est.)"] },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regulatory Radar</h1>
          <p className="text-sm text-muted-foreground mt-1">Incoming EU and global fashion regulations — impact assessments and required actions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700">Live — updated May 2026</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((s, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-card-border flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Urgent alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">3 regulations are already in force</p>
          <p className="text-sm text-red-700 mt-0.5">ESPR DPP obligations begin July 2026 — 427 days from now. Your Cotton Tee DPP schema is complete but the Wool Sweater still needs mapping.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeFilter === f.id ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:text-foreground hover:border-primary/40"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Regulations list */}
      <div className="space-y-3">
        {filteredRegs.map(reg => {
          const sc = statusConfig[reg.status];
          const ic = impactConfig[reg.impact];
          const isExpanded = expandedReg === reg.id;
          const donePct = Math.round(reg.actions.filter(a => a.done).length / reg.actions.length * 100);
          return (
            <div key={reg.id} className={`bg-card rounded-xl shadow-sm border transition-all duration-200 ${isExpanded ? "border-primary/30 shadow-md" : "border-card-border hover:border-primary/20"}`}>
              <button
                className="w-full px-6 py-5 flex items-start gap-4 text-left"
                onClick={() => setExpandedReg(isExpanded ? null : reg.id)}
              >
                <div className="text-2xl shrink-0 mt-0.5">{reg.flag}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{reg.shortName}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ic.bg} ${ic.color}`}>{ic.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{reg.name} · {reg.jurisdiction}</p>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {reg.effectiveDate}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Shirt className="w-3 h-3" /> {reg.affectedSKUs}</span>
                    {reg.affectedSuppliers > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {reg.affectedSuppliers} suppliers</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{reg.actions.filter(a => a.done).length}/{reg.actions.length} done</span>
                    <div className="w-16 bg-slate-100 rounded-full h-1.5"><div className="h-full rounded-full bg-primary" style={{ width: `${donePct}%` }} /></div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-border pt-4 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{reg.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Required Actions</h4>
                      <div className="space-y-2">
                        {reg.actions.map((a, j) => (
                          <div key={j} className="flex items-center gap-2.5">
                            {a.done
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
                            <span className={`text-sm ${a.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{a.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Impact Scope</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Jurisdiction</span>
                          <span className="font-medium text-foreground">{reg.jurisdiction}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Products affected</span>
                          <span className="font-medium text-foreground">{reg.affectedSKUs}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Suppliers in scope</span>
                          <span className="font-medium text-foreground">{reg.affectedSuppliers > 0 ? `${reg.affectedSuppliers} suppliers` : "None direct"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Effective</span>
                          <span className={`font-medium ${reg.daysUntil !== null ? "text-amber-600" : "text-red-600"}`}>{reg.effectiveDate}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {reg.tags.map((tag, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 bg-muted border border-border rounded-full text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
        <h3 className="font-semibold text-foreground mb-5">Compliance Timeline</h3>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-6">
            {timeline.map((t, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-16 shrink-0 flex justify-end">
                  <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded z-10 relative">{t.year}</span>
                </div>
                <div className="pt-0.5 space-y-1">
                  {t.items.map((item, j) => (
                    <p key={j} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupplierPortal() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ company: "", email: "", tier: "1", message: "" });
  const [inviteSent, setInviteSent] = useState(false);
  const [selectedCerts, setSelectedCerts] = useState<string[]>(["GOTS", "Fair Trade"]);

  type SupplierStatus = "active" | "needs-action" | "pending" | "invited" | "not-invited";

  const suppliers: {
    id: number;
    name: string;
    contact: string;
    location: string;
    tier: 1 | 2 | 3;
    status: SupplierStatus;
    stage: string;
    certs: { name: string; status: "uploaded" | "missing" | "expiring" }[];
    dataCompleteness: number;
    lastActivity: string;
    joinedDate?: string;
  }[] = [
    {
      id: 1, name: "EcoFibers Cooperative", contact: "Priya Sharma", location: "Maharashtra, India",
      tier: 1, status: "active", stage: "Raw Material Sourcing",
      certs: [{ name: "GOTS", status: "uploaded" }, { name: "Fair Trade", status: "uploaded" }, { name: "OEKO-TEX", status: "uploaded" }],
      dataCompleteness: 100, lastActivity: "2 days ago", joinedDate: "Mar 2021",
    },
    {
      id: 2, name: "EcoSpin Facility", contact: "Rajan Nair", location: "Tamil Nadu, India",
      tier: 1, status: "active", stage: "Processing & Spinning",
      certs: [{ name: "BlueSign", status: "uploaded" }, { name: "ZDHC", status: "uploaded" }],
      dataCompleteness: 94, lastActivity: "5 days ago", joinedDate: "Jan 2021",
    },
    {
      id: 3, name: "GreenWeave Mills", contact: "Anita Patel", location: "Tiruppur, India",
      tier: 1, status: "active", stage: "Fabric Production",
      certs: [{ name: "GOTS", status: "uploaded" }, { name: "BlueSign", status: "uploaded" }, { name: "REACH", status: "missing" }],
      dataCompleteness: 88, lastActivity: "1 week ago", joinedDate: "Jun 2021",
    },
    {
      id: 4, name: "EcoDye Facility", contact: "Suresh Kumar", location: "Tiruppur, India",
      tier: 1, status: "needs-action", stage: "Dyeing & Finishing",
      certs: [{ name: "ZDHC", status: "uploaded" }, { name: "OEKO-TEX", status: "expiring" }, { name: "BlueSign", status: "missing" }],
      dataCompleteness: 61, lastActivity: "3 weeks ago", joinedDate: "Aug 2021",
    },
    {
      id: 5, name: "FairStitch Factory", contact: "Mohammad Islam", location: "Dhaka, Bangladesh",
      tier: 1, status: "active", stage: "Garment Manufacturing",
      certs: [{ name: "Fair Trade", status: "uploaded" }, { name: "SA8000", status: "uploaded" }],
      dataCompleteness: 97, lastActivity: "1 day ago", joinedDate: "Nov 2020",
    },
    {
      id: 6, name: "Sunrise Ginning Co.", contact: "Amit Desai", location: "Gujarat, India",
      tier: 2, status: "pending", stage: "Raw Material — Tier 2",
      certs: [{ name: "GOTS", status: "missing" }, { name: "Fair Trade", status: "missing" }],
      dataCompleteness: 22, lastActivity: "Invitation sent 4 days ago",
    },
    {
      id: 7, name: "IndoThread Processors", contact: "Deepa Krishnan", location: "Tamil Nadu, India",
      tier: 2, status: "pending", stage: "Yarn Processing — Tier 2",
      certs: [{ name: "BlueSign", status: "missing" }],
      dataCompleteness: 35, lastActivity: "Partial data uploaded",
    },
    {
      id: 8, name: "Coastal Chemicals Ltd.", contact: "—", location: "Tiruppur, India",
      tier: 2, status: "invited", stage: "Chemical Supply — Tier 2",
      certs: [{ name: "REACH", status: "missing" }, { name: "ZDHC", status: "missing" }],
      dataCompleteness: 0, lastActivity: "Invitation sent 2 weeks ago",
    },
    {
      id: 9, name: "Green Logistics Partners", contact: "—", location: "Rotterdam, Netherlands",
      tier: 3, status: "not-invited", stage: "Logistics — Tier 3",
      certs: [{ name: "ISO 14001", status: "missing" }],
      dataCompleteness: 0, lastActivity: "Not yet onboarded",
    },
    {
      id: 10, name: "Horizon Packaging", contact: "—", location: "Dhaka, Bangladesh",
      tier: 3, status: "not-invited", stage: "Packaging — Tier 3",
      certs: [{ name: "FSC", status: "missing" }, { name: "Plastic-Free", status: "missing" }],
      dataCompleteness: 0, lastActivity: "Not yet onboarded",
    },
  ];

  const statusConfig: Record<SupplierStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
    "active":       { label: "Active",        color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500"  },
    "needs-action": { label: "Needs Action",  color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500"    },
    "pending":      { label: "Data Pending",  color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500"  },
    "invited":      { label: "Invited",       color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-400"   },
    "not-invited":  { label: "Not Invited",   color: "text-slate-600", bg: "bg-slate-50",  border: "border-slate-200",  dot: "bg-slate-400"  },
  };

  const certConfig: Record<string, string> = {
    uploaded: "bg-green-100 text-green-700 border-green-200",
    missing:  "bg-red-50 text-red-600 border-red-200",
    expiring: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const tierColors = ["", "bg-primary text-white", "bg-blue-600 text-white", "bg-slate-500 text-white"];

  const filters = [
    { id: "all", label: "All Suppliers" },
    { id: "tier1", label: "Tier 1" },
    { id: "tier2", label: "Tier 2" },
    { id: "tier3", label: "Tier 3" },
    { id: "needs-action", label: "Needs Action" },
    { id: "not-invited", label: "Not Invited" },
  ];

  const filteredSuppliers = suppliers.filter(s => {
    const matchFilter =
      activeFilter === "all" ? true :
      activeFilter === "tier1" ? s.tier === 1 :
      activeFilter === "tier2" ? s.tier === 2 :
      activeFilter === "tier3" ? s.tier === 3 :
      s.status === activeFilter;
    const matchSearch = searchQuery === "" || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = [
    { label: "Total Suppliers", value: suppliers.length, icon: Building, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active & Complete", value: suppliers.filter(s => s.status === "active").length, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Awaiting Data", value: suppliers.filter(s => s.status === "pending" || s.status === "invited").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Needs Attention", value: suppliers.filter(s => s.status === "needs-action" || s.status === "not-invited").length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  ];

  const certOptions = ["GOTS", "Fair Trade", "OEKO-TEX", "BlueSign", "ZDHC", "SA8000", "REACH", "FSC", "ISO 14001"];

  const handleSendInvite = () => {
    setInviteSent(true);
    setTimeout(() => { setShowInviteModal(false); setInviteSent(false); setInviteForm({ company: "", email: "", tier: "1", message: "" }); }, 1800);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supplier Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Onboard suppliers, track data submissions, and manage certification uploads</p>
        </div>
        <button
          data-testid="button-invite-supplier"
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Invite Supplier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-card-border flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            data-testid="input-supplier-search"
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.id}
              data-testid={`filter-${f.id}`}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeFilter === f.id ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:text-foreground hover:border-primary/40"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier table */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{filteredSuppliers.length} suppliers</span>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" /> Sync data
          </button>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">No suppliers match your filter.</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSuppliers.map(s => {
              const sc = statusConfig[s.status];
              return (
                <div key={s.id} data-testid={`supplier-row-${s.id}`} className="px-6 py-5 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                    {/* Name + meta */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                        <Building className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{s.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierColors[s.tier]}`}>T{s.tier}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>
                          <span className="text-xs text-muted-foreground">{s.stage}</span>
                        </div>
                        {s.contact !== "—" && (
                          <p className="text-xs text-muted-foreground mt-0.5">Contact: {s.contact}</p>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 lg:w-36 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>

                    {/* Certifications */}
                    <div className="flex flex-wrap gap-1.5 lg:w-56 shrink-0">
                      {s.certs.map((c, j) => (
                        <span key={j} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${certConfig[c.status]}`}>
                          {c.status === "uploaded" && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {c.status === "missing"  && <XCircle className="w-2.5 h-2.5" />}
                          {c.status === "expiring" && <AlertTriangle className="w-2.5 h-2.5" />}
                          {c.name}
                        </span>
                      ))}
                    </div>

                    {/* Data completeness */}
                    <div className="lg:w-36 shrink-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Data completeness</span>
                        <span className={`text-xs font-semibold ${s.dataCompleteness === 100 ? "text-green-600" : s.dataCompleteness >= 60 ? "text-amber-600" : "text-red-500"}`}>{s.dataCompleteness}%</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${s.dataCompleteness}%`,
                            backgroundColor: s.dataCompleteness === 100 ? "#6AE096" : s.dataCompleteness >= 60 ? "#F59E0B" : "#EF4444"
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{s.lastActivity}</p>
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === "active" && (
                        <button className="text-xs text-primary font-medium hover:text-primary/80 transition-colors px-3 py-1.5 border border-primary/30 rounded-md hover:bg-primary/5">
                          View
                        </button>
                      )}
                      {s.status === "needs-action" && (
                        <button className="text-xs text-red-600 font-medium hover:text-red-700 transition-colors px-3 py-1.5 border border-red-200 rounded-md hover:bg-red-50 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Resolve
                        </button>
                      )}
                      {(s.status === "pending" || s.status === "invited") && (
                        <button className="text-xs text-amber-700 font-medium hover:text-amber-800 transition-colors px-3 py-1.5 border border-amber-200 rounded-md hover:bg-amber-50 flex items-center gap-1">
                          <Send className="w-3 h-3" /> Remind
                        </button>
                      )}
                      {s.status === "not-invited" && (
                        <button
                          onClick={() => { setInviteForm(f => ({ ...f, company: s.name, tier: String(s.tier) })); setShowInviteModal(true); }}
                          className="text-xs text-primary font-medium hover:text-primary/80 transition-colors px-3 py-1.5 border border-primary/30 rounded-md hover:bg-primary/5 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Invite
                        </button>
                      )}
                      <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Onboarding checklist summary */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Onboarding Checklist — Tier 2 Gap Analysis</h3>
        <p className="text-sm text-muted-foreground mb-5">Your CSRD Scope 3 disclosure requires data from all Tier 2 suppliers. Current coverage: <span className="font-semibold text-amber-600">60%</span>.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Accept invitation", count: "2 of 3", done: false, icon: MailOpen },
            { label: "Upload company profile", count: "1 of 3", done: false, icon: Upload },
            { label: "Submit certifications", count: "0 of 3", done: false, icon: FileBadge },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <step.icon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.count} suppliers complete</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-border w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">Invite a Supplier</h2>
                <p className="text-xs text-muted-foreground mt-0.5">They'll receive an email with a secure link to submit their data</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1.5">Company name</label>
                  <input
                    data-testid="input-invite-company"
                    type="text"
                    placeholder="e.g. Sunrise Ginning Co."
                    value={inviteForm.company}
                    onChange={e => setInviteForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1.5">Contact email</label>
                  <input
                    data-testid="input-invite-email"
                    type="email"
                    placeholder="contact@supplier.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Supply chain tier</label>
                  <select
                    data-testid="select-invite-tier"
                    value={inviteForm.tier}
                    onChange={e => setInviteForm(f => ({ ...f, tier: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="1">Tier 1 — Direct supplier</option>
                    <option value="2">Tier 2 — Secondary supplier</option>
                    <option value="3">Tier 3 — Raw material origin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Language</label>
                  <select className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Bengali</option>
                    <option>Dutch</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Required certifications to upload</label>
                <div className="flex flex-wrap gap-2">
                  {certOptions.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCerts(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${selectedCerts.includes(c) ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40"}`}
                    >
                      {selectedCerts.includes(c) && <span className="mr-1">✓</span>}{c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Personal message (optional)</label>
                <textarea
                  data-testid="input-invite-message"
                  rows={3}
                  placeholder="Hi, we'd like to invite you to join our supply chain transparency platform..."
                  value={inviteForm.message}
                  onChange={e => setInviteForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link2 className="w-3.5 h-3.5" />
                <span>Secure onboarding link generated on send</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors font-medium">
                  Cancel
                </button>
                <button
                  data-testid="button-send-invite"
                  onClick={handleSendInvite}
                  disabled={!inviteForm.company || !inviteForm.email || inviteSent}
                  className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all shadow-sm ${inviteSent ? "bg-green-500 text-white" : "bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"}`}
                >
                  {inviteSent ? <><CheckCircle2 className="w-4 h-4" /> Sent!</> : <><Send className="w-4 h-4" /> Send Invitation</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("traceability");

  // DPP is full-screen — render without the shell
  if (activeView === "dpp") {
    return <DigitalProductPassport onBack={() => setActiveView("traceability")} />;
  }

  const views: Record<string, ReactNode> = {
    dashboard: <Dashboard onViewMetrics={() => setActiveView("traceability")} />,
    traceability: <Traceability onViewDPP={() => setActiveView("dpp")} />,
    brandProfile: <BrandProfile onViewDashboard={() => setActiveView("dashboard")} />,
    dpp: <DigitalProductPassport onBack={() => setActiveView("traceability")} />,
    csrd: <CSRDReport />,
    suppliers: <SupplierPortal />,
    carbon: <CarbonCalculator />,
    regulatory: <RegulatoryRadar />,
    settings: <Settings />,
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "traceability", label: "Lifecycle Traceability", icon: GitBranch },
    { id: "brandProfile", label: "Brand Profile", icon: Building2 },
    { id: "dpp", label: "Digital Product Passport", icon: FileCheck },
    { id: "csrd", label: "CSRD Report", icon: ClipboardList },
    { id: "suppliers", label: "Supplier Portal", icon: Users },
    { id: "carbon", label: "Carbon Calculator", icon: Calculator },
    { id: "regulatory", label: "Regulatory Radar", icon: Globe },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/30">
          <div className="flex items-center gap-2">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-md">
              <Grid className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight">RE:Fashioned</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3">
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeView === item.id 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeView === item.id ? "opacity-100" : "opacity-70"}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border/30 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 border border-sidebar-border">
              <User className="w-5 h-5 text-sidebar-foreground/70" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">Emma Johnson</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Sustainability Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-end px-6 shrink-0 z-10 relative">
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="h-6 w-px bg-border"></div>
            <button className="flex items-center gap-2 hover:bg-muted px-2 py-1 -mr-2 rounded-md transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium hidden sm:block">Emma Johnson</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto relative">
          {views[activeView as keyof typeof views]}
        </div>
      </main>
    </div>
  );
}
