BEGIN;
SELECT plan(106);

SELECT has_table('public','supplier_access_memberships','supplier access membership table exists');
SELECT hasnt_column('public','supplier_contacts','profile_id','contact metadata is not an authorization credential');
SELECT has_column('public','supplier_access_memberships','revoked_at','membership supports revocation');
SELECT has_column('public','supplier_access_memberships','revocation_reason','membership preserves revocation reason');
SELECT has_index('public','supplier_access_memberships','supplier_access_active_profile_uidx','active profiles are unique');
SELECT has_index('public','supplier_access_memberships','supplier_access_active_contact_uidx','active contacts are unique');
SELECT has_index('public','supplier_access_memberships','supplier_access_invitation_uidx','an invitation has one membership');
SELECT ok(EXISTS(
  SELECT 1 FROM pg_catalog.pg_constraint c
  JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
  JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
  WHERE n.nspname='public' AND t.relname='supplier_access_memberships'
    AND c.conname='supplier_access_provenance_check' AND c.contype='c'
),'membership provenance is enforced');
SELECT has_function('public','create_supplier_contact',ARRAY['uuid','text','text'],'contact creation uses a secured RPC');
SELECT has_function('public','update_supplier_contact',ARRAY['uuid','text','text'],'contact update uses a secured RPC');
SELECT has_function('public','delete_supplier_contact',ARRAY['uuid'],'contact deletion uses a secured RPC');
SELECT has_function('public','revoke_supplier_invite',ARRAY['uuid'],'pending invitations can be revoked');
SELECT has_function('public','revoke_supplier_access',ARRAY['uuid','text'],'supplier access can be revoked');
SELECT has_function('public','get_supplier_access_admin',ARRAY['uuid'],'safe access administration RPC exists');
SELECT is(has_table_privilege('authenticated','public.supplier_access_memberships','INSERT'),false,'authenticated cannot insert memberships');
SELECT is(has_table_privilege('authenticated','public.supplier_access_memberships','UPDATE'),false,'authenticated cannot update memberships');
SELECT is(has_table_privilege('authenticated','public.supplier_access_memberships','SELECT'),false,'authenticated cannot directly select memberships');
SELECT is(has_table_privilege('authenticated','public.supplier_contacts','INSERT'),false,'authenticated cannot directly insert contacts');
SELECT is(has_table_privilege('authenticated','public.supplier_contacts','UPDATE'),false,'authenticated cannot directly update contacts');

