import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_PASSWORD } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !E2E_PASSWORD) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and E2E_PASSWORD are required");
}

const url = new URL(SUPABASE_URL);
if (!(["127.0.0.1", "localhost"].includes(url.hostname))) {
  throw new Error(`Refusing to install E2E fixtures into non-local Supabase host: ${url.hostname}`);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORGANIZATIONS = {
  a: "e2e00000-0000-4000-8000-000000000001",
  b: "e2e00000-0000-4000-8000-000000000002",
};
const USERS = [
  { id: "e2e10000-0000-4000-8000-000000000001", email: "admin@e2e.local", role: "admin", organization_id: ORGANIZATIONS.a },
  { id: "e2e10000-0000-4000-8000-000000000002", email: "manager@e2e.local", role: "manager", organization_id: ORGANIZATIONS.a },
  { id: "e2e10000-0000-4000-8000-000000000003", email: "viewer@e2e.local", role: "viewer", organization_id: ORGANIZATIONS.a },
  { id: "e2e10000-0000-4000-8000-000000000004", email: "admin-b@e2e.local", role: "admin", organization_id: ORGANIZATIONS.b },
];
const SUPPLIER_USER = {
  id: "e2e10000-0000-4000-8000-000000000005",
  email: "supplier-user@e2e.local",
};
const LIFECYCLE_STAGE_ID = "e2e50000-0000-4000-8000-000000000001";

function assertOk(error, operation) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

const { data: listed, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
assertOk(listError, "list local auth users");

for (const fixture of [...USERS, SUPPLIER_USER]) {
  const existing = listed.users.find(user => user.email === fixture.email);
  if (existing) {
    const { error } = await client.auth.admin.updateUserById(existing.id, { password: E2E_PASSWORD, email_confirm: true });
    assertOk(error, `update ${fixture.email}`);
    fixture.id = existing.id;
  } else {
    const { data, error } = await client.auth.admin.createUser({
      id: fixture.id,
      email: fixture.email,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    assertOk(error, `create ${fixture.email}`);
    fixture.id = data.user.id;
  }
}

assertOk((await client.from("organizations").upsert([
  { id: ORGANIZATIONS.a, name: "Tenant A", plan: "starter" },
  { id: ORGANIZATIONS.b, name: "Tenant B", plan: "starter" },
])).error, "upsert organizations");

assertOk((await client.from("profiles").upsert(USERS.map(user => ({
  id: user.id,
  email: user.email,
  full_name: `E2E ${user.role}`,
  role: user.role === "manager" ? "sustainability_manager" : "brand_admin",
})))).error, "upsert profiles");

assertOk((await client.from("profiles").upsert({
  id: SUPPLIER_USER.id,
  email: SUPPLIER_USER.email,
  full_name: "E2E Supplier User",
  role: "brand_admin",
})).error, "upsert external supplier profile");

assertOk((await client.from("organization_members").upsert(USERS.map((user, index) => ({
  id: `e2e20000-0000-4000-8000-00000000000${index + 1}`,
  profile_id: user.id,
  organization_id: user.organization_id,
  role: user.role,
})), { onConflict: "organization_id,profile_id" })).error, "upsert memberships");

assertOk((await client.from("products").upsert([
  { id: "e2e30000-0000-4000-8000-000000000001", organization_id: ORGANIZATIONS.a, name: "Tenant A Product", sku: "TENANT-A", season: "Evergreen", status: "draft" },
  { id: "e2e30000-0000-4000-8000-000000000002", organization_id: ORGANIZATIONS.b, name: "Tenant B Secret Product", sku: "TENANT-B", season: "Evergreen", status: "draft" },
])).error, "upsert products");

assertOk((await client.from("suppliers").upsert({
  id: "e2e40000-0000-4000-8000-000000000001",
  organization_id: ORGANIZATIONS.a,
  name: "Tenant A Supplier",
  location: "Local E2E",
  tier: 1,
  status: "not-invited",
  contact_name: "E2E Contact",
})).error, "upsert supplier");

// This identity deliberately starts outside every tenant and supplier. The UI
// invitation redemption is responsible for creating its only authorization.
assertOk((await client.from("organization_members").delete().eq("profile_id", SUPPLIER_USER.id)).error, "clear external supplier organization memberships");
assertOk((await client.from("supplier_access_memberships").delete().eq("profile_id", SUPPLIER_USER.id)).error, "clear external supplier access");
assertOk((await client.from("supplier_invites").delete().eq("email", SUPPLIER_USER.email)).error, "clear external supplier invitations");
assertOk((await client.from("evidence_uploads").delete().eq("lifecycle_stage_id", LIFECYCLE_STAGE_ID)).error, "clear supplier lifecycle evidence");

assertOk((await client.from("lifecycle_stages").upsert({
  id: LIFECYCLE_STAGE_ID,
  organization_id: ORGANIZATIONS.a,
  product_id: "e2e30000-0000-4000-8000-000000000001",
  supplier_id: "e2e40000-0000-4000-8000-000000000001",
  stage_name: "E2E Material Production",
  stage_order: 1,
})).error, "upsert supplier evidence lifecycle stage");

console.log("Local E2E fixtures are ready.");
