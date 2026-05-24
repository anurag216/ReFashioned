import { useState, useEffect } from "react";
import {
  Leaf, Droplets, Users, Globe, Briefcase,
  AlertTriangle, CheckCircle2, XCircle, Clock,
  Download, TrendingUp, Zap, User,
} from "lucide-react";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { supabase } from "../lib/supabaseClient";

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
  const [dbLoading, setDbLoading] = useState(true);
  const [scope3Live, setScope3Live] = useState<number | null>(null);
  const [waterLive, setWaterLive] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchEmissions() {
      setDbLoading(true);
      if (!supabase) { setDbLoading(false); return; }
      const { data, error } = await supabase
        .from("lifecycle_stages")
        .select("co2_impact_kg, water_usage_l");
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        const co2Sum = (data as { co2_impact_kg: number | null }[])
          .reduce((acc, r) => acc + (r.co2_impact_kg ?? 0), 0);
        const waterSum = (data as { water_usage_l: number | null }[])
          .reduce((acc, r) => acc + (r.water_usage_l ?? 0), 0);
        setScope3Live(Math.round(co2Sum * 10) / 10);
        setWaterLive(Math.round(waterSum));
      }
      setDbLoading(false);
    }
    fetchEmissions();
    return () => { cancelled = true; };
  }, []);

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
  const scope1t = yd.scopeData[0].tonnes;
  const scope2t = yd.scopeData[1].tonnes;
  const scope3t = scope3Live ?? yd.scopeData[2].tonnes;
  const totalCo2t = Math.round((scope1t + scope2t + scope3t) * 10) / 10;
  const totalCo2Display = totalCo2t >= 1000
    ? `${(totalCo2t / 1000).toFixed(1)}k`
    : `${totalCo2t}`;
  const totalWaterDisplay = waterLive != null
    ? waterLive >= 1_000_000 ? `${(waterLive / 1_000_000).toFixed(1)}M` : waterLive.toLocaleString()
    : "1.2M";
  const scope3Pct = totalCo2t > 0 ? `${Math.round((scope3t / totalCo2t) * 1000) / 10}%` : "—";
  const scope2Pct = totalCo2t > 0 ? `${Math.round((scope2t / totalCo2t) * 1000) / 10}%` : "—";
  const scope1Pct = totalCo2t > 0 ? `${Math.round((scope1t / totalCo2t) * 1000) / 10}%` : "—";
  const scopeData = [
    { scope: "Scope 1", tonnes: scope1t, fill: "#12382B" },
    { scope: "Scope 2", tonnes: scope2t, fill: "#6AE096" },
    { scope: "Scope 3", tonnes: scope3t, fill: "#94A3B8" },
  ];

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
        { label: "Scope 1 Emissions (Direct)", value: `${scope1t} t CO₂e`, status: "complete" as const },
        { label: "Scope 2 Emissions (Energy)", value: `${scope2t} t CO₂e`, status: "complete" as const },
        { label: "Scope 3 Emissions (Supply Chain)", value: `${scope3t} t CO₂e`, status: "complete" as const },
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
    "on-track":    { label: "On Track",    color: "text-green-700", bg: "bg-green-100", border: "border-green-200", dot: "bg-green-500" },
    "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-200", dot: "bg-amber-500" },
    "at-risk":     { label: "At Risk",     color: "text-red-700",   bg: "bg-red-100",   border: "border-red-200",   dot: "bg-red-500"   },
  };

  const dataPointConfig = {
    complete: { icon: CheckCircle2, color: "text-green-500" },
    pending:  { icon: Clock,        color: "text-amber-500" },
    missing:  { icon: XCircle,      color: "text-red-400"   },
  };

  const materialityTopics = [
    { label: "GHG Emissions", impact: 88, financial: 72, size: "lg" },
    { label: "Water Use",     impact: 82, financial: 55, size: "md" },
    { label: "Labor Rights",  impact: 79, financial: 60, size: "md" },
    { label: "Chemicals",     impact: 65, financial: 80, size: "md" },
    { label: "Packaging",     impact: 55, financial: 42, size: "sm" },
    { label: "Biodiversity",  impact: 48, financial: 30, size: "sm" },
    { label: "Data Privacy",  impact: 30, financial: 65, size: "sm" },
    { label: "Tax",           impact: 25, financial: 50, size: "sm" },
  ];

  const sizeClass = { lg: "w-5 h-5", md: "w-3.5 h-3.5", sm: "w-2.5 h-2.5" };

  const priorityConfig = {
    high:   { label: "High",   color: "text-red-700",   bg: "bg-red-50",   border: "border-red-200",   dot: "bg-red-500"   },
    medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
    low:    { label: "Low",    color: "text-blue-700",  bg: "bg-blue-50",  border: "border-blue-200",  dot: "bg-blue-500"  },
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

      {/* Loading banner */}
      {dbLoading && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-lg px-4 py-3">
          <svg className="animate-spin w-4 h-4 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-sm text-primary font-medium">Fetching live emissions data from database…</p>
        </div>
      )}

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
                          backgroundColor: d.score >= 80 ? "#6AE096" : d.score >= 65 ? "#F59E0B" : "#EF4444",
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
              <p className="text-xl font-bold text-foreground">{dbLoading ? <span className="text-base animate-pulse text-muted-foreground">…</span> : totalCo2Display}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tonnes CO₂e</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border border-border text-center">
              <p className="text-xl font-bold text-foreground">{dbLoading ? <span className="text-base animate-pulse text-muted-foreground">…</span> : totalWaterDisplay}</p>
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
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20">{dbLoading ? "…" : `${totalCo2t} t total`}</span>
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
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {[
              { label: "Scope 1 — Direct emissions (fuel, fleet)", val: `${scope1t} t`, pct: scope1Pct, color: "bg-primary" },
              { label: "Scope 2 — Purchased energy", val: `${scope2t} t`, pct: scope2Pct, color: "bg-accent" },
              { label: "Scope 3 — Value chain (upstream + downstream)", val: dbLoading ? "…" : `${scope3t} t`, pct: dbLoading ? "…" : scope3Pct, color: "bg-slate-300" },
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
            <div className="absolute top-2 left-2 text-[10px] text-muted-foreground/60 font-medium">Low / Low</div>
            <div className="absolute top-2 right-2 text-[10px] text-muted-foreground/60 font-medium text-right">Low Impact / High Financial</div>
            <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground/60 font-medium">High Impact / Low Financial</div>
            <div className="absolute bottom-2 right-2 text-[10px] text-primary/60 font-medium text-right">High / High (Material)</div>
            <div className="absolute inset-1/2 w-px h-full bg-border/60 -translate-x-1/2 -translate-y-1/2" style={{ height: "calc(100% - 1rem)", top: "0.5rem" }} />
            <div className="absolute inset-x-2 h-px bg-border/60" style={{ top: "50%" }} />

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
          {esrsDisclosuresWithScores.map(d => {
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
                  <TrendingUp className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 animate-in fade-in duration-200">
                    <div className="space-y-5" style={{ marginLeft: "3.25rem" }}>
                      <div className="bg-muted/30 rounded-lg p-4 border border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Disclosure narrative
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{d.narrative}</p>
                      </div>
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
