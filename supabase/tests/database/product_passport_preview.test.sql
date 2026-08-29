BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(14);
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('aa000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','preview-admin@test.invalid'),
 ('aa000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','preview-manager@test.invalid'),
 ('aa000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','preview-viewer@test.invalid'),
 ('aa000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','preview-other@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE email LIKE 'preview-%';
INSERT INTO public.organizations(id,name) VALUES ('ab000000-0000-0000-0000-000000000001','Preview A'),('ab000000-0000-0000-0000-000000000002','Preview B');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
 ('ab000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','admin'),('ab000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000002','manager'),('ab000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000003','viewer'),('ab000000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000004','admin');
INSERT INTO public.products(id,organization_id,name) VALUES ('ac000000-0000-0000-0000-000000000001','ab000000-0000-0000-0000-000000000001','Preview Product');
SELECT has_function('public','get_product_passport_preview',ARRAY['uuid'],'preview RPC exists');
SELECT function_privs_are('public','get_product_passport_preview',ARRAY['uuid'],'authenticated',ARRAY['EXECUTE'],'only authenticated can execute preview');
SET LOCAL ROLE anon; SELECT throws_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'42501',NULL,'anonymous denied by API grant'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'admin previews own product');
RESET ROLE;
SELECT is(public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001'),public.build_public_product_passport_payload('ac000000-0000-0000-0000-000000000001'),'preview delegates to authoritative builder');
SET LOCAL ROLE authenticated; SELECT ok(public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')::text !~ '(storage_path|supplier_contact|email|audit|evidence_id)','private evidence and supplier PII absent'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated; SELECT lives_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'manager previews own product'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000003',true); SET LOCAL ROLE authenticated; SELECT lives_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'viewer previews own product'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000004',true); SET LOCAL ROLE authenticated; SELECT throws_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'42501','not authorized','other tenant denied'); RESET ROLE;
UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='ab000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated; SELECT throws_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'42501','not authorized','suspended tenant denied'); RESET ROLE;
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='ab000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated; SELECT throws_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'42501','not authorized','deletion-requested tenant denied'); RESET ROLE;
UPDATE public.organizations SET lifecycle_status='tombstoned' WHERE id='ab000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated; SELECT throws_ok($$SELECT public.get_product_passport_preview('ac000000-0000-0000-0000-000000000001')$$,'42501','not authorized','tombstoned tenant denied'); RESET ROLE;
SELECT ok(NOT has_function_privilege('authenticated','public.build_public_product_passport_payload(uuid)','EXECUTE'),'builder remains private');
SELECT * FROM finish(); ROLLBACK;
