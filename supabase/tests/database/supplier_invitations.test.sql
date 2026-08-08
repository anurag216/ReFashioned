BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(39);

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@test.invalid'),
 ('90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','supplier@test.invalid'),
 ('90000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','manager@test.invalid'),
 ('90000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer@test.invalid'),
 ('90000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-b@test.invalid'),
 ('90000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@test.invalid'),
 ('90000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','takeover@test.invalid'),
 ('90000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','internal@test.invalid'),
 ('90000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','multi@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE '90000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('91000000-0000-0000-0000-000000000001','Tenant A'),('91000000-0000-0000-0000-000000000002','Tenant B');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','admin'),
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000003','manager'),
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000004','viewer'),
 ('91000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000005','admin'),
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000008','viewer');
INSERT INTO public.suppliers(id,organization_id,name) VALUES
 ('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','Supplier A'),
 ('92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000002','Supplier B'),
 ('92000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000001','Supplier A2');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.supplier_invites$$,'42501',NULL,'anonymous SELECT is denied');
SELECT is((SELECT invitation_state FROM public.get_supplier_invite_metadata('bad')),'invalid','malformed metadata is generic');
SELECT is((SELECT invitation_state FROM public.get_supplier_invite_metadata(repeat('f',64))),'invalid','unknown metadata is generic');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.supplier_invites$$,'42501',NULL,'authenticated SELECT is denied');
SELECT throws_ok($$INSERT INTO public.supplier_invites DEFAULT VALUES$$,'42501',NULL,'authenticated INSERT is denied');
SELECT throws_ok($$UPDATE public.supplier_invites SET status='redeemed'$$,'42501',NULL,'authenticated UPDATE is denied');
SELECT throws_ok($$DELETE FROM public.supplier_invites$$,'42501',NULL,'authenticated DELETE is denied');
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001','supplier@test.invalid')$$,'42501',NULL,'viewer cannot create invites');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001','supplier@test.invalid')$$,'42501',NULL,'manager cannot create invites');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001","email":"admin@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000002','supplier@test.invalid')$$,'42501',NULL,'admin cannot invite cross tenant');
CREATE TEMP TABLE first_invite AS SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001',' Supplier@Test.Invalid ');
SELECT pass('admin creates an invite');
RESET ROLE;
SELECT is((SELECT length(token) FROM first_invite),64,'RPC returns 256-bit raw token');
SELECT isnt((SELECT token_hash FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM first_invite)),(SELECT token FROM first_invite),'raw token is never stored');
SELECT is((SELECT email FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM first_invite)),'supplier@test.invalid','email is normalized');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='supplier_invite_created'),1::bigint,'creation is audited');
SELECT is((SELECT invitation_state FROM public.get_supplier_invite_metadata((SELECT token FROM first_invite))),'usable','valid metadata is usable');
SELECT is((SELECT organization_name FROM public.get_supplier_invite_metadata((SELECT token FROM first_invite))),'Tenant A','usable metadata includes organization name');
SELECT is((SELECT supplier_name FROM public.get_supplier_invite_metadata((SELECT token FROM first_invite))),'Supplier A','usable metadata includes supplier name');
SELECT ok((SELECT masked_email <> 'supplier@test.invalid' AND masked_email !~ '^supplier@' FROM public.get_supplier_invite_metadata((SELECT token FROM first_invite))),'metadata masks full email');

SET LOCAL ROLE authenticated;
CREATE TEMP TABLE replacement AS SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001','supplier@test.invalid');
RESET ROLE;
SELECT ok((SELECT revoked_at IS NOT NULL FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM first_invite)),'replacement revokes old invite');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='supplier_invite_replaced'),1::bigint,'replacement is audited');

-- Expired and revoked rows are rejected without being consumed.
UPDATE public.supplier_invites SET expires_at=now()-interval '1 minute' WHERE id=(SELECT invitation_id FROM replacement);
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000002","email":"supplier@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM replacement)),'P0001','invitation has expired','expired invite cannot redeem');
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM first_invite)),'P0001','invitation was revoked','revoked invite cannot redeem');
RESET ROLE;

-- Fresh invite: wrong and absent email claims do not consume or link anything.
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001","email":"admin@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE usable AS SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001','supplier@test.invalid');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000002","email":"wrong@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM usable)),'42501',NULL,'wrong email cannot redeem');
RESET ROLE;
SELECT is((SELECT redeemed_at FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM usable)),NULL::timestamptz,'wrong email does not consume invite');
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM usable)),'42501',NULL,'missing JWT email cannot redeem');
RESET ROLE;
SELECT is((SELECT redeemed_at FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM usable)),NULL::timestamptz,'missing email does not consume invite');
SELECT is((SELECT count(*) FROM public.supplier_contacts WHERE profile_id='90000000-0000-0000-0000-000000000002'),0::bigint,'missing email creates no contact link');

-- Unlinked contact is safely linked and redemption is one-time and audited.
INSERT INTO public.supplier_contacts(supplier_id,email) VALUES('92000000-0000-0000-0000-000000000001','supplier@test.invalid');
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000002","email":"supplier@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM usable)),'unlinked contact can be linked');
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM usable)),'P0001','invitation was already redeemed','second redemption fails');
RESET ROLE;
SELECT is((SELECT profile_id FROM public.supplier_contacts WHERE email='supplier@test.invalid'),'90000000-0000-0000-0000-000000000002'::uuid,'correct supplier profile is linked');
SELECT is((SELECT count(*) FROM public.organization_members WHERE profile_id='90000000-0000-0000-0000-000000000002'),0::bigint,'redemption grants no organization membership');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='supplier_invite_redeemed'),1::bigint,'redemption is audited');

-- Existing linked contact cannot be taken over and invitation remains usable.
INSERT INTO public.supplier_contacts(supplier_id,email,profile_id) VALUES('92000000-0000-0000-0000-000000000003','takeover@test.invalid','90000000-0000-0000-0000-000000000006');
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001","email":"admin@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE takeover AS SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000003','takeover@test.invalid');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000007',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000007","email":"takeover@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM takeover)),'42501',NULL,'linked contact cannot be taken over');
RESET ROLE;
SELECT is((SELECT profile_id FROM public.supplier_contacts WHERE email='takeover@test.invalid'),'90000000-0000-0000-0000-000000000006'::uuid,'original contact profile is unchanged');
SELECT is((SELECT redeemed_at FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM takeover)),NULL::timestamptz,'takeover rejection does not consume invite');

-- Internal identities and multi-supplier identities are rejected.
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001","email":"admin@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE internal_invite AS SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000001','internal@test.invalid');
CREATE TEMP TABLE multi_invite AS SELECT * FROM public.create_supplier_invite('92000000-0000-0000-0000-000000000003','multi@test.invalid');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000008',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000008","email":"internal@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM internal_invite)),'42501',NULL,'internal member cannot redeem');
RESET ROLE;
INSERT INTO public.supplier_contacts(supplier_id,email,profile_id) VALUES('92000000-0000-0000-0000-000000000001','multi-old@test.invalid','90000000-0000-0000-0000-000000000009');
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000009',true);
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000009","email":"multi@test.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM multi_invite)),'P0001','account is already linked to another supplier','one profile cannot link to multiple suppliers');
RESET ROLE;
SELECT ok(
  regexp_count(
    pg_get_functiondef(
      'public.redeem_supplier_invite(text)'::regprocedure
    ),
    'FOR UPDATE'
  ) >= 2,
  'redemption locks both invitation and contact rows against concurrent redemption'
);

SELECT * FROM finish();
ROLLBACK;