SELECT ok(
  position(
    'supplier_profile_identity_lock'
    in regexp_replace(
      pg_get_functiondef(
        'public.prevent_dual_identity()'::regprocedure
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  ) > 0,
  'both identity tables use the shared profile lock'
);
SELECT ok(
  position('supplier_identity_lock' in regexp_replace(pg_get_functiondef('public.create_supplier_contact(uuid,text,text)'::regprocedure),'[[:space:]]+',' ','g'))>0
  AND position('supplier_identity_lock' in regexp_replace(pg_get_functiondef('public.update_supplier_contact(uuid,text,text)'::regprocedure),'[[:space:]]+',' ','g'))>0
  AND position('supplier_identity_lock' in regexp_replace(pg_get_functiondef('public.update_supplier_contact(uuid,text,text)'::regprocedure),'[[:space:]]+',' ','g'))
      < position('FOR UPDATE' in regexp_replace(pg_get_functiondef('public.update_supplier_contact(uuid,text,text)'::regprocedure),'[[:space:]]+',' ','g'))
  AND position('supplier_identity_lock' in regexp_replace(pg_get_functiondef('public.delete_supplier_contact(uuid)'::regprocedure),'[[:space:]]+',' ','g'))>0
  AND position('supplier_identity_lock' in regexp_replace(pg_get_functiondef('public.delete_supplier_contact(uuid)'::regprocedure),'[[:space:]]+',' ','g'))
      < position('FOR UPDATE' in regexp_replace(pg_get_functiondef('public.delete_supplier_contact(uuid)'::regprocedure),'[[:space:]]+',' ','g')),
  'contact RPCs acquire lifecycle advisory locks before row locks');

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-admin@test.invalid'),
 ('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-manager@test.invalid'),
 ('b0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-viewer@test.invalid'),
 ('b0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-supplier@test.invalid'),
 ('b0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-admin-b@test.invalid'),
 ('b0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','second-supplier@test.invalid'),
 ('b0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','conversion@test.invalid'),
 ('b0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wrong-email@test.invalid'),
 ('b0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','internal-admin@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'b0000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('b1000000-0000-0000-0000-000000000001','Identity A'),('b1000000-0000-0000-0000-000000000002','Identity B');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','admin'),
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','manager'),
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000003','viewer'),
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000009','admin'),
 ('b1000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000005','admin');
INSERT INTO public.suppliers(id,organization_id,name) VALUES
 ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','Identity Supplier A'),
 ('b2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000002','Identity Supplier B');

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001',' Alice ',' Alice@Example.Test ')$$,'admin creates a contact');
RESET ROLE;
SELECT is((SELECT email FROM public.supplier_contacts WHERE supplier_id='b2000000-0000-0000-0000-000000000001' AND name='Alice'),'alice@example.test','contact email is canonicalized');

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000002','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Bob','bob@example.test')$$,'manager creates a contact');
SELECT throws_ok($$SELECT public.delete_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='bob@example.test'))$$,'42501',NULL,'manager cannot delete contacts');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000003','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Denied','denied@example.test')$$,'42501',NULL,'viewer cannot create contacts');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Supplier denied','supplier-denied@example.test')$$,'42501',NULL,'supplier cannot create contacts'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000002','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000002','Cross','cross@example.test')$$,'42501',NULL,'cross-tenant manager cannot create contacts');
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Bad','not-an-email')$$,'22023',NULL,'invalid contact email is denied');
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Duplicate','ALICE@example.test')$$,'23505',NULL,'canonical duplicate contact is denied');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.delete_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='bob@example.test'))$$,'admin deletes a safe contact');
SELECT lives_ok($$SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','alice@example.test')$$,'admin creates a pending invite');
SELECT throws_ok($$SELECT public.update_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'),'Alice','new@example.test')$$,'55000',NULL,'pending invitation prevents email change');
SELECT throws_ok($$SELECT public.delete_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'))$$,'55000',NULL,'pending invitation prevents contact deletion');
RESET ROLE;

SELECT throws_ok($$UPDATE public.supplier_contacts SET supplier_id='b2000000-0000-0000-0000-000000000002' WHERE email='alice@example.test'$$,'P0001','supplier contact supplier is immutable','supplier contact cannot move suppliers');
SELECT throws_ok($$INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',(SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'),'b0000000-0000-0000-0000-000000000003',true)$$,'23514','remove internal membership before granting supplier access','internal identity cannot receive supplier access');
SELECT throws_ok($$INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',(SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'),'b0000000-0000-0000-0000-000000000002',true)$$,'23514','remove internal membership before granting supplier access','internal manager cannot receive supplier access');
SELECT throws_ok($$INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',(SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'),'b0000000-0000-0000-0000-000000000001',true)$$,'23514','remove internal membership before granting supplier access','internal admin cannot receive supplier access');
SELECT throws_ok($$INSERT INTO public.supplier_invites(organization_id,supplier_id,email,token_hash,status,expires_at) VALUES('b1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001','scope@example.test',repeat('a',64),'sent',now()+interval '1 day')$$,'23503',NULL,'invitation organization must match supplier');

