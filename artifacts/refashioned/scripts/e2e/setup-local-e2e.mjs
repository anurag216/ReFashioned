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
  { id: "e2e10000-0000-4000-8000-000000000006", email: "logout-user@e2e.local", role: "viewer", organization_id: ORGANIZATIONS.a },
];
const SUPPLIER_USER = {
  id: "e2e10000-0000-4000-8000-000000000005",
  email: "supplier-user@e2e.local",
};
const TEAM_MEMBER_USER = {
  id: "e2e10000-0000-4000-8000-000000000007",
  email: "team-manager@e2e.local",
};
const PRODUCT_A_ID = "e2e30000-0000-4000-8000-000000000001";
const SUPPLIER_A_ID = "e2e40000-0000-4000-8000-000000000001";
const LIFECYCLE_STAGE_ID = "e2e50000-0000-4000-8000-000000000001";
const DPP_TRUST_PRODUCT_ID = "e2e30000-0000-4000-8000-000000000003";
const DPP_TRUST_SUPPLIER_ID = "e2e40000-0000-4000-8000-000000000003";
const DPP_TRUST_STAGE_ID = "e2e50000-0000-4000-8000-000000000003";
const DPP_TRUST_EVIDENCE_ID = "e2e60000-0000-4000-8000-000000000003";

function assertOk(error, operation) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

