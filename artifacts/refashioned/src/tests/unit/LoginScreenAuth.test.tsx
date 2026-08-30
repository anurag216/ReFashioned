import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../../LoginScreen.tsx", import.meta.url)), "utf8");

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
