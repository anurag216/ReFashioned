BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(87);

SELECT has_table('public','privacy_erasure_requests','privacy request state is server-owned');
SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid='public.privacy_erasure_requests'::regclass),'privacy requests enforce RLS');
SELECT has_function('public','request_personal_data_erasure',ARRAY[]::text[],'self-service request has no arbitrary subject parameter');
SELECT ok(position('pg_advisory_xact_lock' in pg_get_functiondef('public.request_personal_data_erasure()'::regprocedure))>0,'request serialization prevents concurrent open-row races');
SELECT ok(has_function_privilege('authenticated','public.request_personal_data_erasure()','EXECUTE'),'authenticated may request own erasure');
SELECT ok(NOT has_function_privilege('authenticated','private.prepare_personal_identity_erasure(uuid)','EXECUTE'),'authenticated cannot prepare erasure directly');
SELECT ok(NOT has_function_privilege('authenticated','private.complete_personal_identity_erasure(uuid)','EXECUTE'),'authenticated cannot complete erasure directly');
SELECT ok(NOT has_function_privilege('authenticated','private.purge_terminal_invitation_personal_data(timestamp with time zone)','EXECUTE'),'authenticated cannot purge invitation data directly');
SELECT ok(has_schema_privilege('authenticated','private','USAGE'),'Storage preflight retains authenticated private-schema usage');
SELECT ok(has_function_privilege('authenticated','private.current_actor_can_preflight_evidence_object(text,text)','EXECUTE'),'Storage upload preflight remains authenticated-callable');
SELECT ok(NOT has_function_privilege('authenticated','public.service_prepare_personal_identity_erasure(uuid)','EXECUTE'),'client cannot call service preparation wrapper');
SELECT ok(has_function_privilege('service_role','public.service_prepare_personal_identity_erasure(uuid)','EXECUTE'),'service role can call preparation wrapper');
SELECT ok(has_function_privilege('service_role','public.service_complete_personal_identity_erasure(uuid)','EXECUTE'),'service role can call completion wrapper');
SELECT ok(NOT has_function_privilege('authenticated','public.is_active_supplier_for(uuid,uuid)','EXECUTE'),'supplier implementation helper remains private');
SELECT col_is_null('public','audit_logs','profile_id','audit actor is nullable for erasure');
SELECT col_is_null('public','audit_events','actor_id','legacy audit actor is nullable for erasure');
SELECT col_is_null('public','evidence_uploads','uploaded_by','preserved evidence can lose uploader identity');
SELECT col_is_null('public','certifications','created_by','preserved certification can lose creator identity');
SELECT col_type_is('public','organizations','lifecycle_status','public.organization_lifecycle_status','tenant lifecycle is explicit');

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('d0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','privacy-admin@test.invalid'),
 ('d0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','privacy-member@test.invalid'),
 ('d0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','privacy-supplier@test.invalid'),
 ('d0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','privacy-other@test.invalid'),
 ('d0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','privacy-final@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'd0000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('d1000000-0000-0000-0000-000000000001','Privacy tenant'),('d1000000-0000-0000-0000-000000000002','Other tenant'),('d1000000-0000-0000-0000-000000000003','Final admin tenant');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
 ('d1000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','admin'),
 ('d1000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','viewer'),
 ('d1000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000004','admin'),
 ('d1000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000005','admin');
INSERT INTO public.products(id,organization_id,name,status) VALUES
 ('d2000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','Preserved product','draft'),
 ('d2000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000002','Cross tenant product','draft');
INSERT INTO public.suppliers(id,organization_id,name) VALUES
 ('d3000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','Preserved supplier'),
 ('d3000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000002','Other supplier');
INSERT INTO public.supplier_contacts(id,supplier_id,name,email) VALUES
 ('d4000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','Privacy Supplier','privacy-supplier@test.invalid'),
 ('d4000000-0000-0000-0000-000000000002','d3000000-0000-0000-0000-000000000002','Other Contact','other-contact@test.invalid');
INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES
 ('d1000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000003',true);
INSERT INTO public.audit_logs(id,organization_id,profile_id,action,entity_type,entity_name) VALUES
 ('d5000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','privacy_fixture','profile','non-personal-id');
INSERT INTO public.lifecycle_stages(id,organization_id,product_id,supplier_id,stage_name,stage_order) VALUES
 ('d8000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','Preserved stage',1);
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_bucket,storage_path,document_type,status,
 uploaded_by,uploaded_at,reviewed_by,reviewed_at,original_filename,mime_type,size_bytes,content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result)
