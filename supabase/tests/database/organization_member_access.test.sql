BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(56);

SELECT ok((SELECT indisunique FROM pg_catalog.pg_index WHERE indexrelid='public.organization_member_invites_pending_email_idx'::regclass),'pending organization/email invitation index is unique');
SELECT ok(has_function_privilege('anon','public.get_organization_member_invite_metadata(text)','EXECUTE'),'anon can execute only the safe team invitation metadata contract');
SELECT ok((SELECT bool_and(NOT has_function_privilege('anon',f,'EXECUTE')) FROM unnest(ARRAY['public.create_organization_member_invite(text,text)'::regprocedure,'public.redeem_organization_member_invite(text)'::regprocedure,'public.get_organization_access_admin_view()'::regprocedure,'public.revoke_organization_member_invite(uuid,text)'::regprocedure,'public.update_organization_member_role(uuid,text,text)'::regprocedure,'public.revoke_organization_member_access(uuid,text)'::regprocedure]) f),'anon cannot execute internal team mutation contracts');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl WHERE p.oid=ANY(ARRAY['public.create_organization_member_invite(text,text)'::regprocedure,'public.get_organization_member_invite_metadata(text)'::regprocedure,'public.redeem_organization_member_invite(text)'::regprocedure,'public.get_organization_access_admin_view()'::regprocedure,'public.revoke_organization_member_invite(uuid,text)'::regprocedure,'public.update_organization_member_role(uuid,text,text)'::regprocedure,'public.revoke_organization_member_access(uuid,text)'::regprocedure]::oid[]) AND acl.grantee=0 AND acl.privilege_type='EXECUTE'),'PUBLIC cannot execute any internal team contract');
SELECT ok((SELECT bool_and(has_function_privilege('authenticated',f,'EXECUTE')) FROM unnest(ARRAY['public.create_organization_member_invite(text,text)'::regprocedure,'public.get_organization_member_invite_metadata(text)'::regprocedure,'public.redeem_organization_member_invite(text)'::regprocedure,'public.get_organization_access_admin_view()'::regprocedure,'public.revoke_organization_member_invite(uuid,text)'::regprocedure,'public.update_organization_member_role(uuid,text,text)'::regprocedure,'public.revoke_organization_member_access(uuid,text)'::regprocedure]) f),'authenticated receives the exact internal team RPC contracts');

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@team.invalid'),
 ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','manager@team.invalid'),
 ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer@team.invalid'),
 ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invitee@team.invalid'),
 ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@other.invalid'),
 ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','expired@team.invalid'),
 ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','revoked@team.invalid'),
 ('a0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','supplier-identity@team.invalid'),
 ('a0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','existing@team.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'a0000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('a1000000-0000-0000-0000-000000000001','Team Tenant'),('a1000000-0000-0000-0000-000000000002','Other Tenant');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','admin'),
 ('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','manager'),
 ('a2000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','viewer'),
 ('a2000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005','admin');
INSERT INTO public.products(id,organization_id,name,status) VALUES('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Tenant product','draft');
INSERT INTO public.suppliers(id,organization_id,name) VALUES('a4000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Identity Supplier');
INSERT INTO public.supplier_contacts(id,supplier_id,email) VALUES('a4100000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','supplier-identity@team.invalid');
INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated)
VALUES('a1000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','a4100000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008',true);

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.organization_member_invites$$,'42501',NULL,'anon cannot read internal invitations');
SELECT is((SELECT invitation_state FROM public.get_organization_member_invite_metadata('bad')),'invalid','malformed token metadata is generic');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","email":"viewer@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.organization_member_invites$$,'42501',NULL,'authenticated cannot read internal invitations');
SELECT throws_ok($$SELECT * FROM public.create_organization_member_invite('invitee@team.invalid','viewer')$$,'42501',NULL,'viewer cannot invite');
SELECT throws_ok($$SELECT public.get_organization_access_admin_view()$$,'42501',NULL,'viewer cannot access the admin team view');
SELECT throws_ok($$SELECT public.revoke_organization_member_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','unauthorized')$$,'42501',NULL,'viewer cannot revoke invitations');
SELECT throws_ok($$INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','viewer')$$,'42501',NULL,'direct membership INSERT denied');
SELECT throws_ok($$UPDATE public.organization_members SET role='manager' WHERE id='a2000000-0000-0000-0000-000000000003'$$,'42501',NULL,'direct membership UPDATE denied');
SELECT throws_ok($$DELETE FROM public.organization_members WHERE id='a2000000-0000-0000-0000-000000000003'$$,'42501',NULL,'direct membership DELETE denied');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","email":"manager@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_organization_member_invite('invitee@team.invalid','viewer')$$,'42501',NULL,'manager cannot invite');
SELECT throws_ok($$SELECT public.get_organization_access_admin_view()$$,'42501',NULL,'manager cannot access the admin team view');
SELECT throws_ok($$SELECT public.revoke_organization_member_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','unauthorized')$$,'42501',NULL,'manager cannot revoke invitations');
SELECT throws_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000003','manager','promotion')$$,'42501',NULL,'manager cannot change roles');
SELECT throws_ok($$SELECT public.revoke_organization_member_access('a2000000-0000-0000-0000-000000000003','departed')$$,'42501',NULL,'manager cannot revoke members');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_organization_member_invite('bad email','viewer')$$,'22023',NULL,'bad email rejected');
SELECT throws_ok($$SELECT * FROM public.create_organization_member_invite('invitee@team.invalid','owner')$$,'22023',NULL,'invalid role rejected');
CREATE TEMP TABLE first_invite AS SELECT * FROM public.create_organization_member_invite(' Invitee@Team.Invalid ','manager');
SELECT pass('admin can create an invitation');
RESET ROLE;
SELECT is((SELECT length(raw_token) FROM first_invite),64,'creation returns a 256-bit token once');
SELECT isnt((SELECT token_hash FROM public.organization_member_invites WHERE id=(SELECT invite_id FROM first_invite)),(SELECT raw_token FROM first_invite),'raw token is not stored');
SELECT is((SELECT email FROM public.organization_member_invites WHERE id=(SELECT invite_id FROM first_invite)),'invitee@team.invalid','invited email is canonical');
SELECT is((SELECT invitation_state FROM public.get_organization_member_invite_metadata((SELECT raw_token FROM first_invite))),'usable','metadata reports usable invitation');
SELECT is((SELECT organization_name FROM public.get_organization_member_invite_metadata((SELECT raw_token FROM first_invite))),'Team Tenant','metadata exposes organization name without an ID');

SET LOCAL ROLE authenticated;
CREATE TEMP TABLE replacement AS SELECT * FROM public.create_organization_member_invite('invitee@team.invalid','manager');
RESET ROLE;
SELECT is((SELECT invitation_state FROM public.get_organization_member_invite_metadata((SELECT raw_token FROM first_invite))),'revoked','replacement immediately invalidates old token');

-- Prepare independent negative-case invitations through the real admin RPC.
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE expired_invite AS SELECT * FROM public.create_organization_member_invite('expired@team.invalid','viewer');
CREATE TEMP TABLE revoked_invite AS SELECT * FROM public.create_organization_member_invite('revoked@team.invalid','viewer');
CREATE TEMP TABLE supplier_invite AS SELECT * FROM public.create_organization_member_invite('supplier-identity@team.invalid','viewer');
CREATE TEMP TABLE existing_invite AS SELECT * FROM public.create_organization_member_invite('existing@team.invalid','viewer');
SELECT lives_ok(format('SELECT public.revoke_organization_member_invite(%L,%L)',(SELECT invite_id FROM revoked_invite),'Invitation withdrawn'),'admin explicitly revokes an invitation');
RESET ROLE;
UPDATE public.organization_member_invites SET created_at=now()-interval '8 days',expires_at=now()-interval '1 minute' WHERE id=(SELECT invite_id FROM expired_invite);
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000009','viewer');

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000006',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000006","email":"expired@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM expired_invite)),'55000',NULL,'expired invitation cannot redeem');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000007',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000007","email":"revoked@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM revoked_invite)),'55000',NULL,'explicitly revoked invitation cannot redeem');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000008',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000008","email":"supplier-identity@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM supplier_invite)),'23514',NULL,'active supplier identity cannot redeem internal invitation');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000009',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000009","email":"existing@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM existing_invite)),'23505',NULL,'existing internal member cannot redeem another invitation');
RESET ROLE;

