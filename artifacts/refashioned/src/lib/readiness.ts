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

function objectArray(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some(item => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error(`Invalid ${label} response`);
  }
  return value as Record<string, unknown>[];
}

export function parseProductReadiness(value: unknown): ProductReadiness[] {
  return objectArray(value,"product readiness").map(item => {
    if (typeof item.product_id!=="string" || typeof item.product_name!=="string" || typeof item.overall_percent!=="number" ||
      typeof item.blocker_count!=="number" || typeof item.supplier_count!=="number" || !item.dimensions || typeof item.dimensions!=="object" ||
      !Array.isArray(item.blockers) || typeof item.evidence_state!=="string" || typeof item.certification_state!=="string" || typeof item.dpp_state!=="string") {
      throw new Error("Invalid product readiness row");
    }
    return item as unknown as ProductReadiness;
  });
}

export function parseActionItems(value: unknown): ActionItem[] {
  return objectArray(value,"Action Center").map(item => {
    if (typeof item.category!=="string" || !["BLOCKED","NEEDS_ACTION","READY"].includes(String(item.priority)) ||
      typeof item.title!=="string" || typeof item.explanation!=="string" || typeof item.entity_type!=="string" ||
      typeof item.entity_id!=="string" || typeof item.destination!=="string") throw new Error("Invalid Action Center row");
    return item as unknown as ActionItem;
  });
}

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
