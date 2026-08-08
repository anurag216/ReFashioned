BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(46);

-- Stable fixture identities and tenants. Fixture setup runs as postgres; every
-- authorization assertion below switches to the real API roles so RLS executes.
INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.invalid'),
 ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager-a@test.invalid'),
 ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-a@test.invalid'),
 ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@test.invalid'),
 ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'new@test.invalid'),
 ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@test.invalid');
INSERT INTO public.profiles (id, email) SELECT id, email FROM auth.users WHERE email LIKE '%@test.invalid';
INSERT INTO public.organizations (id, name) VALUES
 ('10000000-0000-0000-0000-000000000001', 'Tenant A'),
 ('10000000-0000-0000-0000-000000000002', 'Tenant B');
INSERT INTO public.organization_members (id, organization_id, profile_id, role) VALUES
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
 ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'manager'),
 ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'viewer'),
 ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'admin');
INSERT INTO public.products (id, organization_id, name, status) VALUES
 ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A published', 'published'),
 ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'B draft', 'draft');
INSERT INTO public.product_materials (id, product_id, material_name) VALUES
 ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Cotton');
INSERT INTO public.suppliers (id, organization_id, name) VALUES
 ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Supplier A'),
 ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Supplier B');
INSERT INTO public.supplier_contacts (id, supplier_id, email) VALUES
 ('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'contact@test.invalid');
INSERT INTO public.lifecycle_stages (id, organization_id, product_id, supplier_id, stage_name) VALUES
 ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Sourcing');
INSERT INTO public.digital_product_passports (id, organization_id, product_id, public_slug, is_published) VALUES
 ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'published-a', true);

SELECT ok((
  SELECT count(*) = 15 AND bool_and(c.relrowsecurity)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = ANY (ARRAY[
    'audit_events','audit_logs','certifications','compliance_reports','data_requests',
    'digital_product_passports','evidence_uploads','lifecycle_stages','organization_members',
    'organizations','product_materials','products','supplier_contacts','supplier_invites','suppliers'
  ])
), 'all tenant tables have RLS enabled');

