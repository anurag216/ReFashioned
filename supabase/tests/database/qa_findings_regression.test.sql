BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(14);

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','qa-admin@test.invalid'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','qa-manager@test.invalid'),
 ('b1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','qa-viewer@test.invalid'),
 ('b1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','qa-other-admin@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE email LIKE 'qa-%@test.invalid';

INSERT INTO public.organizations(id,name) VALUES
 ('b2000000-0000-4000-8000-000000000001','QA regression tenant A'),
 ('b2000000-0000-4000-8000-000000000002','QA regression tenant B');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','admin'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','manager'),
 ('b3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','viewer'),
 ('b3000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000004','admin');

INSERT INTO public.suppliers(id,organization_id,name,status) VALUES
 ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','QA supplier','active');

INSERT INTO public.products(id,organization_id,name,sku,status) VALUES
 ('b5000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Incomplete publish product','QA-INCOMPLETE','draft'),
 ('b5000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','Ready publish product','QA-READY','draft'),
 ('b5000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','Evidence rollback product','QA-ROLLBACK','draft');

INSERT INTO public.product_materials(id,product_id,material_name,composition_percentage,certification_required) VALUES
 ('b6000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','Cotton',80,false),
 ('b6000000-0000-4000-8000-000000000002','b5000000-0000-4000-8000-000000000002','Cotton',100,false);

INSERT INTO public.lifecycle_stages(id,organization_id,product_id,supplier_id,stage_name,stage_order,co2_impact_kg,water_usage_l,flagged) VALUES
 ('b7000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Incomplete stage',1,1,1,false),
 ('b7000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000001','Ready stage',1,1,1,false),
 ('b7000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000001','Rollback empty stage',1,NULL,NULL,false),
 ('b7000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000001','Rollback evidence stage',2,NULL,NULL,false);

INSERT INTO public.evidence_uploads(
  id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,
  original_filename,mime_type,size_bytes,uploaded_at,reviewed_by,reviewed_at,
  content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result
) VALUES
 ('b8000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','evidence/b8/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf','certificate','approved','b1000000-0000-4000-8000-000000000001','incomplete.pdf','application/pdf',100,now(),'b1000000-0000-4000-8000-000000000001',now(),repeat('a',64),'clean',now(),now(),'test','clean'),
 ('b8000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000002','evidence/b8/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf','certificate','approved','b1000000-0000-4000-8000-000000000001','ready.pdf','application/pdf',100,now(),'b1000000-0000-4000-8000-000000000001',now(),repeat('b',64),'clean',now(),now(),'test','clean');

INSERT INTO public.evidence_uploads(
  id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,
  original_filename,mime_type,size_bytes,upload_expires_at
) VALUES
 ('b8000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000004','evidence/b8/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.pdf','certificate','upload_pending','b1000000-0000-4000-8000-000000000001','pending.pdf','application/pdf',100,now()+interval '15 minutes');

SELECT has_function('public','rollback_lifecycle_stage_without_evidence',ARRAY['uuid'],'compensating rollback RPC exists');
SELECT ok(NOT EXISTS(
  SELECT 1 FROM pg_catalog.pg_proc p
  CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
  WHERE p.oid='public.rollback_lifecycle_stage_without_evidence(uuid)'::regprocedure
    AND acl.grantee=0 AND acl.privilege_type='EXECUTE'
),'PUBLIC cannot execute rollback RPC');
SELECT ok(NOT has_function_privilege('anon','public.rollback_lifecycle_stage_without_evidence(uuid)','EXECUTE'),'anon cannot execute rollback RPC');
SELECT ok(has_function_privilege('authenticated','public.rollback_lifecycle_stage_without_evidence(uuid)','EXECUTE'),'authenticated can reach rollback RPC authorization boundary');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.publish_product_passport('b5000000-0000-4000-8000-000000000001')$$,
  'P0001',NULL,
  'admin cannot publish product while readiness blockers remain'
);
RESET ROLE;
SELECT is((SELECT count(*) FROM public.digital_product_passports WHERE product_id='b5000000-0000-4000-8000-000000000001'),0::bigint,'blocked publication creates no DPP row');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.publish_product_passport('b5000000-0000-4000-8000-000000000002')$$,
  'admin can publish a product with zero readiness blockers'
);
RESET ROLE;
SELECT ok((SELECT is_published FROM public.digital_product_passports WHERE product_id='b5000000-0000-4000-8000-000000000002'),'ready product is published');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.rollback_lifecycle_stage_without_evidence('b7000000-0000-4000-8000-000000000003')$$,
  'manager can compensate a newly-created stage with no evidence'
);
RESET ROLE;
SELECT is((SELECT count(*) FROM public.lifecycle_stages WHERE id='b7000000-0000-4000-8000-000000000003'),0::bigint,'compensated empty stage is removed');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.rollback_lifecycle_stage_without_evidence('b7000000-0000-4000-8000-000000000004')$$,
  'P0001','stage has evidence state and cannot be rolled back',
  'rollback refuses a stage once evidence state exists'
);
RESET ROLE;
SELECT is((SELECT count(*) FROM public.lifecycle_stages WHERE id='b7000000-0000-4000-8000-000000000004'),1::bigint,'stage with evidence state is preserved');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.rollback_lifecycle_stage_without_evidence('b7000000-0000-4000-8000-000000000004')$$,
  '42501','not authorized',
  'viewer cannot use rollback RPC'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000004',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.rollback_lifecycle_stage_without_evidence('b7000000-0000-4000-8000-000000000004')$$,
  '42501','not authorized',
  'cross-tenant admin cannot use rollback RPC'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
