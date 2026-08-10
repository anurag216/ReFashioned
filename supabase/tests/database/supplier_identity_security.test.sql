BEGIN;
SELECT plan(18);

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

SELECT * FROM finish();
ROLLBACK;
