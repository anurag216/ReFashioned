BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(22);

-- Stable fixture identities and tenants. Fixture setup runs as postgres; every
-- authorization assertion below switches to the real API roles so RLS executes.
INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.invalid'),
 ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager-a@test.invalid'),
 ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-a@test.invalid'),
 ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@test.invalid'),
 ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'new@test.invalid');
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
 ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A draft', 'draft'),
 ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'B draft', 'draft');

SET LOCAL ROLE anon;
SELECT is((SELECT count(*) FROM public.organizations), 0::bigint, 'anonymous cannot list organizations');
SELECT is((SELECT count(*) FROM public.organization_members), 0::bigint, 'anonymous cannot list memberships');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.products), 1::bigint, 'viewer reads only own tenant products');
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id, profile_id, role) VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','viewer')$$, '42501', NULL, 'user cannot self-join another tenant');
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id, profile_id, role) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','admin')$$, '42501', NULL, 'viewer cannot assign admin');
SELECT throws_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000001','viewer insert')$$, '42501', NULL, 'viewer cannot insert product');
SELECT is((WITH changed AS (UPDATE public.products SET name='viewer update' WHERE id='30000000-0000-0000-0000-000000000001' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'viewer cannot update product');
SELECT is((WITH changed AS (DELETE FROM public.products WHERE id='30000000-0000-0000-0000-000000000001' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'viewer cannot delete product');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000001','manager product')$$, 'manager inserts product');
SELECT lives_ok($$UPDATE public.products SET name='manager updated' WHERE name='manager product'$$, 'manager updates product');
SELECT is((WITH changed AS (UPDATE public.organizations SET name='manager org' WHERE id='10000000-0000-0000-0000-000000000001' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'manager cannot update organization');
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id,profile_id,role) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','viewer')$$, '42501', NULL, 'manager cannot manage memberships');
SELECT throws_ok($$UPDATE public.products SET organization_id='10000000-0000-0000-0000-000000000002' WHERE id='30000000-0000-0000-0000-000000000001'$$, '42501', NULL, 'update cannot move a record to another tenant');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000001','admin product')$$, 'admin manages permitted tenant records');
SELECT throws_ok($$INSERT INTO public.products (organization_id,name) VALUES ('10000000-0000-0000-0000-000000000002','cross tenant')$$, '42501', NULL, 'admin cannot affect another tenant');
SELECT throws_ok($$UPDATE public.organization_members SET role='viewer' WHERE id='20000000-0000-0000-0000-000000000001'$$, 'P0001', 'cannot remove or demote the final organization admin', 'final admin cannot be demoted');
SELECT throws_ok($$DELETE FROM public.organization_members WHERE id='20000000-0000-0000-0000-000000000001'$$, 'P0001', 'cannot remove or demote the final organization admin', 'final admin cannot be deleted');
SELECT throws_ok($$INSERT INTO public.organization_members (organization_id,profile_id,role) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','owner')$$, 'invalid roles are rejected');
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

SELECT * FROM finish();
ROLLBACK;
