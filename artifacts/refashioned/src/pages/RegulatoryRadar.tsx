import { useState } from "react";
import {
  FileText, AlertTriangle, Zap, ClipboardList,
  Clock, Shirt, Users, ChevronRight, CheckCircle2,
} from "lucide-react";

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
