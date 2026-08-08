import { describe, expect, it } from "vitest";
import { derivePermissions } from "../../lib/auth/usePermissions";

describe("derivePermissions", () => {
  it.each([
    ["admin", true, true, false],
    ["manager", false, true, false],
    ["viewer", false, false, true],
    [null, false, false, false],
  ] as const)("derives %s permissions", (role, isAdmin, canEdit, isViewer) => {
    expect(derivePermissions(role)).toEqual({ role, isAdmin, canEdit, isViewer });
  });
});
