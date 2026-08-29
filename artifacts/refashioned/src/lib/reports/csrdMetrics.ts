export interface SustainabilityReport {
  organization: { id: string; name: string };
  generated_at: string;
  tracked_product_count: number;
  supplier_count: number;
  products_ready_count: number;
  readiness_blocker_count: number;
  material_complete_product_count: number;
  supply_chain_complete_product_count: number;
  lifecycle_stage_count: number;
  co2_observation_count: number;
  recorded_co2_kg: number | null;
  water_observation_count: number;
  recorded_water_l: number | null;
  trusted_evidence_count: number;
  pending_evidence_count: number;
  quarantined_evidence_count: number;
  rejected_evidence_count: number;
  valid_certification_count: number;
  published_dpp_count: number;
  dpps_needing_republish: number;
}

export const recorded = (value: number | null, unit: string) =>
  value === null ? "Not recorded" : `${value.toLocaleString()} ${unit}`;

export function reportStatus(report: SustainabilityReport) {
  if (report.tracked_product_count === 0 || report.readiness_blocker_count > 0) return "Data incomplete";
  if (report.pending_evidence_count + report.quarantined_evidence_count + report.rejected_evidence_count > 0) return "Evidence gaps remain";
  return "Data available";
}