SET LOCAL ROLE anon;
SELECT is((SELECT count(*) FROM public.organizations), 0::bigint, 'anonymous cannot list organizations');
SELECT is((SELECT count(*) FROM public.organization_members), 0::bigint, 'anonymous cannot list memberships');
SELECT throws_ok($$SELECT count(*) FROM public.brands$$, '42501', NULL, 'anonymous cannot access legacy brands');
SELECT throws_ok($$SELECT count(*) FROM public.users$$, '42501', NULL, 'anonymous cannot access legacy users');
SELECT is((SELECT count(*) FROM public.digital_product_passports WHERE public_slug='published-a'), 1::bigint, 'anonymous can read published DPPs');
SELECT is((SELECT count(*) FROM public.products WHERE id='30000000-0000-0000-0000-000000000001'), 1::bigint, 'anonymous can read published products');
SELECT is((SELECT count(*) FROM public.lifecycle_stages WHERE id='50000000-0000-0000-0000-000000000001'), 1::bigint, 'anonymous can read published stages');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.products), 1::bigint, 'viewer reads only own tenant products');
SELECT throws_ok($$INSERT INTO public.organizations (name) VALUES ('Direct organization')$$, '42501', NULL, 'authenticated direct organization insert is denied');
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id, profile_id, role) VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','viewer')$$, '42501', NULL, 'user cannot self-join another tenant');
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id, profile_id, role) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','admin')$$, '42501', NULL, 'viewer cannot assign admin');
SELECT throws_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000001','viewer insert')$$, '42501', NULL, 'viewer cannot insert product');
-- Keep data-modifying CTEs at the top level of the SQL passed to is_empty().
-- Nesting one inside SELECT is(...) is invalid PostgreSQL syntax.
SELECT is_empty(
  $$WITH changed AS (
      UPDATE public.products
      SET name = 'viewer update'
      WHERE id = '30000000-0000-0000-0000-000000000001'
      RETURNING 1
    )
    SELECT * FROM changed$$,
  'viewer cannot update product'
);
SELECT is_empty(
  $$WITH changed AS (
      DELETE FROM public.products
      WHERE id = '30000000-0000-0000-0000-000000000001'
      RETURNING 1
    )
    SELECT * FROM changed$$,
  'viewer cannot delete product'
);
SELECT throws_ok($$INSERT INTO public.supplier_invites (organization_id,email,token) VALUES ('10000000-0000-0000-0000-000000000001','viewer@test.invalid','viewer-token')$$, '42501', NULL, 'viewer cannot manage supplier invitations');
SELECT throws_ok($$SELECT count(*) FROM public.brands$$, '42501', NULL, 'unrelated authenticated user cannot access legacy brands');
SELECT throws_ok($$SELECT count(*) FROM public.users$$, '42501', NULL, 'unrelated authenticated user cannot access legacy users');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000001','manager product')$$, 'manager inserts product');
SELECT lives_ok($$UPDATE public.products SET name='manager updated' WHERE name='manager product'$$, 'manager updates product');
SELECT is_empty(
  $$WITH changed AS (
      DELETE FROM public.products
      WHERE name = 'manager updated'
      RETURNING 1
    )
    SELECT * FROM changed$$,
  'manager cannot delete product'
);
SELECT is_empty(
  $$WITH changed AS (
      UPDATE public.organizations
      SET name = 'manager org'
      WHERE id = '10000000-0000-0000-0000-000000000001'
      RETURNING 1
    )
    SELECT * FROM changed$$,
  'manager cannot update organization'
);
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id,profile_id,role) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','viewer')$$, '42501', NULL, 'manager cannot manage memberships');
SELECT throws_ok($$UPDATE public.products SET organization_id='10000000-0000-0000-0000-000000000002' WHERE id='30000000-0000-0000-0000-000000000001'$$, '42501', NULL, 'update cannot move a record to another tenant');
SELECT throws_ok($$INSERT INTO public.supplier_invites (organization_id,email,token) VALUES ('10000000-0000-0000-0000-000000000001','manager@test.invalid','manager-token')$$, '42501', NULL, 'manager cannot manage supplier invitations');
SELECT throws_ok($$INSERT INTO public.audit_logs (organization_id,profile_id,action,entity_type,entity_name) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','forged','product','A')$$, '42501', NULL, 'audit actor forgery is rejected');
SELECT throws_ok($$INSERT INTO public.audit_logs (organization_id,profile_id,action,entity_type,entity_name) VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','cross-tenant','product','B')$$, '42501', NULL, 'cross-tenant audit insert is rejected');
SELECT throws_ok($$UPDATE public.product_materials SET product_id='30000000-0000-0000-0000-000000000002' WHERE id='31000000-0000-0000-0000-000000000001'$$, '42501', NULL, 'product material cannot be reassigned across tenants');
SELECT throws_ok($$UPDATE public.supplier_contacts SET supplier_id='40000000-0000-0000-0000-000000000002' WHERE id='41000000-0000-0000-0000-000000000001'$$, '42501', NULL, 'supplier contact cannot be reassigned across tenants');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000001','admin product')$$, 'admin manages permitted tenant records');
SELECT lives_ok($$UPDATE public.organizations SET name='Tenant A updated' WHERE id='10000000-0000-0000-0000-000000000001'$$, 'admin updates organization settings');
SELECT lives_ok($$INSERT INTO public.organization_members (id,organization_id,profile_id,role) VALUES ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','manager')$$, 'admin adds a non-final membership');
SELECT lives_ok($$UPDATE public.organization_members SET role='viewer' WHERE id='20000000-0000-0000-0000-000000000006'$$, 'admin updates a non-final membership');
SELECT lives_ok($$DELETE FROM public.organization_members WHERE id='20000000-0000-0000-0000-000000000006'$$, 'admin removes a non-final membership');
SELECT lives_ok($$INSERT INTO public.supplier_invites (organization_id,supplier_id,email,token) VALUES ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','invite@test.invalid','admin-token'); UPDATE public.supplier_invites SET status='sent' WHERE token='admin-token'; DELETE FROM public.supplier_invites WHERE token='admin-token'$$, 'admin manages supplier invitations');
SELECT throws_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000002','cross tenant')$$, '42501', NULL, 'admin cannot affect another tenant');
SELECT throws_ok($$UPDATE public.organization_members SET role='viewer' WHERE id='20000000-0000-0000-0000-000000000001'$$, 'P0001', 'cannot remove or demote the final organization admin', 'final admin cannot be demoted');
SELECT throws_ok($$DELETE FROM public.organization_members WHERE id='20000000-0000-0000-0000-000000000001'$$, 'P0001', 'cannot remove or demote the final organization admin', 'final admin cannot be deleted');
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id,profile_id,role) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','owner')$$, 'invalid roles are rejected');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id,profile_id,role) VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','viewer')$$, '23505', 'duplicate key value violates unique constraint "organization_members_profile_id_key"', 'Tenant B admin cannot add a profile that already belongs to Tenant A');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_organization_with_admin(' New Tenant ')$$, 'onboarding RPC succeeds atomically');
SELECT is((SELECT count(*) FROM public.organization_members WHERE profile_id='00000000-0000-0000-0000-000000000005' AND role='admin'), 1::bigint, 'RPC creates exactly one admin membership');
SELECT throws_ok($$SELECT public.create_organization_with_admin('Second Tenant')$$, '23505', 'user already belongs to an organization', 'RPC rejects second organization');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.create_organization_with_admin('Anonymous Tenant')$$, '42501', NULL, 'anonymous cannot execute onboarding RPC');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT lives_ok($$DELETE FROM public.organizations WHERE id='10000000-0000-0000-0000-000000000002'$$, 'service-role organization deletion cascades without final-admin rejection');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.organization_members WHERE organization_id='10000000-0000-0000-0000-000000000002'), 0::bigint, 'organization cascade removes its memberships');

SELECT * FROM finish();
ROLLBACK;
