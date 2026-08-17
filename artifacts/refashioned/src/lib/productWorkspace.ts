import type { ReadinessDimension, ProductReadiness } from "./readiness";

export type WorkspaceMaterial = { id:string; material_name:string; composition_percentage:number; certification_required:boolean };
export type WorkspaceStage = { id:string; stage_name:string; stage_order:number|null; supplier_name:string|null; co2_impact_kg:number|null; water_usage_l:number|null; flagged:boolean; evidence_state:string };
export type WorkspaceCertification = { id:string; name:string; verification_status:string; expiry_date:string|null; evidence_trusted:boolean };
export type ProductWorkspace = {
  product:{id:string;name:string;sku:string|null;season:string|null;status:string};
  readiness:ProductReadiness|null;
  materials:WorkspaceMaterial[];
  lifecycle:WorkspaceStage[];
  certifications:WorkspaceCertification[];
};

export function parseProductWorkspace(value:unknown):ProductWorkspace {
  if (!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Product not found or access denied.");
  const row=value as ProductWorkspace;
  if (!row.product?.id || !Array.isArray(row.materials) || !Array.isArray(row.lifecycle) || !Array.isArray(row.certifications)) throw new Error("Invalid product workspace response.");
  return row;
}

export function dimensionValue(d:ReadinessDimension) {
  if (!d.applicable) return "N/A";
  if (d.percent!=null) return `${d.percent}%`;
  return d.ready ? "Ready" : "Blocked";
}

export function materialComposition(materials:WorkspaceMaterial[]) {
  const total=materials.reduce((sum,item)=>sum+Number(item.composition_percentage),0);
  return { total, remainder:Math.max(0,100-total), invalid:total>100 };
}

export function metricValue(value:number|null,unit:string) { return value==null ? "No data" : `${value} ${unit}`; }
export function evidenceLabel(value:string) { return ({missing:"No evidence",upload_pending:"Upload pending",quarantined:"Quarantined",pending_review:"Pending review",rejected:"Rejected",trusted:"Approved / trusted"} as Record<string,string>)[value] ?? value; }
export function certificationLabel(cert:WorkspaceCertification,today=new Date()) {
  if (cert.verification_status==="revoked") return "Revoked";
  if (!cert.expiry_date || cert.verification_status!=="verified" || !cert.evidence_trusted) return "Unverified";
  const days=(new Date(`${cert.expiry_date}T00:00:00Z`).getTime()-today.getTime())/86400000;
  return days<0 ? "Expired" : days<=30 ? "Expiring soon" : "Valid";
}

export function blockerDestination(blocker:string,productId:string) {
  const text=blocker.toLowerCase();
  if (text.includes("dpp")) return `/passport?productId=${productId}`;
  if (text.includes("supplier") || text.includes("lifecycle") || text.includes("evidence")) return `/traceability?productId=${productId}`;
  if (text.includes("material")) return "#materials";
  if (text.includes("certification")) return "#certifications";
  return "#product-details";
}

export function isWorkspaceReadOnly(status:string,canEdit:boolean) { return status==="archived" || !canEdit; }
