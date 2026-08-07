import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  contentCategories,
  filenameCategories,
  scanTrackedFiles,
} from "./secret-scanner.mjs";

describe("tracked secret scanner", () => {
  it("accepts safe source, examples, and legitimate media", () => {
    assert.deepEqual(filenameCategories(".env.example"), []);
    assert.deepEqual(
      filenameCategories("attached_assets/product-video.webm"),
      [],
    );
    assert.deepEqual(
      contentCategories(
        "const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;",
      ),
      [],
    );
    assert.deepEqual(contentCategories('placeholder="you@company.com"'), []);
  });

  it("detects prohibited generated and local filenames", () => {
    const cases = [
      [".env.local", "tracked environment file"],
      ["playwright/.auth/admin.json", "Playwright authentication state"],
      ["tests/storage-state.json", "browser storage-state JSON"],
      ["test-results/result.json", "generated test results"],
      ["playwright-report/index.html", "generated Playwright report"],
      ["blob-report/report.zip", "generated Playwright blob report"],
      ["output/trace.zip", "Playwright trace archive"],
      ["screenshots/failure.png", "generated screenshot"],
      ["videos/retry.webm", "generated video"],
    ];
    for (const [path, category] of cases)
      assert.ok(filenameCategories(path).includes(category), path);
  });

  it("detects every prohibited content category without returning matched values", () => {
    const representative = [
      ["Supabase auth storage-state key", "sb-project-auth-token"],
      ["serialized access token", '{"access_token":"secret-value"}'],
      ["serialized refresh token", '{"refresh_token":"secret-value"}'],
      ["JWT-like value", "eyJheader.payload.signature"],
      [
        "hardcoded Playwright/admin test email",
        'const ADMIN_EMAIL = "test@example.invalid"',
      ],
      [
        "hardcoded Playwright/admin test password",
        'const TEST_PASSWORD = "not-a-real-password"',
      ],
      ["mock access token", "mock-access-token"],
      ["mock refresh token", "mock-refresh-token"],
    ];
    for (const [category, content] of representative) {
      const categories = contentCategories(content);
      assert.ok(categories.includes(category), category);
      assert.ok(
        !categories.join(" ").includes(content),
        "scanner output must not contain matched content",
      );
    }
  });

  it("skips dependency lockfile content and only excludes scanner fixture files", () => {
    const paths = [
      "pnpm-lock.yaml",
      "scripts/secret-scanner.test.mjs",
      "src/application.ts",
    ];
    const findings = scanTrackedFiles(
      paths,
      () => '{"access_token":"secret-value"}',
    );
    assert.deepEqual(findings, [
      { path: "src/application.ts", category: "serialized access token" },
    ]);
  });
});
