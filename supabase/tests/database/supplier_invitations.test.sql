BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(14);

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invite-admin@test.invalid'),
 ('90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','supplier-user@test.invalid'),
 ('90000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','manager-invite@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE '90000000%';
INSERT INTO public.organizations(id,name) VALUES('91000000-0000-0000-0000-000000000001','Invitation Tenant');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','admin'),
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000003','manager');
INSERT INTO public.suppliers(id,organization_id,name) VALUES('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','Invited Supplier');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.supplier_invites$$,'42501',NULL,'anonymous cannot read invite rows');
SELECT is((SELECT invitation_state FROM public.get_supplier_invite_metadata('bad')),'invalid','malformed metadata is generic');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.supplier_invites$$,'42501',NULL,'authenticated cannot read invite rows');
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001','supplier-user@test.invalid')$$,'42501',NULL,'manager cannot create invites');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE made AS SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001',' Supplier-User@Test.Invalid ');
SELECT is((SELECT length(token) FROM made),64,'creation returns 256-bit raw token');
RESET ROLE;
SELECT isnt((SELECT token_hash FROM public.supplier_invites LIMIT 1),(SELECT token FROM made),'raw token is not stored');
SELECT is((SELECT email FROM public.supplier_invites LIMIT 1),'supplier-user@test.invalid','email is normalized');
SELECT is((SELECT invitation_state FROM public.get_supplier_invite_metadata((SELECT token FROM made))),'usable','valid metadata is usable');
SELECT is((SELECT masked_email FROM public.get_supplier_invite_metadata((SELECT token FROM made))),'s************@test.invalid','metadata masks invited email');

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claim.email','wrong@test.invalid',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM made)),'42501',NULL,'wrong email cannot redeem');
RESET ROLE;
SELECT is((SELECT redeemed_at FROM public.supplier_invites LIMIT 1),NULL::timestamptz,'wrong email does not consume invite');

SELECT set_config('request.jwt.claim.email','supplier-user@test.invalid',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM made)),'matching account redeems');
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM made)),'P0001',NULL,'second redemption fails');
RESET ROLE;
SELECT is((SELECT supplier_id FROM public.supplier_contacts WHERE profile_id='90000000-0000-0000-0000-000000000002'),'92000000-0000-0000-0000-000000000001'::uuid,'redemption links correct supplier');
SELECT is((SELECT count(*) FROM public.organization_members WHERE profile_id='90000000-0000-0000-0000-000000000002'),0::bigint,'redemption does not grant organization membership');

SELECT * FROM finish();
ROLLBACK;