const { data: listed, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
assertOk(listError, "list local auth users");

for (const fixture of [...USERS, SUPPLIER_USER, TEAM_MEMBER_USER]) {
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

assertOk((await client.from("profiles").upsert({
  id: TEAM_MEMBER_USER.id,
  email: TEAM_MEMBER_USER.email,
  full_name: "E2E Invited Team Manager",
  role: "sustainability_manager",
})).error, "upsert invited team profile");

assertOk((await client.from("organization_members").upsert(USERS.map((user, index) => ({
  id: `e2e20000-0000-4000-8000-00000000000${index + 1}`,
  profile_id: user.id,
  organization_id: user.organization_id,
  role: user.role,
})), { onConflict: "organization_id,profile_id" })).error, "upsert memberships");

// This dedicated identity starts authenticated but unauthorized. The browser
// lifecycle must create its membership by redeeming a real team invitation.
assertOk((await client.from("organization_members").delete().eq("profile_id", TEAM_MEMBER_USER.id)).error, "clear invited team membership");
assertOk((await client.from("supplier_access_memberships").delete().eq("profile_id", TEAM_MEMBER_USER.id)).error, "clear invited team supplier access");
assertOk((await client.from("organization_member_invites").delete().eq("email", TEAM_MEMBER_USER.email)).error, "clear invited team invitations");

assertOk((await client.from("products").upsert([
  { id: PRODUCT_A_ID, organization_id: ORGANIZATIONS.a, name: "Tenant A Product", sku: "TENANT-A", season: "Evergreen", status: "draft" },
  { id: "e2e30000-0000-4000-8000-000000000002", organization_id: ORGANIZATIONS.b, name: "Tenant B Secret Product", sku: "TENANT-B", season: "Evergreen", status: "draft" },
  { id: DPP_TRUST_PRODUCT_ID, organization_id: ORGANIZATIONS.a, name: "DPP Certification Trust Product", sku: "DPP-TRUST", season: "Evergreen", status: "draft" },
])).error, "upsert products");

assertOk((await client.from("suppliers").upsert({
  id: SUPPLIER_A_ID,
  organization_id: ORGANIZATIONS.a,
  name: "Tenant A Supplier",
  location: "Local E2E",
  tier: 1,
  status: "not-invited",
  contact_name: "E2E Contact",
})).error, "upsert supplier");

assertOk((await client.from("suppliers").upsert({
  id: DPP_TRUST_SUPPLIER_ID,
  organization_id: ORGANIZATIONS.a,
  name: "DPP Certification Trust Supplier",
  location: "Local E2E",
  tier: 1,
  status: "active",
  contact_name: "DPP Trust Contact",
})).error, "upsert DPP certification trust supplier");

// This identity deliberately starts outside every tenant and supplier. The UI
// invitation redemption is responsible for creating its only authorization.
assertOk((await client.from("organization_members").delete().eq("profile_id", SUPPLIER_USER.id)).error, "clear external supplier organization memberships");
assertOk((await client.from("supplier_access_memberships").delete().eq("profile_id", SUPPLIER_USER.id)).error, "clear external supplier access");
assertOk((await client.from("supplier_invites").delete().eq("email", SUPPLIER_USER.email)).error, "clear external supplier invitations");
assertOk((await client.from("evidence_uploads").delete().eq("lifecycle_stage_id", LIFECYCLE_STAGE_ID)).error, "clear supplier lifecycle evidence");

assertOk((await client.from("lifecycle_stages").upsert({
  id: LIFECYCLE_STAGE_ID,
  organization_id: ORGANIZATIONS.a,
  product_id: PRODUCT_A_ID,
  supplier_id: SUPPLIER_A_ID,
  stage_name: "E2E Material Production",
  stage_order: 1,
})).error, "upsert supplier evidence lifecycle stage");

// This fixture is independent from the destructive supplier lifecycle test.
// The browser performs review, certification creation, publication, and
// revocation; setup supplies only a real pending-review evidence row.
assertOk((await client.from("digital_product_passports").delete().eq("product_id", DPP_TRUST_PRODUCT_ID)).error, "clear DPP certification trust passport");
assertOk((await client.from("certifications").delete().eq("evidence_id", DPP_TRUST_EVIDENCE_ID)).error, "clear DPP certification trust certifications");
assertOk((await client.from("evidence_uploads").delete().eq("id", DPP_TRUST_EVIDENCE_ID)).error, "clear DPP certification trust evidence");
assertOk((await client.from("lifecycle_stages").upsert({
  id: DPP_TRUST_STAGE_ID,
  organization_id: ORGANIZATIONS.a,
  product_id: DPP_TRUST_PRODUCT_ID,
  supplier_id: DPP_TRUST_SUPPLIER_ID,
  stage_name: "DPP Certification Trust Stage",
  subtitle: "Dedicated certification disclosure fixture",
  stage_order: 1,
  co2_impact_kg: 1,
  water_usage_l: 1,
  flagged: false,
})).error, "upsert DPP certification trust stage");
assertOk((await client.from("evidence_uploads").insert({
  id: DPP_TRUST_EVIDENCE_ID,
  organization_id: ORGANIZATIONS.a,
  supplier_id: DPP_TRUST_SUPPLIER_ID,
  lifecycle_stage_id: DPP_TRUST_STAGE_ID,
  storage_bucket: "compliance_docs",
  storage_path: `evidence/${DPP_TRUST_EVIDENCE_ID}/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.pdf`,
  document_type: "certificate",
  status: "pending_review",
  content_sha256: "d".repeat(64),
  scan_status: "clean",
  scan_started_at: new Date().toISOString(),
  scan_completed_at: new Date().toISOString(),
  scan_engine: "deterministic-local-fixture",
  scan_result: "clean",
  uploaded_by: USERS[0].id,
  uploaded_at: new Date().toISOString(),
  original_filename: "dpp-certification-trust.pdf",
  mime_type: "application/pdf",
  size_bytes: 100,
})).error, "insert DPP certification trust pending evidence");

const [stageResult, productResult, supplierResult, organizationResult] = await Promise.all([
  client.from("lifecycle_stages").select("id,organization_id,product_id,supplier_id,stage_name").eq("id", LIFECYCLE_STAGE_ID).single(),
  client.from("products").select("id,organization_id,name,status").eq("id", PRODUCT_A_ID).single(),
  client.from("suppliers").select("id,organization_id,name").eq("id", SUPPLIER_A_ID).single(),
  client.from("organizations").select("id,name").eq("id", ORGANIZATIONS.a).single(),
]);
assertOk(stageResult.error, "verify supplier evidence lifecycle stage");
assertOk(productResult.error, "verify supplier evidence product");
assertOk(supplierResult.error, "verify supplier evidence supplier");
assertOk(organizationResult.error, "verify supplier evidence organization");

const fixtureIsConsistent =
  stageResult.data.id === LIFECYCLE_STAGE_ID &&
  stageResult.data.organization_id === ORGANIZATIONS.a &&
  stageResult.data.product_id === PRODUCT_A_ID &&
  stageResult.data.supplier_id === SUPPLIER_A_ID &&
  stageResult.data.stage_name === "E2E Material Production" &&
  productResult.data.id === PRODUCT_A_ID &&
  productResult.data.organization_id === ORGANIZATIONS.a &&
  productResult.data.name === "Tenant A Product" &&
  productResult.data.status !== "archived" &&
  supplierResult.data.id === SUPPLIER_A_ID &&
  supplierResult.data.organization_id === ORGANIZATIONS.a &&
  supplierResult.data.name === "Tenant A Supplier" &&
  organizationResult.data.id === ORGANIZATIONS.a &&
  organizationResult.data.name === "Tenant A";
if (!fixtureIsConsistent) throw new Error("supplier evidence fixture relationships are inconsistent");

console.log("Local E2E fixtures are ready.");