-- Invitation authorization, replacement, revocation, and redemption.
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000002','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','manager-invite@test.invalid')$$,'42501',NULL,'manager cannot create invitations'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000003','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','viewer-invite@test.invalid')$$,'42501',NULL,'viewer cannot create invitations'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','supplier-invite@test.invalid')$$,'42501',NULL,'supplier cannot create invitations'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000005',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000005','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','cross-invite@test.invalid')$$,'42501',NULL,'cross-tenant admin cannot create invitations'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE first_identity_invite AS SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','replace@test.invalid');
SELECT pass('admin creates an invitation');
CREATE TEMP TABLE replacement_identity_invite AS SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001',' REPLACE@test.invalid ');
RESET ROLE;
SELECT ok((SELECT revoked_at IS NOT NULL AND status='revoked' FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM first_identity_invite)),'replacement revokes previous invitation');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='supplier_invite_replaced' AND entity_name=(SELECT invitation_id::text FROM first_identity_invite)),1::bigint,'replacement is audited once');
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.revoke_supplier_invite(%L)',(SELECT invitation_id FROM replacement_identity_invite)),'admin manually revokes invitation');
SELECT throws_ok(format('SELECT public.revoke_supplier_invite(%L)',(SELECT invitation_id FROM replacement_identity_invite)),'P0001','invitation was already revoked','duplicate invitation revocation fails'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','email','replace@test.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM replacement_identity_invite)),'P0001','invitation was revoked','revoked invitation cannot redeem'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE expired_identity_invite AS SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','expired@test.invalid'); RESET ROLE;
UPDATE public.supplier_invites SET expires_at=now()-interval '1 minute' WHERE id=(SELECT invitation_id FROM expired_identity_invite);
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','email','expired@test.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM expired_identity_invite)),'P0001','invitation has expired','expired invitation cannot redeem'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE valid_identity_invite AS SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','identity-supplier@test.invalid'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000008',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000008','email','wrong-email@test.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM valid_identity_invite)),'42501',NULL,'incorrect JWT email cannot redeem'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM valid_identity_invite)),'42501',NULL,'missing JWT email cannot redeem'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','email','identity-supplier@test.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM valid_identity_invite)),'valid invitation redeems');
RESET ROLE;
SELECT is((SELECT organization_id FROM public.supplier_access_memberships WHERE profile_id='b0000000-0000-0000-0000-000000000004' AND revoked_at IS NULL),'b1000000-0000-0000-0000-000000000001'::uuid,'membership organization is derived');
SELECT is((SELECT supplier_id FROM public.supplier_access_memberships WHERE profile_id='b0000000-0000-0000-0000-000000000004' AND revoked_at IS NULL),'b2000000-0000-0000-0000-000000000001'::uuid,'membership supplier is derived');
SELECT is((SELECT c.email FROM public.supplier_access_memberships a JOIN public.supplier_contacts c ON c.id=a.supplier_contact_id WHERE a.profile_id='b0000000-0000-0000-0000-000000000004' AND a.revoked_at IS NULL),'identity-supplier@test.invalid','membership contact is derived');
SELECT is((SELECT invitation_id FROM public.supplier_access_memberships WHERE profile_id='b0000000-0000-0000-0000-000000000004' AND revoked_at IS NULL),(SELECT invitation_id FROM valid_identity_invite),'membership records invitation provenance');
SELECT ok((SELECT redeemed_at IS NOT NULL AND redeemed_by='b0000000-0000-0000-0000-000000000004' AND status='redeemed' FROM public.supplier_invites WHERE id=(SELECT invitation_id FROM valid_identity_invite)),'invitation records redemption actor and state');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='supplier_invite_redeemed' AND entity_name=(SELECT invitation_id::text FROM valid_identity_invite)),1::bigint,'redemption is audited once');
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','email','identity-supplier@test.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM valid_identity_invite)),'P0001','invitation was already redeemed','second redemption fails');
SELECT throws_ok($$INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',(SELECT id FROM public.supplier_contacts WHERE email='identity-supplier@test.invalid'),'b0000000-0000-0000-0000-000000000006',true)$$,'42501',NULL,'authenticated user cannot directly reproduce redemption'); RESET ROLE;

-- Active supplier identities cannot become internal identities in any role.
SELECT throws_ok($$INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004','viewer')$$,'23514','revoke supplier access before adding an internal membership','active supplier cannot become viewer');
SELECT throws_ok($$INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004','manager')$$,'23514','revoke supplier access before adding an internal membership','active supplier cannot become manager');
SELECT throws_ok($$INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004','admin')$$,'23514','revoke supplier access before adding an internal membership','active supplier cannot become admin');

-- Revocation authorization and durable history.
CREATE TEMP TABLE active_identity_access AS SELECT id,supplier_contact_id,invitation_id FROM public.supplier_access_memberships WHERE profile_id='b0000000-0000-0000-0000-000000000004' AND revoked_at IS NULL;
GRANT SELECT ON active_identity_access TO authenticated;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','identity-supplier@test.invalid')$$,'55000','supplier contact already has active portal access','active-access email cannot be invited');
SELECT throws_ok($$SELECT public.update_supplier_contact((SELECT supplier_contact_id FROM active_identity_access),'Changed','changed-active@test.invalid')$$,'55000',NULL,'active access blocks contact email change');
SELECT throws_ok($$SELECT public.delete_supplier_contact((SELECT supplier_contact_id FROM active_identity_access))$$,'55000',NULL,'active access blocks contact deletion'); RESET ROLE;
INSERT INTO public.products(id,organization_id,name,status) VALUES('b4000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','Identity Product','draft');
INSERT INTO public.lifecycle_stages(id,organization_id,product_id,supplier_id,stage_name) VALUES('b5000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Identity Stage');
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.get_my_supplier_access()),1::bigint,'active supplier receives workspace access');
SELECT lives_ok($$SELECT * FROM public.get_my_supplier_evidence_tasks()$$,'active supplier receives evidence tasks');
SELECT is(public.current_actor_can_upload_evidence('b5000000-0000-0000-0000-000000000001'),true,'active supplier has upload authorization');
SELECT is(public.current_actor_is_active_supplier_for('b2000000-0000-0000-0000-000000000001'),true,'current actor helper recognizes own active supplier');
SELECT is(public.current_actor_is_active_supplier_for('b2000000-0000-0000-0000-000000000002'),false,'current actor helper rejects another supplier');
CREATE TEMP TABLE identity_intent AS SELECT * FROM public.create_evidence_upload_intent('b5000000-0000-0000-0000-000000000001','certificate','identity.pdf','application/pdf',80);
SELECT pass('active supplier creates an evidence intent'); RESET ROLE;
UPDATE public.evidence_uploads SET status='pending_review',uploaded_at=now(),upload_expires_at=NULL WHERE id=(SELECT evidence_id FROM identity_intent);
INSERT INTO storage.objects(bucket_id,name,owner,metadata) SELECT bucket_id,storage_path,'b0000000-0000-0000-0000-000000000004','{"mimetype":"application/pdf","size":80}'::jsonb FROM identity_intent;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT is(public.current_actor_can_read_evidence_object('compliance_docs',(SELECT storage_path FROM identity_intent)),true,'active supplier has evidence read authorization');
SELECT is((SELECT count(*) FROM public.get_evidence_download_target((SELECT evidence_id FROM identity_intent))),1::bigint,'active supplier receives evidence download target'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000002','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$SELECT public.revoke_supplier_access(%L,'manager denied')$$,(SELECT id FROM active_identity_access)),'42501',NULL,'manager cannot revoke supplier access'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000003','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$SELECT public.revoke_supplier_access(%L,'viewer denied')$$,(SELECT id FROM active_identity_access)),'42501',NULL,'viewer cannot revoke supplier access'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$SELECT public.revoke_supplier_access(%L,'self denied')$$,(SELECT id FROM active_identity_access)),'42501',NULL,'supplier cannot revoke own access'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000005',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000005','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$SELECT public.revoke_supplier_access(%L,'cross tenant denied')$$,(SELECT id FROM active_identity_access)),'42501',NULL,'cross-tenant admin cannot revoke supplier access'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$SELECT public.revoke_supplier_access(%L,' ')$$,(SELECT id FROM active_identity_access)),'22023','revocation reason must be 3 to 500 characters','blank revocation reason denied');
SELECT throws_ok(format($$SELECT public.revoke_supplier_access(%L,'no')$$,(SELECT id FROM active_identity_access)),'22023','revocation reason must be 3 to 500 characters','short revocation reason denied'); RESET ROLE;

