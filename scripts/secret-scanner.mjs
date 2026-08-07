const fixtureFiles = new Set([
  "scripts/secret-scanner.mjs",
  "scripts/secret-scanner.test.mjs",
]);

const contentPatterns = [
  [
    "Supabase auth storage-state key",
    new RegExp("sb-" + "[A-Za-z0-9_-]+-auth-token"),
  ],
  [
    "serialized access token",
    new RegExp(
      "[\"\\']access_" + "token[\"\\']\\s*:\\s*[\"\\'][^\"\\']+[\"\\']",
      "i",
    ),
  ],
  [
    "serialized refresh token",
    new RegExp(
      "[\"\\']refresh_" + "token[\"\\']\\s*:\\s*[\"\\'][^\"\\']+[\"\\']",
      "i",
    ),
  ],
  [
    "JWT-like value",
    new RegExp("ey" + "J[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+"),
  ],
  [
    "hardcoded Playwright/admin test email",
    new RegExp(
      "(?:const|let|var)\\s+(?:PLAYWRIGHT|ADMIN|TEST)[A-Z_]*EMAIL\\s*=\\s*[\"'][^\"'\\s@]+@[^\"'\\s@]+[\"']",
      "i",
    ),
  ],
  [
    "hardcoded Playwright/admin test password",
    new RegExp(
      "(?:const|let|var)\\s+(?:PLAYWRIGHT|ADMIN|TEST)[A-Z_]*PASSWORD\\s*=\\s*[\"'][^$\"'][^\"']*[\"']",
      "i",
    ),
  ],
  ["mock access token", new RegExp("mock[-_ ]?access[-_ ]?token", "i")],
  ["mock refresh token", new RegExp("mock[-_ ]?refresh[-_ ]?token", "i")],
];

function normalize(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function filenameCategories(inputPath) {
  const path = normalize(inputPath);
  const basename = path.split("/").at(-1);
  const categories = [];

  if (
    (basename === ".env" || basename?.startsWith(".env.")) &&
    basename !== ".env.example"
  ) {
    categories.push("tracked environment file");
  }
  if (
    /(^|\/)\.auth(\/|$)/.test(path) ||
    /(^|\/)playwright\/\.auth(\/|$)/.test(path)
  ) {
    categories.push("Playwright authentication state");
  }
  if (/(^|\/)(?:storage[-_.]?state|storageState)[^/]*\.json$/i.test(path)) {
    categories.push("browser storage-state JSON");
  }
  if (/(^|\/)test-results(\/|$)/.test(path))
    categories.push("generated test results");
  if (/(^|\/)playwright-report(\/|$)/.test(path))
    categories.push("generated Playwright report");
  if (/(^|\/)blob-report(\/|$)/.test(path))
    categories.push("generated Playwright blob report");
  if (/(^|\/)(?:trace[^/]*\.zip|[^/]*\.trace\.zip)$/i.test(path))
    categories.push("Playwright trace archive");
  if (
    /(^|\/)(?:screenshots?)(\/|$)/i.test(path) ||
    /^screenshot(?:[-_.][^/]*)?\.(?:png|jpe?g)$/i.test(basename ?? "")
  ) {
    categories.push("generated screenshot");
  }
  if (
    /(^|\/)(?:videos?)(\/|$)/i.test(path) ||
    /^video(?:[-_.][^/]*)?\.(?:webm|mp4)$/i.test(basename ?? "")
  ) {
    categories.push("generated video");
  }

  return categories;
}

export function contentCategories(content) {
  return contentPatterns
    .filter(([, pattern]) => pattern.test(content))
    .map(([category]) => category);
}

export function scanTrackedFiles(paths, readContent) {
  const findings = [];
  for (const inputPath of paths) {
    const path = normalize(inputPath);
    for (const category of filenameCategories(path))
      findings.push({ path, category });

    const isDependencyLockfile =
      /(^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(path);
    if (isDependencyLockfile || fixtureFiles.has(path)) continue;
    for (const category of contentCategories(readContent(path)))
      findings.push({ path, category });
  }
  return findings;
}
