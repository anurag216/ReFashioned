BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Two tenants, three internal roles, and one supplier-only identity.
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('a1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ready-admin-a@test.invalid'),
 ('a1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ready-manager-a@test.invalid'),
 ('a1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ready-viewer-a@test.invalid'),
 ('a1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ready-admin-b@test.invalid'),
 ('a1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ready-supplier@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'a1000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('a2000000-0000-4000-8000-000000000001','Readiness tenant A'),
 ('a2000000-0000-4000-8000-000000000002','Readiness tenant B');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','admin'),
 ('a3000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','manager'),
 ('a3000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','viewer'),
 ('a3000000-0000-4000-8000-000000000004','a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000004','admin');
INSERT INTO public.suppliers(id,organization_id,name,status) VALUES
 ('a6000000-0000-4000-8000-000000000009','a2000000-0000-4000-8000-000000000001','Supplier-only identity company','active');
INSERT INTO public.supplier_contacts(id,supplier_id,name,email) VALUES
 ('a6100000-0000-4000-8000-000000000009','a6000000-0000-4000-8000-000000000009','Supplier identity','ready-supplier@test.invalid');
INSERT INTO public.supplier_access_memberships(id,organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES
 ('a6200000-0000-4000-8000-000000000009','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000009','a6100000-0000-4000-8000-000000000009','a1000000-0000-4000-8000-000000000005',true);
INSERT INTO public.products(id,organization_id,name,sku,status) VALUES
 ('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Incomplete readiness product','READY-A','draft'),
 ('a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','Tenant B private product','READY-B','draft');

SELECT plan(60);
SELECT has_function('public','get_organization_product_readiness',ARRAY[]::text[],'product readiness RPC exists');
SELECT has_function('public','get_organization_action_center',ARRAY[]::text[],'Action Center RPC exists');
SELECT ok((SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid='public.get_organization_product_readiness()'::regprocedure),'readiness is security definer');
SELECT ok((SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_catalog.pg_proc WHERE oid='public.get_organization_product_readiness()'::regprocedure),'readiness fixes pg_catalog search path');
SELECT ok((SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid='public.get_organization_action_center()'::regprocedure),'Action Center is security definer');
SELECT ok((SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_catalog.pg_proc WHERE oid='public.get_organization_action_center()'::regprocedure),'Action Center fixes pg_catalog search path');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl WHERE p.oid='public.get_organization_product_readiness()'::regprocedure AND acl.grantee=0 AND acl.privilege_type='EXECUTE'),'PUBLIC cannot execute readiness');
SELECT ok(NOT has_function_privilege('anon','public.get_organization_product_readiness()','EXECUTE'),'anon cannot execute readiness');
SELECT ok(has_function_privilege('authenticated','public.get_organization_product_readiness()','EXECUTE'),'authenticated can execute readiness');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl WHERE p.oid='public.get_organization_action_center()'::regprocedure AND acl.grantee=0 AND acl.privilege_type='EXECUTE'),'PUBLIC cannot execute Action Center');
SELECT ok(NOT has_function_privilege('anon','public.get_organization_action_center()','EXECUTE'),'anon cannot execute Action Center');
SELECT ok(has_function_privilege('authenticated','public.get_organization_action_center()','EXECUTE'),'authenticated can execute Action Center');

SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
SELECT is(jsonb_array_length(public.get_organization_product_readiness()),1,'Tenant A admin sees one Tenant A product');
SELECT is(public.get_organization_product_readiness()->0->>'product_name','Incomplete readiness product','Tenant A admin sees only own product');
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
SELECT is(jsonb_array_length(public.get_organization_product_readiness()),1,'Tenant A manager can read readiness');
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
SELECT is(jsonb_array_length(public.get_organization_product_readiness()),1,'Tenant A viewer can read readiness');
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
SELECT is(public.get_organization_product_readiness()->0->>'product_name','Tenant B private product','Tenant B cannot see Tenant A readiness');
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000005',true);
SELECT throws_ok($$SELECT public.get_organization_product_readiness()$$,'42501','active organization membership required','supplier-only identity cannot call internal readiness');
SELECT set_config('request.jwt.claim.sub','',true);
SELECT throws_ok($$SELECT public.get_organization_product_readiness()$$,'28000','authentication required','unauthenticated identity cannot call readiness');

SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'core_product'->>'complete')::boolean,true,'valid name and SKU complete core product');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'materials'->>'percent')::int,0,'missing materials are incomplete');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'supply_chain'->>'percent')::int,0,'missing lifecycle is incomplete supply chain');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'evidence'->>'applicable')::boolean,false,'evidence is not applicable without stages');
SELECT is(public.get_organization_product_readiness()->0->>'dpp_state','draft','product without lifecycle is not ready to publish');
SELECT is((public.get_organization_product_readiness()->0->>'overall_percent')::int,(100*2/4)::int,'initial percentage follows equal applicable requirements');
SELECT ok((public.get_organization_product_readiness()->0->'blockers') ? 'Material composition must total 100%','material blocker is factual');
SELECT ok((public.get_organization_product_readiness()->0->'blockers') ? 'A supplier-linked lifecycle stage is required','supply-chain blocker is factual');
SELECT set_config('test.initial_readiness',public.get_organization_product_readiness()->0->>'overall_percent',true);

INSERT INTO public.product_materials(id,product_id,material_name,composition_percentage,certification_required)
 VALUES('a5000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','Organic cotton',100,false);
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'materials'->>'percent')::int,100,'valid composition completes materials');
SELECT ok((public.get_organization_product_readiness()->0->>'overall_percent')::int>current_setting('test.initial_readiness')::int,'material data increases readiness');
SELECT set_config('test.material_readiness',public.get_organization_product_readiness()->0->>'overall_percent',true);
INSERT INTO public.suppliers(id,organization_id,name,status) VALUES('a6000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Readiness supplier','active');
INSERT INTO public.lifecycle_stages(id,organization_id,product_id,supplier_id,stage_name,stage_order,co2_impact_kg,water_usage_l,flagged)
 VALUES('a7000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','Readiness stage',1,1,1,false);
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'supply_chain'->>'percent')::int,100,'supplier-linked stage completes supply chain');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'evidence'->>'applicable')::boolean,true,'stage makes evidence applicable');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'evidence'->>'percent')::int,0,'stage without evidence is not trusted');
SELECT is(public.get_organization_product_readiness()->0->>'evidence_state','missing','stage without evidence is missing rather than pending review');
SELECT is((public.get_organization_product_readiness()->0->>'overall_percent')::int,(100*4/5)::int,'stage changes denominator and completed requirements deterministically');

-- Each insert obeys the PR15 integrity state machine; rows are removed between states.
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,upload_expires_at)
 VALUES('a8000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','evidence/a8/1.pdf','certificate','upload_pending','a1000000-0000-4000-8000-000000000001','one.pdf','application/pdf',10,now()+interval '1 hour');
SELECT is(public.get_organization_product_readiness()->0->>'evidence_state','missing','upload pending remains missing until it reaches review');
DELETE FROM public.evidence_uploads WHERE id='a8000000-0000-4000-8000-000000000001';
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes)
 VALUES('a8000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','evidence/a8/2.pdf','certificate','quarantined','a1000000-0000-4000-8000-000000000001','two.pdf','application/pdf',10);
SELECT is(public.get_organization_product_readiness()->0->>'evidence_state','quarantined','quarantined evidence is not trusted');
DELETE FROM public.evidence_uploads WHERE id='a8000000-0000-4000-8000-000000000002';
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result)
 VALUES('a8000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','evidence/a8/3.pdf','certificate','pending_review','a1000000-0000-4000-8000-000000000001','three.pdf','application/pdf',10,repeat('a',64),'clean',now(),now(),'test','clean');
SELECT is(public.get_organization_product_readiness()->0->>'evidence_state','pending_review','clean evidence awaiting review is pending review');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'evidence'->>'percent')::int,0,'clean pending-review evidence is not verified');
DELETE FROM public.evidence_uploads WHERE id='a8000000-0000-4000-8000-000000000003';
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result,reviewed_by,reviewed_at,rejection_reason)
 VALUES('a8000000-0000-4000-8000-000000000004','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','evidence/a8/4.pdf','certificate','rejected','a1000000-0000-4000-8000-000000000001','four.pdf','application/pdf',10,repeat('b',64),'clean',now(),now(),'test','clean','a1000000-0000-4000-8000-000000000001',now(),'invalid document');
SELECT is(public.get_organization_product_readiness()->0->>'evidence_state','rejected','rejected evidence remains a blocker');
DELETE FROM public.evidence_uploads WHERE id='a8000000-0000-4000-8000-000000000004';
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,integrity_legacy_accepted,reviewed_by,reviewed_at)
 VALUES('a8000000-0000-4000-8000-000000000005','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','evidence/a8/5.pdf','certificate','approved','a1000000-0000-4000-8000-000000000001','five.pdf','application/pdf',10,true,'a1000000-0000-4000-8000-000000000001',now());
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'evidence'->>'percent')::int,0,'legacy approved evidence without scan or fingerprint is not trusted');
DELETE FROM public.evidence_uploads WHERE id='a8000000-0000-4000-8000-000000000005';
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result,reviewed_by,reviewed_at)
 VALUES('a8000000-0000-4000-8000-000000000006','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','evidence/a8/6.pdf','certificate','approved','a1000000-0000-4000-8000-000000000001','six.pdf','application/pdf',10,repeat('c',64),'clean',now(),now(),'test','clean','a1000000-0000-4000-8000-000000000001',now());
