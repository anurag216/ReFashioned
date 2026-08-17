import { describe,expect,it } from "vitest";
import { actionDestination,certificationLabel,dimensionValue,evidenceLabel,isWorkspaceReadOnly,materialComposition,metricValue } from "../../lib/productWorkspace";

describe("product workspace presentation",()=>{
  it("formats readiness values without turning N/A into zero",()=>{
    expect(dimensionValue({applicable:false,percent:null})).toBe("N/A");
    expect(dimensionValue({applicable:true,percent:50})).toBe("50%");
    expect(dimensionValue({applicable:true,ready:false})).toBe("Blocked");
  });
  it("derives material remainder without fabricating a material",()=>{
    expect(materialComposition([{id:"1",material_name:"Cotton",composition_percentage:65,certification_required:false}])).toEqual({total:65,remainder:35,invalid:false});
    expect(materialComposition([{id:"1",material_name:"Legacy",composition_percentage:110,certification_required:false}])).toEqual({total:110,remainder:0,invalid:true});
  });
  it("does not render absent environmental measurements as zero",()=>expect(metricValue(null,"kg")).toBe("No data"));
  it("uses truthful evidence labels",()=>{
    expect(evidenceLabel("quarantined")).toBe("Quarantined");
    expect(evidenceLabel("pending_review")).toBe("Pending review");
    expect(evidenceLabel("trusted")).toBe("Approved / trusted");
  });
  it("uses the operational 30-day certification labels",()=>{
    const base={id:"1",name:"GOTS",verification_status:"verified",evidence_trusted:true};
    expect(certificationLabel({...base,expiry_date:"2026-09-01"},new Date("2026-08-17T00:00:00Z"))).toBe("Expiring soon");
    expect(certificationLabel({...base,expiry_date:"2026-08-01"},new Date("2026-08-17T00:00:00Z"))).toBe("Expired");
    expect(certificationLabel({...base,expiry_date:"2027-01-01"},new Date("2026-08-17T00:00:00Z"))).toBe("Valid");
  });
  it("deep-links blockers to the current product",()=>{
    expect(actionDestination("MISSING_EVIDENCE","p1")).toBe("/traceability?productId=p1");
    expect(actionDestination("DPP_NOT_READY","p1")).toBe("/passport?productId=p1");
    expect(actionDestination("MISSING_MATERIAL_DATA","p1")).toBe("#materials");
  });
  it("makes archived products read only",()=>{expect(isWorkspaceReadOnly("archived",true)).toBe(true);expect(isWorkspaceReadOnly("draft",true)).toBe(false);});
});
