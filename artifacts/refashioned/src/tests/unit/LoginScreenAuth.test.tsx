import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/LoginScreen.tsx"), "utf8");

describe("pilot authentication wiring", () => {
  it("offers Google OAuth through a fixed first-party callback", () => {
    expect(source).toContain('provider: "google"');
    expect(source).toContain('/auth/callback`');
    expect(source).toContain("Continue with Google");
  });

  it("sends password recovery to the dedicated reset screen", () => {
    expect(source).toContain("resetPasswordForEmail");
    expect(source).toContain('/auth/reset-password`');
  });
});
