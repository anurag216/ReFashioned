BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(31);

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@team.invalid'),
 ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','manager@team.invalid'),
 ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer@team.invalid'),
 ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invitee@team.invalid'),
 ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@other.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'a0000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('a1000000-0000-0000-0000-000000000001','Team Tenant'),('a1000000-0000-0000-0000-000000000002','Other Tenant');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','admin'),
 ('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','manager'),
 ('a2000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','viewer'),
 ('a2000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005','admin');
INSERT INTO public.products(id,organization_id,name,status) VALUES('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Tenant product','draft');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.organization_member_invites$$,'42501',NULL,'anon cannot read internal invitations');
SELECT is((SELECT invitation_state FROM public.get_organization_member_invite_metadata('bad')),'invalid','malformed token metadata is generic');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","email":"viewer@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.organization_member_invites$$,'42501',NULL,'authenticated cannot read internal invitations');
SELECT throws_ok($$SELECT * FROM public.create_organization_member_invite('invitee@team.invalid','viewer')$$,'42501',NULL,'viewer cannot invite');
SELECT throws_ok($$INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','viewer')$$,'42501',NULL,'direct membership INSERT denied');
SELECT throws_ok($$UPDATE public.organization_members SET role='manager' WHERE id='a2000000-0000-0000-0000-000000000003'$$,'42501',NULL,'direct membership UPDATE denied');
SELECT throws_ok($$DELETE FROM public.organization_members WHERE id='a2000000-0000-0000-0000-000000000003'$$,'42501',NULL,'direct membership DELETE denied');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","email":"manager@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_organization_member_invite('invitee@team.invalid','viewer')$$,'42501',NULL,'manager cannot invite');
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
SELECT lives_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000003','manager','promotion')$$,'admin can promote viewer to manager');
SELECT throws_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000005','viewer','cross tenant')$$,'P0002',NULL,'admin cannot change another tenant member');
SELECT throws_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000001','manager','self demotion')$$,'P0001','cannot remove or demote the final organization admin','final admin cannot be demoted');
SELECT throws_ok($$SELECT public.revoke_organization_member_access('a2000000-0000-0000-0000-000000000001','self removal')$$,'P0001','cannot remove or demote the final organization admin','final admin cannot be removed');
SELECT lives_ok($$SELECT public.revoke_organization_member_access((SELECT id FROM public.organization_members WHERE profile_id='a0000000-0000-0000-0000-000000000004'),'employment ended')$$,'admin revokes internal access');
RESET ROLE;
-- The JWT is unchanged; authorization re-reads authoritative membership state.
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000004","email":"invitee@team.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.products),0::bigint,'same JWT loses tenant reads immediately after revocation');
SELECT throws_ok($$SELECT public.update_organization_member_role('a2000000-0000-0000-0000-000000000003','viewer','attempt')$$,'42501',NULL,'same revoked JWT cannot call privileged access RPC');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