-- Tenant B invitation remains outside Tenant A administrator scope.
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000005","email":"admin@other.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE tenant_b_invite AS SELECT * FROM public.create_organization_member_invite('cross-tenant@team.invalid','viewer');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.revoke_organization_member_invite(%L,%L)',(SELECT invite_id FROM tenant_b_invite),'Cross tenant attempt'),'P0002',NULL,'Tenant A admin cannot revoke Tenant B invitation');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000004","email":"wrong@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM replacement)),'42501',NULL,'wrong authenticated email cannot redeem');
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000004","email":"invitee@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM replacement)),'matching email redeems invitation');
SELECT throws_ok(format('SELECT public.redeem_organization_member_invite(%L)',(SELECT raw_token FROM replacement)),'55000',NULL,'redeemed invitation cannot replay');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.organization_members WHERE profile_id='a0000000-0000-0000-0000-000000000004'),1::bigint,'redemption creates exactly one membership');
SELECT is((SELECT role FROM public.organization_members WHERE profile_id='a0000000-0000-0000-0000-000000000004'),'manager','membership receives invited role');

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000001','manager','self demotion')$$,'P0001','cannot remove or demote the final organization admin','final admin cannot be demoted');
SELECT throws_ok($$SELECT public.revoke_organization_member_access('a2000000-0000-0000-0000-000000000001','self removal')$$,'P0001','cannot remove or demote the final organization admin','final admin cannot be removed');
SELECT lives_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000003','manager','promotion')$$,'admin can promote viewer to manager');
SELECT lives_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000003','viewer','manager downgrade')$$,'admin can change manager to viewer');
SELECT lives_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000003','admin','admin promotion')$$,'admin can promote a member to admin');
SELECT throws_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000005','viewer','cross tenant')$$,'P0002',NULL,'admin cannot change another tenant member');
SELECT lives_ok($$SELECT public.revoke_organization_member_access((SELECT id FROM public.organization_members WHERE profile_id='a0000000-0000-0000-0000-000000000004'),'employment ended')$$,'admin revokes internal access');
RESET ROLE;
-- The JWT is unchanged; authorization re-reads authoritative membership state.
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000004","email":"invitee@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.products),0::bigint,'same JWT loses tenant reads immediately after revocation');
SELECT is((SELECT count(*) FROM public.organizations),0::bigint,'same JWT loses organization reads immediately after revocation');
SELECT throws_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000003','viewer','attempt')$$,'42501',NULL,'same revoked JWT cannot call privileged access RPC');
RESET ROLE;

SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_invite_created'),7::bigint,'team invitation creation is audited');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_invite_replaced'),1::bigint,'team invitation replacement is audited');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_invite_revoked'),1::bigint,'team invitation revocation is audited');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_invite_redeemed'),1::bigint,'team invitation redemption is audited');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_role_changed'),3::bigint,'organization role changes are audited');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='organization_member_access_revoked'),1::bigint,'organization access revocation is audited');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.audit_logs a CROSS JOIN first_invite i WHERE a.entity_name LIKE '%'||i.raw_token||'%'),'raw invitation tokens never appear in audit records');

SELECT * FROM finish();
ROLLBACK;
