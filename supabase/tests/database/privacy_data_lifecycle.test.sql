BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(45);

SELECT has_table('public','privacy_erasure_requests','privacy request state is server-owned');
SELECT row_security_is('public','privacy_erasure_requests',true,'privacy requests enforce RLS');
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

SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-000000000002","email":"privacy-member@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE member_request AS SELECT id FROM public.request_personal_data_erasure();
SELECT is((SELECT id FROM public.request_personal_data_erasure()),(SELECT id FROM member_request),'repeated request is idempotent');
SELECT is((SELECT count(*) FROM public.privacy_erasure_requests),1::bigint,'subject sees exactly one open request through RLS');
SELECT throws_ok($$SELECT public.service_prepare_personal_identity_erasure('d0000000-0000-0000-0000-000000000004')$$,'42501',NULL,'authenticated cannot erase another subject');
RESET ROLE;

SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
SELECT lives_ok($$SELECT public.service_prepare_personal_identity_erasure('d0000000-0000-0000-0000-000000000002')$$,'trusted preparation executes');
RESET ROLE;
SELECT is((SELECT status::text FROM public.privacy_erasure_requests WHERE id=(SELECT id FROM member_request)),'processing','request moves to processing');
SELECT is((SELECT count(*) FROM public.organization_members WHERE profile_id='d0000000-0000-0000-0000-000000000002'),0::bigint,'internal authorization is removed');
SELECT is(public.is_org_member('d1000000-0000-0000-0000-000000000001'),false,'unchanged subject JWT no longer authorizes tenant access');
SELECT is((SELECT count(*) FROM public.products WHERE id='d2000000-0000-0000-0000-000000000001'),1::bigint,'business product remains');
DELETE FROM auth.users WHERE id='d0000000-0000-0000-0000-000000000002';
SELECT is((SELECT count(*) FROM public.audit_logs WHERE id='d5000000-0000-0000-0000-000000000001'),1::bigint,'historical audit row survives profile deletion');
SELECT is((SELECT profile_id FROM public.audit_logs WHERE id='d5000000-0000-0000-0000-000000000001'),NULL::uuid,'historical audit actor becomes null');
SET LOCAL ROLE service_role;
SELECT lives_ok(format('SELECT public.service_complete_personal_identity_erasure(%L)',(SELECT id FROM member_request)),'trusted completion executes after auth deletion');
RESET ROLE;
SELECT is((SELECT status::text FROM public.privacy_erasure_requests WHERE id=(SELECT id FROM member_request)),'completed','request completes only after profile deletion');

SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"d0000000-0000-0000-0000-000000000003","email":"privacy-supplier@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE supplier_request AS SELECT id,organization_id FROM public.request_personal_data_erasure();
RESET ROLE;
SELECT is((SELECT organization_id FROM supplier_request),'d1000000-0000-0000-0000-000000000001'::uuid,'supplier erasure request is audited to its tenant');
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
