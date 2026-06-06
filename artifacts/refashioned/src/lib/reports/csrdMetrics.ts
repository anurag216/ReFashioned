import { Leaf, Droplets, Users, Globe, Briefcase, CheckCircle2, Clock, XCircle } from "lucide-react";

export type EsrsStatus     = "on-track" | "in-progress" | "at-risk";
export type DataPointStatus = "complete" | "pending" | "missing";
export type ActionPriority  = "high" | "medium" | "low";

// ── Per-year static report data ───────────────────────────────────────────────
export const yearData = {
  "2023": {
    overallScore: 74,
    scopeData: [
      { scope: "Scope 1", tonnes: 12.4,  fill: "#12382B" },
      { scope: "Scope 2", tonnes: 28.7,  fill: "#6AE096" },
      { scope: "Scope 3", tonnes: 806.2, fill: "#94A3B8" },
    ],
    esrsScores: { e1: 82, e2: 68, e3: 79, s1: 91, s2: 63, g1: 88 },
    keyActions: [
      { priority: "high"   as ActionPriority, action: "Renew OEKO-TEX certificate for Dyeing & Finishing stage",          deadline: "Jan 31, 2024", owner: "Supply Chain"  },
      { priority: "high"   as ActionPriority, action: "Complete Tier 3 supplier REACH substance declarations",            deadline: "Mar 31, 2024", owner: "Procurement"   },
      { priority: "medium" as ActionPriority, action: "Submit SBTi target validation package",                            deadline: "Apr 30, 2024", owner: "Sustainability" },
      { priority: "medium" as ActionPriority, action: "Expand Tier 2 audit coverage from 60% to 90%",                    deadline: "Dec 31, 2024", owner: "Supply Chain"  },
      { priority: "medium" as ActionPriority, action: "Finalise living wage certification process",                       deadline: "Mar 31, 2024", owner: "HR & People"   },
      { priority: "low"    as ActionPriority, action: "Complete annual GDPR compliance review",                           deadline: "Feb 28, 2024", owner: "Legal"         },
    ],
  },
  "2022": {
    overallScore: 61,
    scopeData: [
      { scope: "Scope 1", tonnes: 15.8,  fill: "#12382B" },
      { scope: "Scope 2", tonnes: 34.2,  fill: "#6AE096" },
      { scope: "Scope 3", tonnes: 968.5, fill: "#94A3B8" },
    ],
    esrsScores: { e1: 66, e2: 54, e3: 62, s1: 80, s2: 48, g1: 78 },
    keyActions: [
      { priority: "high"   as ActionPriority, action: "Establish Scope 3 supplier emissions data collection process",    deadline: "Jun 30, 2023", owner: "Sustainability" },
      { priority: "high"   as ActionPriority, action: "Achieve full ZDHC compliance at Tier 1 dyeing facilities",        deadline: "Mar 31, 2023", owner: "Supply Chain"  },
      { priority: "high"   as ActionPriority, action: "Implement SA8000 audit programme for all Tier 1 factories",       deadline: "Sep 30, 2023", owner: "Supply Chain"  },
      { priority: "medium" as ActionPriority, action: "Formalise climate transition plan for board approval",             deadline: "Dec 31, 2023", owner: "Executive"     },
      { priority: "medium" as ActionPriority, action: "Deploy supplier portal for data collection and cert uploads",      deadline: "Oct 31, 2023", owner: "Technology"    },
      { priority: "low"    as ActionPriority, action: "Publish first Tax Transparency Report",                            deadline: "Jun 30, 2023", owner: "Legal"         },
    ],
  },
};

// ── Double materiality matrix ─────────────────────────────────────────────────
export const materialityTopics = [
  { label: "GHG Emissions", impact: 88, financial: 72, size: "lg" },
  { label: "Water Use",     impact: 82, financial: 55, size: "md" },
  { label: "Labor Rights",  impact: 79, financial: 60, size: "md" },
  { label: "Chemicals",     impact: 65, financial: 80, size: "md" },
  { label: "Packaging",     impact: 55, financial: 42, size: "sm" },
  { label: "Biodiversity",  impact: 48, financial: 30, size: "sm" },
  { label: "Data Privacy",  impact: 30, financial: 65, size: "sm" },
  { label: "Tax",           impact: 25, financial: 50, size: "sm" },
];

export const sizeClass = { lg: "w-5 h-5", md: "w-3.5 h-3.5", sm: "w-2.5 h-2.5" };

