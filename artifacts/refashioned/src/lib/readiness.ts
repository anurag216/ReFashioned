export type Priority = "BLOCKED" | "NEEDS_ACTION" | "READY";

export type ReadinessDimension = {
  applicable: boolean;
  complete?: boolean;
  percent?: number | null;
  ready?: boolean;
  state?: string;
};

export type ProductReadiness = {
  product_id: string;
  product_name: string;
  overall_percent: number;
  blocker_count: number;
  supplier_count: number;
  evidence_state: string;
  certification_state: string;
  dpp_state: string;
  dimensions: Record<string, ReadinessDimension>;
  blockers: string[];
};

export type ActionItem = {
  category: string;
  priority: Priority;
  severity: "high" | "medium" | "info";
  title: string;
  explanation: string;
  entity_type: string;
  entity_id: string;
  product_id?: string;
  product_name?: string;
  destination: string;
};

const LABELS: Record<string, string> = {
  not_applicable: "Not applicable", pending_review: "Pending review",
  expiring_soon: "Expiring soon", ready_to_publish: "Ready to publish",
  republish_needed: "Republish recommended",
};

export function formatOperationalState(value: string) {
  return LABELS[value] ?? value.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function readinessCsv(rows: ProductReadiness[]) {
  const headings = ["Product", "Readiness %", "Blocker count", "Supplier count", "Evidence state", "Certification state", "DPP state"];
  return [headings, ...rows.map(row => [row.product_name,row.overall_percent,row.blocker_count,row.supplier_count,formatOperationalState(row.evidence_state),formatOperationalState(row.certification_state),formatOperationalState(row.dpp_state)])]
    .map(row => row.map(csvCell).join(",")).join("\n");
}

export function downloadReadinessCsv(rows: ProductReadiness[]) {
  const url = URL.createObjectURL(new Blob([readinessCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `readiness-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