SELECT is(public.get_organization_product_readiness()->0->>'evidence_state','trusted','approved clean fingerprinted evidence is trusted');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'evidence'->>'percent')::int,100,'trusted evidence completes evidence dimension');

UPDATE public.product_materials SET certification_required=true WHERE id='a5000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'certification_state','missing','required certification without record is missing');
SELECT ok((public.get_organization_product_readiness()->0->'blockers') ? 'A required, current evidence-backed certification is missing','missing required certification is a blocker');
SELECT throws_ok($$INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status) VALUES('a9000000-0000-4000-8000-000000000009','a2000000-0000-4000-8000-000000000002','a6000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','Cross tenant',current_date+90,'verified')$$,'P0001','certification scope requires matching clean fingerprinted approved evidence','Tenant B certification cannot satisfy Tenant A product');
INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by)
 VALUES('a9000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','Current certification',current_date+60,'verified','a1000000-0000-4000-8000-000000000001');
SELECT is(public.get_organization_product_readiness()->0->>'certification_state','valid','current trusted certification is valid');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'certifications'->>'complete')::boolean,true,'valid certification completes dimension');
UPDATE public.certifications SET expiry_date=current_date+20 WHERE id='a9000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'certification_state','expiring_soon','current cert inside 30-day product reminder is expiring soon');
UPDATE public.certifications SET expiry_date=current_date-1 WHERE id='a9000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'certification_state','expired','expired-only certification is incomplete');
UPDATE public.certifications SET verification_status='revoked',revoked_at=now(),revoked_by='a1000000-0000-4000-8000-000000000001' WHERE id='a9000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'certification_state','revoked','revoked-only certification is incomplete');
INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by)
 VALUES('a9000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','Replacement certification',current_date+90,'verified','a1000000-0000-4000-8000-000000000001');
SELECT is(public.get_organization_product_readiness()->0->>'certification_state','valid','current valid certification takes precedence over historical revoked');
SELECT is((public.get_organization_product_readiness()->0->'dimensions'->'certifications'->>'complete')::boolean,true,'replacement certification remains complete');

SELECT is(public.get_organization_product_readiness()->0->>'dpp_state','ready_to_publish','valid lifecycle passes current application DPP gate');
UPDATE public.lifecycle_stages SET flagged=true WHERE id='a7000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'dpp_state','draft','flagged lifecycle is not publication eligible');
UPDATE public.lifecycle_stages SET flagged=false,co2_impact_kg=-1 WHERE id='a7000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'dpp_state','draft','negative CO2 blocks current DPP gate');
UPDATE public.lifecycle_stages SET co2_impact_kg=1,water_usage_l=-1 WHERE id='a7000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'dpp_state','draft','negative water blocks current DPP gate');
UPDATE public.lifecycle_stages SET water_usage_l=1 WHERE id='a7000000-0000-4000-8000-000000000001';
INSERT INTO public.digital_product_passports(organization_id,product_id,public_slug,is_published,published_at,public_payload,payload_version,payload_generated_at,payload_hash,updated_at)
 SELECT 'a2000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',repeat('a',64),true,now(),payload,2,now(),encode(extensions.digest(payload::text,'sha256'),'hex'),now()
 FROM (SELECT public.build_public_product_passport_payload('a4000000-0000-4000-8000-000000000001') payload) x;
SELECT is(public.get_organization_product_readiness()->0->>'dpp_state','published','unchanged published snapshot is published');
UPDATE public.products SET season='Changed after publication' WHERE id='a4000000-0000-4000-8000-000000000001';
SELECT is(public.get_organization_product_readiness()->0->>'dpp_state','republish_needed','changed snapshot recommends republish');

UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='a2000000-0000-4000-8000-000000000001';
SELECT throws_ok($$SELECT public.get_organization_product_readiness()$$,'42501','active organization membership required','suspended organization cannot read readiness');
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='a2000000-0000-4000-8000-000000000001';
SELECT throws_ok($$SELECT public.get_organization_action_center()$$,'42501','active organization membership required','deletion-requested organization cannot read Action Center');

SELECT * FROM finish();
ROLLBACK;