INSERT INTO public.supplier_invites(id,organization_id,supplier_id,email,token_hash,status,expires_at) VALUES
 ('b3000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','identity-supplier@test.invalid',repeat('1',64),'sent',now()+interval '1 day'),
 ('b3000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','unrelated@test.invalid',repeat('3',64),'sent',now()+interval '1 day');
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format($$SELECT public.revoke_supplier_access(%L,'  Contract   ended  ')$$,(SELECT id FROM active_identity_access)),'same-tenant admin revokes supplier access');
SELECT throws_ok(format($$SELECT public.revoke_supplier_access(%L,'again')$$,(SELECT id FROM active_identity_access)),'P0001','supplier access was already revoked','repeated supplier access revocation fails'); RESET ROLE;
SELECT ok((SELECT revoked_at IS NOT NULL AND revoked_by='b0000000-0000-0000-0000-000000000001' AND revocation_reason='Contract ended' FROM public.supplier_access_memberships WHERE id=(SELECT id FROM active_identity_access)),'revocation stores normalized reason, actor, and timestamp');
SELECT ok((SELECT profile_id='b0000000-0000-0000-0000-000000000004' AND supplier_contact_id=(SELECT supplier_contact_id FROM active_identity_access) AND invitation_id=(SELECT invitation_id FROM active_identity_access) FROM public.supplier_access_memberships WHERE id=(SELECT id FROM active_identity_access)),'revocation preserves profile, contact, and invitation history');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='supplier_access_revoked' AND entity_name=(SELECT id::text FROM active_identity_access)),1::bigint,'access revocation is audited exactly once');
SELECT ok((SELECT revoked_at IS NOT NULL FROM public.supplier_invites WHERE id='b3000000-0000-0000-0000-000000000001'),'usable related invitation is revoked');
SELECT ok((SELECT revoked_at IS NULL FROM public.supplier_invites WHERE id='b3000000-0000-0000-0000-000000000003'),'unrelated invitation is unchanged');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='supplier_invite_revoked_with_access' AND entity_name='b3000000-0000-0000-0000-000000000001'),1::bigint,'implicit invitation revocation is audited once');