// ── Style config maps ─────────────────────────────────────────────────────────
export const statusConfig: Record<EsrsStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  "on-track":    { label: "On Track",    color: "text-green-700", bg: "bg-green-100", border: "border-green-200", dot: "bg-green-500" },
  "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-200", dot: "bg-amber-500" },
  "at-risk":     { label: "At Risk",     color: "text-red-700",   bg: "bg-red-100",   border: "border-red-200",   dot: "bg-red-500"   },
};

export const dataPointConfig: Record<DataPointStatus, { icon: typeof CheckCircle2; color: string }> = {
  complete: { icon: CheckCircle2, color: "text-green-500" },
  pending:  { icon: Clock,        color: "text-amber-500" },
  missing:  { icon: XCircle,      color: "text-red-400"   },
};

export const priorityConfig: Record<ActionPriority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  high:   { label: "High",   color: "text-red-700",   bg: "bg-red-50",   border: "border-red-200",   dot: "bg-red-500"   },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  low:    { label: "Low",    color: "text-blue-700",  bg: "bg-blue-50",  border: "border-blue-200",  dot: "bg-blue-500"  },
};

// ── ESRS disclosure builder ───────────────────────────────────────────────────
// Pass the values derived from live DB data; static narrative + labels are encoded here.
export interface EsrsLiveValues {
  scope1t:    number;
  scope2t:    number;
  scope3t:    number;
  e3WaterVal: string;
  dbLoading:  boolean;
  s2T1Val:    string;
  s2T2Val:    string;
  s2T3Val:    string;
  s2T2Status: DataPointStatus;
  s2T3Status: DataPointStatus;
}

