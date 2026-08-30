import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/main.tsx"), "utf8");

describe("production auth entry routes", () => {
  it("routes password recovery outside the authenticated app shell", () => {
    expect(source).toContain('pathname === "/auth/reset-password"');
    expect(source).toContain("<ResetPassword />");
  });

  it("routes OAuth completion outside the authenticated app shell", () => {
    expect(source).toContain('pathname === "/auth/callback"');
    expect(source).toContain("<AuthCallback />");
  });
});