-- The same supplier JWT immediately loses every database-backed authorization path.
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000004','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.get_my_supplier_access()),0::bigint,'revoked supplier receives no workspace access');
SELECT throws_ok($$SELECT * FROM public.get_my_supplier_evidence_tasks()$$,'42501','supplier portal access is not active','revoked supplier task query is denied');
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('b5000000-0000-0000-0000-000000000001','certificate','revoked.pdf','application/pdf',80)$$,'42501','not authorized','revoked supplier cannot create evidence intent');
SELECT is(public.current_actor_can_upload_evidence('b5000000-0000-0000-0000-000000000001'),false,'revoked supplier loses upload authorization');
SELECT is(public.current_actor_is_active_supplier_for('b2000000-0000-0000-0000-000000000001'),false,'current actor helper rejects revoked supplier');
SELECT is((SELECT count(*) FROM storage.objects WHERE name=(SELECT storage_path FROM identity_intent)),0::bigint,'revoked supplier cannot select Storage evidence');
SELECT is((SELECT count(*) FROM public.get_evidence_download_target((SELECT evidence_id FROM identity_intent))),0::bigint,'revoked supplier receives no evidence download target'); RESET ROLE;
SELECT is((SELECT count(*) FROM public.evidence_uploads WHERE id=(SELECT evidence_id FROM identity_intent)),1::bigint,'historical evidence remains after access revocation');
SELECT lives_ok($$INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004','viewer')$$,'revoked supplier profile can become internal');

-- Removing an internal identity permits a later invitation redemption, but never two active supplier identities.
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000007','viewer');
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE conversion_invite AS SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','conversion@test.invalid'); RESET ROLE;
DELETE FROM public.organization_members WHERE profile_id='b0000000-0000-0000-0000-000000000007';
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000007',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000007','email','conversion@test.invalid','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.redeem_supplier_invite(%L)',(SELECT token FROM conversion_invite)),'removed internal profile can redeem supplier access'); RESET ROLE;
INSERT INTO public.supplier_contacts(id,supplier_id,name,email) VALUES('b6000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','Second identity','second-identity@test.invalid');
SELECT throws_ok($$INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','b6000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000007',true)$$,'23505',NULL,'profile cannot hold multiple active supplier memberships');

-- Cross-tenant administration remains denied.
INSERT INTO public.supplier_contacts(id,supplier_id,name,email) VALUES('b6000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002','Tenant B contact','tenant-b@test.invalid');
INSERT INTO public.supplier_access_memberships(id,organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b7000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','b6000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000006',true);
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000005',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000005','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE tenant_b_invite AS SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000002','tenant-b-invite@test.invalid'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000002','Cross','cross2@test.invalid')$$,'42501',NULL,'tenant A cannot create tenant B contacts');
SELECT throws_ok($$SELECT public.update_supplier_contact('b6000000-0000-0000-0000-000000000001','Changed','changed@test.invalid')$$,'42501',NULL,'tenant A cannot update tenant B contacts');
SELECT throws_ok($$SELECT public.delete_supplier_contact('b6000000-0000-0000-0000-000000000001')$$,'42501',NULL,'tenant A cannot delete tenant B contacts');
SELECT throws_ok($$SELECT * FROM public.get_supplier_access_admin('b2000000-0000-0000-0000-000000000002')$$,'42501',NULL,'tenant A cannot inspect tenant B access'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.revoke_supplier_invite(%L)',(SELECT invitation_id FROM tenant_b_invite)),'42501',NULL,'tenant A cannot revoke tenant B invitation');
SELECT throws_ok($$SELECT public.revoke_supplier_access('b7000000-0000-0000-0000-000000000001','cross tenant')$$,'42501',NULL,'tenant A cannot revoke tenant B access');
SELECT throws_ok($$INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','b6000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000008',true)$$,'42501',NULL,'tenant A cannot establish tenant B supplier access'); RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
