import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { recorded, reportStatus, type SustainabilityReport } from "../../lib/reports/csrdMetrics";

const base: SustainabilityReport = { organization:{id:"o",name:"Tenant"},generated_at:new Date().toISOString(),tracked_product_count:0,supplier_count:0,products_ready_count:0,readiness_blocker_count:0,material_complete_product_count:0,supply_chain_complete_product_count:0,lifecycle_stage_count:0,co2_observation_count:0,recorded_co2_kg:null,water_observation_count:0,recorded_water_l:null,trusted_evidence_count:0,pending_evidence_count:0,quarantined_evidence_count:0,rejected_evidence_count:0,valid_certification_count:0,published_dpp_count:0,dpps_needing_republish:0 };

describe("CSRD data-readiness truth boundaries",()=>{
  it("preserves missing and genuine zero semantics",()=>{
    expect(recorded(null,"kg CO₂e")).toBe("Not recorded");
    expect(recorded(0,"kg CO₂e")).toBe("0 kg CO₂e");
  });
  it("does not characterize an empty tenant as data available",()=>expect(reportStatus(base)).toBe("Data incomplete"));
  it("keeps known fictional customer claims out of runtime reporting",()=>{
    const runtime=["pages/CSRDReport.tsx","lib/reports/csrdMetrics.ts"].map(path=>readFileSync(`${process.cwd()}/src/${path}`,"utf8")).join("\n");
    for(const claim of ["EcoThread","Net Zero 2040","SBTi target","SA8000","100% audited","2,965 L / unit"]) expect(runtime).not.toContain(claim);
  });
});
