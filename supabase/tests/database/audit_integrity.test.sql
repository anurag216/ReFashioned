BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(41);

INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','audit-admin-a@test.invalid'),
 ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','audit-manager@test.invalid'),
 ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','audit-viewer@test.invalid'),
 ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','audit-admin-b@test.invalid'),
 ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','audit-member@test.invalid'),
 ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','audit-onboard@test.invalid'),
 ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','audit-supplier@test.invalid');
INSERT INTO public.profiles(id,email)
SELECT id,email FROM auth.users WHERE id::text LIKE 'a0000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('a1000000-0000-0000-0000-000000000001','Audit Tenant A'),
 ('a1000000-0000-0000-0000-000000000002','Audit Tenant B');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','admin'),
 ('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','manager'),
 ('a2000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','viewer'),
 ('a2000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004','admin');
INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','fixture_event','organization','a1000000-0000-0000-0000-000000000001'),
 ('a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004','fixture_event','organization','a1000000-0000-0000-0000-000000000002');

SELECT ok(NOT has_table_privilege('authenticated','public.audit_logs','INSERT'),'authenticated has no audit INSERT privilege');
SELECT ok(NOT has_table_privilege('authenticated','public.audit_logs','UPDATE'),'authenticated has no audit UPDATE privilege');
SELECT ok(NOT has_table_privilege('authenticated','public.audit_logs','DELETE'),'authenticated has no audit DELETE privilege');
SELECT ok(NOT has_table_privilege('anon','public.audit_logs','INSERT'),'anonymous has no audit INSERT privilege');
SELECT ok(NOT has_table_privilege('anon','public.audit_logs','UPDATE'),'anonymous has no audit UPDATE privilege');
SELECT ok(NOT has_table_privilege('anon','public.audit_logs','DELETE'),'anonymous has no audit DELETE privilege');
SELECT ok(NOT has_table_privilege('service_role','public.audit_logs','INSERT'),'service role has no audit INSERT privilege');
SELECT ok(NOT has_table_privilege('service_role','public.audit_logs','UPDATE'),'service role has no audit UPDATE privilege');
SELECT ok(NOT has_table_privilege('service_role','public.audit_logs','DELETE'),'service role has no audit DELETE privilege');
SELECT ok(NOT has_table_privilege('authenticated','public.audit_events','INSERT'),'legacy audit events denies authenticated writes');
SELECT ok(NOT has_table_privilege('anon','public.audit_events','INSERT'),'legacy audit events denies anonymous writes');
SELECT ok(NOT has_table_privilege('service_role','public.audit_events','INSERT'),'legacy audit events denies service-role writes');
SELECT is((SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND cmd <> 'SELECT'),0::bigint,'audit logs has no mutation policies');
SELECT is((SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND cmd='SELECT'),1::bigint,'audit logs has one explicit read policy');
SELECT ok(NOT has_function_privilege('authenticated','public.audit_organization_membership_change()','EXECUTE'),'membership audit trigger is not client executable');
SELECT ok(NOT has_function_privilege('service_role','public.audit_organization_membership_change()','EXECUTE'),'membership audit trigger is not service-role executable');
SELECT ok(NOT has_function_privilege('authenticated','public.audit_organization_change()','EXECUTE'),'organization audit trigger is not client executable');
SELECT ok(NOT has_function_privilege('service_role','public.audit_organization_change()','EXECUTE'),'organization audit trigger is not service-role executable');

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','believable_forgery','product','safe-looking')$$,'42501',NULL,'own-actor same-tenant forgery is denied');
SELECT throws_ok($$INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','actor_spoof','product','x')$$,'42501',NULL,'actor spoofing is denied');
SELECT throws_ok($$INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES('a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','cross_tenant','product','x')$$,'42501',NULL,'cross-tenant forgery is denied');
SELECT throws_ok($$UPDATE public.audit_logs SET action='rewritten'$$,'42501',NULL,'client cannot rewrite audit history');
SELECT throws_ok($$DELETE FROM public.audit_logs$$,'42501',NULL,'client cannot delete audit history');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE organization_id='a1000000-0000-0000-0000-000000000001'),1::bigint,'same-organization admin reads audit events');

CREATE TEMP TABLE audit_member_invite AS SELECT * FROM public.create_organization_member_invite('audit-member@test.invalid','manager');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000005","email":"audit-member@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM audit_member_invite)),'invitee redeems membership through authoritative RPC');
RESET ROLE;
SELECT set_config('test.audit_member_id',(SELECT m.id::text FROM public.organization_members AS m WHERE m.profile_id='a0000000-0000-0000-0000-000000000005'),true);
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","email":"audit-admin-a@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.update_organization_member_role(%L,%L,%L)',current_setting('test.audit_member_id')::uuid,'viewer','Audit role change'),'admin changes member role through RPC');
SELECT lives_ok(format('SELECT public.update_organization_member_role(%L,%L,%L)',current_setting('test.audit_member_id')::uuid,'viewer','Audit same-role no-op'),'membership RPC no-op succeeds');
SELECT lives_ok(format('SELECT public.revoke_organization_member_access(%L,%L)',current_setting('test.audit_member_id')::uuid,'Audit access revocation'),'admin removes member through RPC');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_added' AND profile_id='a0000000-0000-0000-0000-000000000005' AND entity_name=current_setting('test.audit_member_id')),1::bigint,'member addition records exactly one invitee actor and membership ID');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_role_changed' AND profile_id='a0000000-0000-0000-0000-000000000001' AND entity_name=current_setting('test.audit_member_id')),1::bigint,'only the real role change records one admin event');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_removed' AND profile_id='a0000000-0000-0000-0000-000000000001' AND entity_name=current_setting('test.audit_member_id')),1::bigint,'member removal records exactly one admin actor and membership ID');
SELECT lives_ok($$SELECT public.update_organization_profile('Audit Tenant A updated')$$,'admin updates organization settings through authoritative RPC');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_updated' AND profile_id='a0000000-0000-0000-0000-000000000001' AND entity_name='a1000000-0000-0000-0000-000000000001'),1::bigint,'meaningful organization update is audited');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.audit_logs WHERE organization_id='a1000000-0000-0000-0000-000000000001'),8::bigint,'same-organization manager reads the complete server-owned audit lifecycle');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE organization_id='a1000000-0000-0000-0000-000000000002'),0::bigint,'manager cannot read another tenant audit events');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_updated'),1::bigint,'failed manager organization mutation emitted no false event');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.audit_logs),0::bigint,'same-organization viewer cannot read audit events');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000007',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.audit_logs),0::bigint,'supplier identity cannot read internal audit events');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT count(*) FROM public.audit_logs$$,'42501',NULL,'anonymous cannot access audit events');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000006',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_organization_with_admin('Onboarded Audit Tenant')$$,'authenticated onboarding succeeds');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_created' AND profile_id='a0000000-0000-0000-0000-000000000006' AND entity_name=organization_id::text),1::bigint,'organization creation records the authenticated actor and organization ID');

SELECT * FROM finish();
ROLLBACK;
