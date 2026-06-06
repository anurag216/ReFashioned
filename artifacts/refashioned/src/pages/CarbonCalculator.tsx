import { useState } from "react";
import {
  Download, FlameKindling, Target, TrendingUp, Globe,
  CheckCircle2, AlertTriangle, Sliders, Calculator, Zap,
} from "lucide-react";
import { MATERIAL_FACTORS } from "../lib/calculations/carbonFactors";
import { LogStagePanel } from "../components/carbon/LogStagePanel";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, Cell,
} from "recharts";

export function CarbonCalculator() {
  // ── Stage calculator state ───────────────────────────────────────────────────
  const [calcMaterial, setCalcMaterial] = useState<string>("organic_cotton");
  const [calcWeight, setCalcWeight]     = useState<string>("1.0");
  // Computed CO₂ from the stage calculator
  const calcWeightNum = parseFloat(calcWeight) || 0;
  const calcFactor    = MATERIAL_FACTORS[calcMaterial]?.factor ?? 0;
  const calcCo2       = parseFloat((calcWeightNum * calcFactor).toFixed(3));

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

      {/* ── Stage CO₂ Calculator + Log to Product ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Left: Stage Calculator */}
        <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Stage CO₂ Estimator</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-5 ml-10">
            Select a material and weight to instantly estimate its carbon impact
          </p>

          <div className="space-y-4">
            {/* Material selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Material</label>
              <select
                value={calcMaterial}
                onChange={e => setCalcMaterial(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {Object.entries(MATERIAL_FACTORS).map(([key, m]) => (
                  <option key={key} value={key}>{m.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {MATERIAL_FACTORS[calcMaterial]?.note} · <span className="font-medium text-foreground">{MATERIAL_FACTORS[calcMaterial]?.factor} kg CO₂e / kg</span>
              </p>
            </div>

            {/* Weight input */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={calcWeight}
                onChange={e => setCalcWeight(e.target.value)}
                placeholder="e.g. 1.5"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Result — big live number */}
            <div className={`rounded-xl border-2 p-5 text-center transition-colors ${calcCo2 > 0 ? "bg-primary/5 border-primary/30" : "bg-muted/40 border-border"}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Estimated CO₂ Impact</p>
              <p className={`text-5xl font-extrabold tracking-tight transition-colors ${calcCo2 > 0 ? "text-primary" : "text-muted-foreground/40"}`}>
                {calcCo2 > 0 ? calcCo2.toFixed(2) : "—"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">kg CO₂e</p>
              {calcCo2 > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {calcWeightNum} kg × {calcFactor} kg CO₂e/kg = <span className="font-medium text-foreground">{calcCo2} kg CO₂e</span>
                </p>
              )}
            </div>

            {/* Reference bars vs common materials */}
            {calcCo2 > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">How this compares (per kg)</p>
                {[
                  { label: "Hemp",        val: 1.5  },
                  { label: "Tencel",      val: 1.9  },
                  { label: "Org. Cotton", val: 2.3  },
                  { label: "Conv. Cotton",val: 4.0  },
                  { label: "Nylon",       val: 7.0  },
                  { label: "Cashmere",    val: 28.0 },
                ].map(ref => {
                  const pct = Math.min(100, Math.round((ref.val / 28) * 100));
                  const isThis = Math.abs(ref.val - calcFactor) < 0.01;
                  return (
                    <div key={ref.label} className="flex items-center gap-2">
                      <span className={`text-[10px] w-20 shrink-0 ${isThis ? "font-semibold text-primary" : "text-muted-foreground"}`}>{ref.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${isThis ? "bg-primary" : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] w-8 text-right ${isThis ? "font-semibold text-primary" : "text-muted-foreground"}`}>{ref.val}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Log to Product */}
        <LogStagePanel calcCo2={calcCo2} />

      </div>
    </div>
  );
}