VALUES('d8100000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d8000000-0000-0000-0000-000000000001',
 'compliance_docs','evidence/d8100000-0000-0000-0000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf','certificate','approved',
 'd0000000-0000-0000-0000-000000000002',now(),'d0000000-0000-0000-0000-000000000002',now(),'preserved.pdf','application/pdf',100,repeat('a',64),'clean',now(),now(),'privacy-fixture','clean');
INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by)
 VALUES('d8200000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d8100000-0000-0000-0000-000000000001','Preserved certification',current_date+30,'verified','d0000000-0000-0000-0000-000000000002');
INSERT INTO public.digital_product_passports(id,organization_id,product_id,public_slug,is_published,public_payload,payload_version,payload_generated_at,payload_hash)
 VALUES('d8300000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',repeat('d',64),false,'{}',2,now(),repeat('e',64));
SELECT throws_ok($$UPDATE public.evidence_uploads SET uploaded_by='d0000000-0000-0000-0000-000000000001' WHERE id='d8100000-0000-0000-0000-000000000001'$$,'P0001','evidence uploader attribution cannot be reassigned','historical uploader cannot be reassigned');
SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-000000000002","email":"privacy-member@test.invalid","role":"authenticated"}',true);
SELECT is(public.is_org_member('d1000000-0000-0000-0000-000000000001'),true,'active tenant authorizes existing member');
SELECT is(public.is_active_supplier_for('d0000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-000000000001'),true,'active tenant authorizes existing supplier');
UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='d1000000-0000-0000-0000-000000000001';
SELECT is(public.is_org_member('d1000000-0000-0000-0000-000000000001'),false,'suspension denies same member JWT');
SELECT is(public.is_active_supplier_for('d0000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-000000000001'),false,'suspension denies same supplier identity');
SELECT is((SELECT count(*) FROM public.organization_members WHERE organization_id='d1000000-0000-0000-0000-000000000001'),2::bigint,'suspension preserves membership rows');
SELECT is((SELECT count(*) FROM public.supplier_access_memberships WHERE organization_id='d1000000-0000-0000-0000-000000000001'),1::bigint,'suspension preserves supplier access rows');
SELECT is(public.current_actor_can_read_evidence_object('compliance_docs','evidence/d8100000-0000-0000-0000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf'),false,'suspension denies private evidence authorization');
SELECT is((SELECT count(*) FROM public.get_evidence_download_target('d8100000-0000-0000-0000-000000000001')),0::bigint,'suspension hides evidence download target');
UPDATE public.organizations SET lifecycle_status='active' WHERE id='d1000000-0000-0000-0000-000000000001';
SELECT is(public.is_org_member('d1000000-0000-0000-0000-000000000001'),true,'reactivation restores preserved member authorization');
SELECT is(public.is_active_supplier_for('d0000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-000000000001'),true,'reactivation restores preserved supplier authorization');

SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-000000000002","email":"privacy-member@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT set_config('test.member_erasure_request_id',(SELECT id::text FROM public.request_personal_data_erasure()),true);
SELECT is((SELECT id FROM public.request_personal_data_erasure()),current_setting('test.member_erasure_request_id')::uuid,'repeated request is idempotent');
SELECT is((SELECT count(*) FROM public.privacy_erasure_requests),1::bigint,'subject sees exactly one open request through RLS');
SELECT throws_ok($$SELECT public.service_prepare_personal_identity_erasure('d0000000-0000-0000-0000-000000000004')$$,'42501',NULL,'authenticated cannot erase another subject');
RESET ROLE;

SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
SELECT lives_ok($$SELECT public.service_prepare_personal_identity_erasure('d0000000-0000-0000-0000-000000000002')$$,'trusted preparation executes');
RESET ROLE;
SELECT is((SELECT status::text FROM public.privacy_erasure_requests WHERE id=current_setting('test.member_erasure_request_id')::uuid),'processing','request moves to processing');
SELECT is((SELECT count(*) FROM public.organization_members WHERE profile_id='d0000000-0000-0000-0000-000000000002'),0::bigint,'internal authorization is removed');
SELECT is(public.is_org_member('d1000000-0000-0000-0000-000000000001'),false,'unchanged subject JWT no longer authorizes tenant access');
SELECT is((SELECT count(*) FROM public.products WHERE id='d2000000-0000-0000-0000-000000000001'),1::bigint,'business product remains');
DELETE FROM auth.users WHERE id='d0000000-0000-0000-0000-000000000002';
SELECT is((SELECT count(*) FROM public.audit_logs WHERE id='d5000000-0000-0000-0000-000000000001'),1::bigint,'historical audit row survives profile deletion');
SELECT is((SELECT profile_id FROM public.audit_logs WHERE id='d5000000-0000-0000-0000-000000000001'),NULL::uuid,'historical audit actor becomes null');
SELECT is((SELECT count(*) FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),1::bigint,'historical evidence survives identity deletion');
SELECT is((SELECT uploaded_by FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),NULL::uuid,'evidence uploader becomes null');
SELECT is((SELECT reviewed_by FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),NULL::uuid,'evidence reviewer becomes null');
SELECT is((SELECT organization_id FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),'d1000000-0000-0000-0000-000000000001'::uuid,'evidence tenant remains unchanged');
SELECT is((SELECT supplier_id FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),'d3000000-0000-0000-0000-000000000001'::uuid,'evidence supplier remains unchanged');
SELECT is((SELECT lifecycle_stage_id FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),'d8000000-0000-0000-0000-000000000001'::uuid,'evidence lifecycle stage remains unchanged');
SELECT is((SELECT storage_bucket FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),'compliance_docs','evidence bucket remains unchanged');
SELECT like((SELECT storage_path FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),'evidence/d8100000-%','evidence storage path remains unchanged');
SELECT is((SELECT content_sha256 FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),repeat('a',64),'evidence fingerprint remains unchanged');
SELECT is((SELECT scan_status FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),'clean','evidence scan verdict remains unchanged');
SELECT is((SELECT status FROM public.evidence_uploads WHERE id='d8100000-0000-0000-0000-000000000001'),'approved','evidence review state remains unchanged');
SELECT is((SELECT count(*) FROM public.certifications WHERE id='d8200000-0000-0000-0000-000000000001'),1::bigint,'certification survives creator erasure');
SELECT is((SELECT created_by FROM public.certifications WHERE id='d8200000-0000-0000-0000-000000000001'),NULL::uuid,'certification creator becomes null');
SELECT is((SELECT evidence_id FROM public.certifications WHERE id='d8200000-0000-0000-0000-000000000001'),'d8100000-0000-0000-0000-000000000001'::uuid,'certification evidence relationship remains');
SELECT is((SELECT name FROM public.certifications WHERE id='d8200000-0000-0000-0000-000000000001'),'Preserved certification','certification name remains');
SELECT is((SELECT verification_status FROM public.certifications WHERE id='d8200000-0000-0000-0000-000000000001'),'verified','certification state remains');
SELECT is((SELECT expiry_date FROM public.certifications WHERE id='d8200000-0000-0000-0000-000000000001'),current_date+30,'certification expiry remains');
SELECT is((SELECT count(*) FROM public.organizations WHERE id='d1000000-0000-0000-0000-000000000001'),1::bigint,'organization business record remains');
SELECT is((SELECT count(*) FROM public.lifecycle_stages WHERE id='d8000000-0000-0000-0000-000000000001'),1::bigint,'lifecycle business record remains');
SELECT is((SELECT count(*) FROM public.digital_product_passports WHERE id='d8300000-0000-0000-0000-000000000001'),1::bigint,'DPP business record remains');
SELECT is((SELECT count(*) FROM public.suppliers WHERE id='d3000000-0000-0000-0000-000000000001'),1::bigint,'supplier business record remains after member erasure');
SET LOCAL ROLE service_role;
SELECT lives_ok(format('SELECT public.service_complete_personal_identity_erasure(%L)',current_setting('test.member_erasure_request_id')::uuid),'trusted completion executes after auth deletion');
RESET ROLE;
SELECT is((SELECT status::text FROM public.privacy_erasure_requests WHERE id=current_setting('test.member_erasure_request_id')::uuid),'completed','request completes only after profile deletion');

SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-000000000003","email":"privacy-supplier@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT set_config('test.supplier_erasure_request_id',(SELECT id::text FROM public.request_personal_data_erasure()),true);
RESET ROLE;
SELECT is((SELECT organization_id FROM public.privacy_erasure_requests WHERE id=current_setting('test.supplier_erasure_request_id')::uuid),'d1000000-0000-0000-0000-000000000001'::uuid,'supplier erasure request is audited to its tenant');
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
SELECT lives_ok($$SELECT public.service_prepare_personal_identity_erasure('d0000000-0000-0000-0000-000000000003')$$,'supplier identity preparation executes');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.supplier_access_memberships WHERE profile_id='d0000000-0000-0000-0000-000000000003'),0::bigint,'supplier authorization is removed');
SELECT is(public.is_active_supplier_for('d0000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-000000000001'),false,'same supplier identity no longer authorizes workspace access');
SELECT like((SELECT email FROM public.supplier_contacts WHERE id='d4000000-0000-0000-0000-000000000001'),'erased-%@invalid.example','mapped supplier contact is irreversibly anonymized');
SELECT is((SELECT name FROM public.supplier_contacts WHERE id='d4000000-0000-0000-0000-000000000002'),'Other Contact','cross-tenant contact remains untouched');
SELECT is((SELECT count(*) FROM public.suppliers WHERE id='d3000000-0000-0000-0000-000000000001'),1::bigint,'supplier company remains');

