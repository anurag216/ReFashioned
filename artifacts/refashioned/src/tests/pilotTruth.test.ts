import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

function runtimeFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = resolve(directory, name);
    if (name === "tests") return [];
    return statSync(path).isDirectory() ? runtimeFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("paying-pilot customer-facing truth", () => {
  const source = runtimeFiles(resolve(process.cwd(), "src")).map(path => readFileSync(path, "utf8")).join("\n");
  const forbidden = [
    "Emma Johnson", "+1(555) 123-4567", "Renews on Nov 15, 2023",
    "Your brand profile is public", "Live — updated May 2026", "SBTi 2025 target",
    "baseline2023", "Upgrade to Growth",
  ];

  it.each(forbidden)("does not ship demo claim %s", claim => expect(source).not.toContain(claim));
  it("does not ship unsupported audit or compliance claims", () => {
    expect(source).not.toMatch(/legally\s+defensible/i);
    expect(source).not.toMatch(/suitable\s+for[^.\n]{0,80}\b(?:csrd|espr|iso\s*14001)\b/i);
  });
  it("does not ship fabricated metric pairs", () => {
    expect(source).not.toMatch(/CO₂ Reduction[\s\S]{0,100}42%/);
    expect(source).not.toMatch(/Water Conservation[\s\S]{0,100}35%/);
    expect(source).not.toMatch(/Fair Labor[\s\S]{0,100}100%/);
  });
  it("does not directly mutate organization plans", () => {
    expect(source).not.toMatch(/from\(["']organizations["']\)[\s\S]{0,200}update\(\{[\s\S]{0,100}plan/);
  });
});
