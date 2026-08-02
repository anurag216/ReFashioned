import { describe, expect, it } from "vitest";
import { MATERIAL_FACTORS } from "../../lib/calculations/carbonFactors";

describe("MATERIAL_FACTORS", () => {
  it("exports the expected cotton emission factors", () => {
    expect(MATERIAL_FACTORS.organic_cotton).toMatchObject({
      label: "Organic Cotton",
      factor: 2.3,
    });

    expect(MATERIAL_FACTORS.conventional_cotton).toMatchObject({
      label: "Conventional Cotton",
      factor: 4.0,
    });
  });
});
