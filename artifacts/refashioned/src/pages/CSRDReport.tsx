import { useState, useEffect } from "react";
import {
  AlertTriangle, Clock, Download, TrendingUp, Zap, User,
} from "lucide-react";
import {
  yearData, materialityTopics, sizeClass,
  statusConfig, dataPointConfig, priorityConfig,
  buildEsrsDisclosures, type EsrsLiveValues,
} from "../lib/reports/csrdMetrics";
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
  const [liveSuppliers, setLiveSuppliers] = useState<{ tier: number; status: string }[]>([]);
  const [totalProductsLive, setTotalProductsLive] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchReport() {
      setDbLoading(true);
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
      const [stRes, sRes, pRes] = await Promise.all([
        client.from("lifecycle_stages").select("co2_impact_kg, water_usage_l").eq("organization_id", orgId),
        client.from("suppliers").select("tier, status").eq("organization_id", orgId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.from("products") as any).select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      if (cancelled) return;
      if (!stRes.error && stRes.data) {
        const stages = stRes.data as { co2_impact_kg: number | null; water_usage_l: number | null }[];
        setScope3Live(Math.round(stages.reduce((a, r) => a + (r.co2_impact_kg ?? 0), 0) * 10) / 10);
        setWaterLive(Math.round(stages.reduce((a, r) => a + (r.water_usage_l ?? 0), 0)));
      }
      if (!sRes.error && sRes.data) {
        setLiveSuppliers(sRes.data as { tier: number; status: string }[]);
      }
      setTotalProductsLive(pRes.count ?? 0);
      setDbLoading(false);
    }
    fetchReport();
    return () => { cancelled = true; };
  }, []);

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

  // Live supplier tier breakdown for ESRS S2
  const hasLiveSuppliers = liveSuppliers.length > 0;
  const tier1Count = liveSuppliers.filter(s => s.tier === 1).length;
  const tier2Count = liveSuppliers.filter(s => s.tier === 2).length;
  const tier3Count = liveSuppliers.filter(s => s.tier === 3).length;
  const s2T1Val = hasLiveSuppliers ? `${tier1Count} supplier${tier1Count !== 1 ? "s" : ""} — 100% coverage` : "100% audited (SA8000)";
  const s2T2Val = hasLiveSuppliers ? `${tier2Count} supplier${tier2Count !== 1 ? "s" : ""} mapped` : "60% audited";
  const s2T3Val = hasLiveSuppliers ? `${tier3Count} supplier${tier3Count !== 1 ? "s" : ""} mapped` : "12% coverage";
  // Live water total for ESRS E3
  const e3WaterVal = waterLive != null && waterLive > 0
    ? `${waterLive.toLocaleString()} L (total, all stages)`
    : "2,965 L / unit";
  // Key metrics for overview panel
  const metricsProductsVal = dbLoading ? "…" : String(totalProductsLive ?? 0);
  const metricsSuppliersVal = dbLoading ? "…" : String(liveSuppliers.length);

  const scopeData = [
    { scope: "Scope 1", tonnes: scope1t, fill: "#12382B" },
    { scope: "Scope 2", tonnes: scope2t, fill: "#6AE096" },
    { scope: "Scope 3", tonnes: scope3t, fill: "#94A3B8" },
  ];

  const liveValues: EsrsLiveValues = {
    scope1t,
    scope2t,
    scope3t,
    e3WaterVal,
    dbLoading,
    s2T1Val,
    s2T2Val,
    s2T3Val,
    s2T2Status: (hasLiveSuppliers && tier2Count > 0) ? "complete" : "pending",
    s2T3Status: (hasLiveSuppliers && tier3Count > 0) ? "pending"  : "missing",
  };

  const esrsDisclosuresWithScores = buildEsrsDisclosures(liveValues).map(d => {
    const score = yd.esrsScores[d.id as keyof typeof yd.esrsScores] ?? d.score;
    const status = score >= 80 ? "on-track" as const : score >= 55 ? "in-progress" as const : "at-risk" as const;
    return { ...d, score, status };
  });

  const keyActions = yd.keyActions;

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
            onClick={() => window.print()}
            disabled={dbLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-sm text-primary font-medium">Generating report from live database…</p>
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
              <p className="text-xl font-bold text-foreground">{metricsProductsVal}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Products tracked</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border border-border text-center">
              <p className="text-xl font-bold text-foreground">{metricsSuppliersVal}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Suppliers mapped</p>
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