export function buildEsrsDisclosures(lv: EsrsLiveValues) {
  const load = (val: string) => lv.dbLoading ? "…" : val;
  return [
    {
      id: "e1", code: "ESRS E1", title: "Climate Change",
      icon: Leaf, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200",
      score: 82, status: "on-track" as EsrsStatus,
      dataPoints: [
        { label: "Scope 1 Emissions (Direct)",       value: `${lv.scope1t} t CO₂e`,     status: "complete" as DataPointStatus },
        { label: "Scope 2 Emissions (Energy)",        value: `${lv.scope2t} t CO₂e`,     status: "complete" as DataPointStatus },
        { label: "Scope 3 Emissions (Supply Chain)",  value: `${lv.scope3t} t CO₂e`,     status: "complete" as DataPointStatus },
        { label: "Climate Transition Plan",           value: "Net Zero by 2040",          status: "complete" as DataPointStatus },
        { label: "Science-Based Target (SBTi)",       value: "Validation pending",        status: "pending"  as DataPointStatus },
        { label: "Physical Risk Assessment",          value: "Not started",               status: "missing"  as DataPointStatus },
      ],
      narrative: "EcoThread has mapped GHG emissions across all three scopes for the 2023 reporting period. Scope 3 represents 95.1% of total emissions, primarily from raw material sourcing and processing in India. A climate transition plan targeting Net Zero by 2040 has been approved by the board. SBTi validation is expected in Q2 2024.",
    },
    {
      id: "e2", code: "ESRS E2", title: "Pollution",
      icon: Droplets, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200",
      score: 68, status: "in-progress" as EsrsStatus,
      dataPoints: [
        { label: "ZDHC MRSL Compliance",             value: "Tier 1–2 verified",         status: "complete" as DataPointStatus },
        { label: "Chemical Inventory (REACH)",        value: "Partial — Tier 3 gap",      status: "pending"  as DataPointStatus },
        { label: "Wastewater Treatment Records",      value: "EcoDye Facility",           status: "complete" as DataPointStatus },
        { label: "OEKO-TEX Certificate",              value: "Under review — flagged",    status: "missing"  as DataPointStatus },
        { label: "Pollution Incident Register",       value: "No incidents 2023",         status: "complete" as DataPointStatus },
      ],
      narrative: "Chemical management is verified across Tier 1 and Tier 2 suppliers. A gap exists at Tier 3 level for REACH substance declarations. The OEKO-TEX certificate for the Dyeing & Finishing stage requires immediate renewal; this is the primary compliance risk for this reporting period.",
    },
    {
      id: "e3", code: "ESRS E3", title: "Water & Marine Resources",
      icon: Droplets, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200",
      score: 79, status: "on-track" as EsrsStatus,
      dataPoints: [
        { label: "Total Water Withdrawal",            value: load(lv.e3WaterVal),         status: "complete" as DataPointStatus },
        { label: "Water Recycling Rate",              value: "43% at processing",         status: "complete" as DataPointStatus },
        { label: "Water Stress Area Assessment",      value: "Maharashtra (high risk)",    status: "complete" as DataPointStatus },
        { label: "Reduction Target (2025)",           value: "-20% vs 2021 baseline",     status: "pending"  as DataPointStatus },
        { label: "Marine Pollution Disclosure",       value: "Not applicable",            status: "complete" as DataPointStatus },
      ],
      narrative: "Water consumption has been fully measured at SKU level for the Essential Cotton Tee — 2,965 L, representing a 91% reduction vs conventional cotton. Raw material sourcing in Maharashtra is flagged as a water-stressed region under WRI Aqueduct. A formal reduction target is being ratified for the 2025 reporting cycle.",
    },
    {
      id: "s1", code: "ESRS S1", title: "Own Workforce",
      icon: Users, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200",
      score: 91, status: "on-track" as EsrsStatus,
      dataPoints: [
        { label: "Employee Count",                    value: "148 FTE",                   status: "complete" as DataPointStatus },
        { label: "Gender Pay Gap Disclosure",         value: "3.2% gap disclosed",        status: "complete" as DataPointStatus },
        { label: "Health & Safety Incidents",         value: "0 LTIR in 2023",            status: "complete" as DataPointStatus },
        { label: "Training Hours / Employee",         value: "22 hrs avg",                status: "complete" as DataPointStatus },
        { label: "Works Council Engagement",          value: "Quarterly cadence",         status: "complete" as DataPointStatus },
        { label: "Living Wage Certification",         value: "In progress — Q1 2024",     status: "pending"  as DataPointStatus },
      ],
      narrative: "Own workforce disclosures are substantially complete. EcoThread employs 148 FTE across Stockholm HQ and partner offices. Zero lost-time injury rate was achieved in 2023. A living wage certification process was initiated in October 2023 and is expected to complete in Q1 2024.",
    },
    {
      id: "s2", code: "ESRS S2", title: "Workers in Value Chain",
      icon: Globe, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200",
      score: 63, status: "in-progress" as EsrsStatus,
      dataPoints: [
        { label: "Tier 1 Supplier Audits",            value: load(lv.s2T1Val),            status: "complete"    as DataPointStatus },
        { label: "Tier 2 Supplier Audits",            value: load(lv.s2T2Val),            status: lv.s2T2Status                    },
        { label: "Tier 3 Supplier Audits",            value: load(lv.s2T3Val),            status: lv.s2T3Status                    },
        { label: "Supplier Code of Conduct",          value: "Signed by all Tier 1",      status: "complete"    as DataPointStatus },
        { label: "Living Wage — Supply Chain",        value: "Gap analysis in progress",  status: "pending"     as DataPointStatus },
        { label: "Grievance Mechanism",               value: "Hotline operational",       status: "complete"    as DataPointStatus },
      ],
      narrative: "Tier 1 supplier compliance is strong — all facilities are SA8000 certified and have signed the EcoThread Supplier Code of Conduct. Tier 2 and Tier 3 coverage remains the key gap. A supplier engagement programme targeting 90% Tier 2 audit coverage by end of 2024 is underway.",
    },
    {
      id: "g1", code: "ESRS G1", title: "Business Conduct",
      icon: Briefcase, color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200",
      score: 88, status: "on-track" as EsrsStatus,
      dataPoints: [
        { label: "Anti-Corruption Policy",            value: "Board-approved 2022",       status: "complete" as DataPointStatus },
        { label: "Whistleblower Channel",             value: "EthicsPoint — active",      status: "complete" as DataPointStatus },
        { label: "Lobbying Disclosure",               value: "No lobbying activity",      status: "complete" as DataPointStatus },
        { label: "Tax Transparency Report",           value: "Published June 2023",       status: "complete" as DataPointStatus },
        { label: "Conflict Minerals (3TG)",           value: "Not applicable",            status: "complete" as DataPointStatus },
        { label: "Data Privacy (GDPR)",               value: "Annual review pending",     status: "pending"  as DataPointStatus },
      ],
      narrative: "Governance disclosures are well-established. EcoThread operates an independent whistleblower channel and publishes an annual tax transparency report. GDPR compliance review is scheduled for Q1 2024 to align with the annual CSRD reporting cycle.",
    },
  ];
}
