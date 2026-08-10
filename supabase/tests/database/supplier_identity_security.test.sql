BEGIN;
SELECT plan(35);

SELECT has_table('public','supplier_access_memberships','supplier access membership table exists');
SELECT hasnt_column('public','supplier_contacts','profile_id','contact metadata is not an authorization credential');
SELECT has_column('public','supplier_access_memberships','revoked_at','membership supports revocation');
SELECT has_column('public','supplier_access_memberships','revocation_reason','membership preserves revocation reason');
SELECT has_index('public','supplier_access_memberships','supplier_access_active_profile_uidx','active profiles are unique');
SELECT has_index('public','supplier_access_memberships','supplier_access_active_contact_uidx','active contacts are unique');
SELECT has_index('public','supplier_access_memberships','supplier_access_invitation_uidx','an invitation has one membership');
SELECT has_check('public','supplier_access_memberships','supplier_access_provenance_check','membership provenance is enforced');
SELECT has_function('public','create_supplier_contact',ARRAY['uuid','text','text'],'contact creation uses a secured RPC');
SELECT has_function('public','update_supplier_contact',ARRAY['uuid','text','text'],'contact update uses a secured RPC');
SELECT has_function('public','delete_supplier_contact',ARRAY['uuid'],'contact deletion uses a secured RPC');
SELECT has_function('public','revoke_supplier_invite',ARRAY['uuid'],'pending invitations can be revoked');
SELECT has_function('public','revoke_supplier_access',ARRAY['uuid','text'],'supplier access can be revoked');
SELECT has_function('public','get_supplier_access_admin',ARRAY['uuid'],'safe access administration RPC exists');
SELECT is(has_table_privilege('authenticated','public.supplier_access_memberships','INSERT'),false,'authenticated cannot insert memberships');
SELECT is(has_table_privilege('authenticated','public.supplier_access_memberships','UPDATE'),false,'authenticated cannot update memberships');
SELECT is(has_table_privilege('authenticated','public.supplier_contacts','INSERT'),false,'authenticated cannot directly insert contacts');
SELECT is(has_table_privilege('authenticated','public.supplier_contacts','UPDATE'),false,'authenticated cannot directly update contacts');

SELECT like(pg_get_functiondef('public.prevent_dual_identity()'::regprocedure),'%supplier_profile_identity_lock%','both identity tables use the shared profile lock');
SELECT like(pg_get_functiondef('public.validate_supplier_contact_change()'::regprocedure),'%supplier_identity_lock%','contact changes use the invitation lifecycle lock');

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-admin@test.invalid'),
 ('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-manager@test.invalid'),
 ('b0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-viewer@test.invalid'),
 ('b0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-supplier@test.invalid'),
 ('b0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','identity-admin-b@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'b0000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('b1000000-0000-0000-0000-000000000001','Identity A'),('b1000000-0000-0000-0000-000000000002','Identity B');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','admin'),
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','manager'),
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000003','viewer'),
 ('b1000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000005','admin');
INSERT INTO public.suppliers(id,organization_id,name) VALUES
 ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','Identity Supplier A'),
 ('b2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000002','Identity Supplier B');

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001',' Alice ',' Alice@Example.Test ')$$,'admin creates a contact');
RESET ROLE;
SELECT is((SELECT email FROM public.supplier_contacts WHERE supplier_id='b2000000-0000-0000-0000-000000000001' AND name='Alice'),'alice@example.test','contact email is canonicalized');

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Bob','bob@example.test')$$,'manager creates a contact');
SELECT throws_ok($$SELECT public.delete_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='bob@example.test'))$$,'42501',NULL,'manager cannot delete contacts');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000003',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Denied','denied@example.test')$$,'42501',NULL,'viewer cannot create contacts');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000002','Cross','cross@example.test')$$,'42501',NULL,'cross-tenant manager cannot create contacts');
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Bad','not-an-email')$$,'22023',NULL,'invalid contact email is denied');
SELECT throws_ok($$SELECT public.create_supplier_contact('b2000000-0000-0000-0000-000000000001','Duplicate','ALICE@example.test')$$,'23505',NULL,'canonical duplicate contact is denied');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.delete_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='bob@example.test'))$$,'admin deletes a safe contact');
SELECT lives_ok($$SELECT * FROM public.create_supplier_invite('b2000000-0000-0000-0000-000000000001','alice@example.test')$$,'admin creates a pending invite');
SELECT throws_ok($$SELECT public.update_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'),'Alice','new@example.test')$$,'55000',NULL,'pending invitation prevents email change');
SELECT throws_ok($$SELECT public.delete_supplier_contact((SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'))$$,'55000',NULL,'pending invitation prevents contact deletion');
RESET ROLE;

SELECT throws_ok($$UPDATE public.supplier_contacts SET supplier_id='b2000000-0000-0000-0000-000000000002' WHERE email='alice@example.test'$$,'P0001','supplier contact supplier is immutable','supplier contact cannot move suppliers');
SELECT throws_ok($$INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES('b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',(SELECT id FROM public.supplier_contacts WHERE email='alice@example.test'),'b0000000-0000-0000-0000-000000000003',true)$$,'23514','remove internal membership before granting supplier access','internal identity cannot receive supplier access');
SELECT throws_ok($$INSERT INTO public.supplier_invites(organization_id,supplier_id,email,token_hash,status,expires_at) VALUES('b1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001','scope@example.test',repeat('a',64),'sent',now()+interval '1 day')$$,'23503',NULL,'invitation organization must match supplier');

SELECT * FROM finish();
ROLLBACK;
