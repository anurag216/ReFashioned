import { describe,expect,it } from "vitest";
import { formatOperationalState,readinessCsv,type ProductReadiness } from "../../lib/readiness";

const row:ProductReadiness={product_id:"p1",product_name:'Cotton, "Tee"',overall_percent:75,blocker_count:1,supplier_count:2,evidence_state:"pending_review",certification_state:"expiring_soon",dpp_state:"republish_needed",dimensions:{},blockers:["Evidence required"]};

describe("readiness presentation",()=>{
  it("formats certification and DPP states truthfully",()=>{
    expect(formatOperationalState("expiring_soon")).toBe("Expiring soon");
    expect(formatOperationalState("republish_needed")).toBe("Republish recommended");
    expect(formatOperationalState("pending_review")).toBe("Pending review");
  });
  it("exports the same live readiness fields with valid escaping",()=>{
    const csv=readinessCsv([row]);
    expect(csv).toContain("Product,Readiness %,Blocker count,Supplier count,Evidence state,Certification state,DPP state");
    expect(csv).toContain('"Cotton, ""Tee""",75,1,2,Pending review,Expiring soon,Republish recommended');
  });
  it("does not synthesize rows for an empty organization",()=>expect(readinessCsv([]).split("\n")).toHaveLength(1));
});