INSERT INTO public.organization_member_invites(id,organization_id,email,role,token_hash,created_by,created_at,expires_at,revoked_at,revoke_reason) VALUES
 ('d6000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','terminal-internal@test.invalid','viewer',repeat('a',64),'d0000000-0000-0000-0000-000000000001',now()-interval '2 days',now()+interval '5 days',now()-interval '1 day','Terminal fixture'),
 ('d6000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000001','usable-internal@test.invalid','viewer',repeat('b',64),'d0000000-0000-0000-0000-000000000001',now()-interval '2 days',now()+interval '5 days',NULL,NULL);
INSERT INTO public.supplier_invites(id,organization_id,supplier_id,email,token_hash,status,created_by,created_at,expires_at,revoked_at) VALUES
 ('d7000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','terminal-supplier@test.invalid',repeat('c',64),'revoked','d0000000-0000-0000-0000-000000000001',now()-interval '2 days',now()+interval '5 days',now()-interval '1 day');
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
SELECT public.service_purge_terminal_invitation_personal_data(now()-interval '1 day');
RESET ROLE;
SELECT like((SELECT email FROM public.organization_member_invites WHERE id='d6000000-0000-0000-0000-000000000001'),'erased-%@invalid.example','terminal internal invitation email is anonymized after supplied cutoff');
SELECT like((SELECT email FROM public.supplier_invites WHERE id='d7000000-0000-0000-0000-000000000001'),'erased-%@invalid.example','terminal supplier invitation email is anonymized after supplied cutoff');
SELECT is((SELECT email FROM public.organization_member_invites WHERE id='d6000000-0000-0000-0000-000000000002'),'usable-internal@test.invalid','usable invitation is not prematurely cleaned');
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='d1000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-000000000001","email":"privacy-admin@test.invalid","role":"authenticated"}',true);
SELECT is(public.is_org_member('d1000000-0000-0000-0000-000000000001'),false,'deletion-requested tenant denies member authorization');
SELECT is(public.has_org_role('d1000000-0000-0000-0000-000000000001',ARRAY['admin']),false,'deletion-requested tenant denies role authorization');
SELECT is(public.current_actor_can_read_evidence_object('compliance_docs','evidence/d8100000-0000-0000-0000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf'),false,'deletion-requested tenant denies evidence read authorization');
SELECT is((SELECT count(*) FROM public.get_evidence_download_target('d8100000-0000-0000-0000-000000000001')),0::bigint,'deletion-requested tenant hides evidence download target');
SELECT is((SELECT count(*) FROM public.get_my_organization_evidence(NULL)),0::bigint,'deletion-requested tenant hides organization evidence');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.get_organization_access_admin_view()$$,'42501',NULL,'deletion-requested tenant denies Team Access projection');
SELECT throws_ok($$SELECT * FROM public.get_supplier_access_admin('d3000000-0000-0000-0000-000000000001')$$,'42501',NULL,'deletion-requested tenant denies supplier admin projection');
SELECT throws_ok($$SELECT * FROM public.create_organization_member_invite('blocked-team@test.invalid','viewer')$$,'42501',NULL,'deletion-requested tenant denies team invitation creation');
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('d3000000-0000-0000-0000-000000000001','blocked-supplier@test.invalid')$$,'42501',NULL,'deletion-requested tenant denies supplier invitation creation');
SELECT throws_ok($$SELECT public.create_certification_from_evidence('d8100000-0000-0000-0000-000000000001','Blocked certification',current_date+60)$$,'42501',NULL,'deletion-requested tenant denies certification mutation');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-000000000005',true);
SELECT set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-000000000005","email":"privacy-final@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT public.request_personal_data_erasure();
RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT public.service_prepare_personal_identity_erasure('d0000000-0000-0000-0000-000000000005')$$,NULL,NULL,'active final administrator erasure fails closed');
RESET ROLE;
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='d1000000-0000-0000-0000-000000000003';
SET LOCAL ROLE service_role;
SELECT lives_ok($$SELECT public.service_prepare_personal_identity_erasure('d0000000-0000-0000-0000-000000000005')$$,'offboarding tenant permits controlled final-admin erasure');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.organization_members WHERE organization_id='d1000000-0000-0000-0000-000000000003'),0::bigint,'non-active tenant has no stale member authorization');
SELECT is(public.is_org_member('d1000000-0000-0000-0000-000000000003'),false,'deletion-requested tenant denies stale member reads');

SELECT * FROM finish();
ROLLBACK;
