const REQUIRED_VARIABLES = [
  "PLAYWRIGHT_ADMIN_EMAIL",
  "PLAYWRIGHT_ADMIN_PASSWORD",
  "PLAYWRIGHT_BASE_URL",
] as const;

export function requirePlaywrightAuthEnvironment() {
  const missing = REQUIRED_VARIABLES.filter(name => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required Playwright environment variables: ${missing.join(", ")}`);
  }

  return {
    adminEmail: process.env.PLAYWRIGHT_ADMIN_EMAIL!,
    adminPassword: process.env.PLAYWRIGHT_ADMIN_PASSWORD!,
    baseUrl: process.env.PLAYWRIGHT_BASE_URL!,
  };
}
