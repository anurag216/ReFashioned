BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(16);
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
('91000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-admin@test.invalid'),
('91000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-manager@test.invalid'),
('91000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-viewer@test.invalid'),
('91000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-supplier@test.invalid'),
('91000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-suspended-admin@test.invalid'),
('91000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-deleting-admin@test.invalid'),
('91000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-tombstoned-admin@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE email LIKE 'profile-%';

-- Create tenants and memberships while every tenant is active. Production
-- authorization deliberately blocks adding/moving memberships into inactive tenants.
INSERT INTO public.organizations(id,name,lifecycle_status) VALUES
('92000000-0000-0000-0000-000000000001','Active profile tenant','active'),
('92000000-0000-0000-0000-000000000002','Suspended profile tenant','active'),
('92000000-0000-0000-0000-000000000003','Deleting profile tenant','active'),
('92000000-0000-0000-0000-000000000004','Tombstoned profile tenant','active');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','admin'),
('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000002','manager'),
('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000003','viewer'),
('92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000005','admin'),
('92000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000006','admin'),
('92000000-0000-0000-0000-000000000004','91000000-0000-0000-0000-000000000007','admin');
UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='92000000-0000-0000-0000-000000000002';
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='92000000-0000-0000-0000-000000000003';
UPDATE public.organizations SET lifecycle_status='tombstoned' WHERE id='92000000-0000-0000-0000-000000000004';

SELECT set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.update_organization_profile('  Pilot truth  ')$$,'admin updates own active organization');
SELECT is((SELECT name FROM public.organizations WHERE id='92000000-0000-0000-0000-000000000001'),'Pilot truth','name is trimmed');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE organization_id='92000000-0000-0000-0000-000000000001' AND action='organization_updated'),1::bigint,'one audit event emitted');
SELECT throws_ok($$SELECT public.update_organization_profile('   ')$$,'22023','organization name cannot be empty','whitespace rejected');
SELECT throws_ok($$SELECT public.update_organization_profile(repeat('x',121))$$,'22023','organization name cannot exceed 120 characters','long name rejected');
SELECT is((SELECT plan FROM public.organizations WHERE id='92000000-0000-0000-0000-000000000001'),'starter','RPC cannot change plan');
SELECT throws_ok($$UPDATE public.organizations SET plan='growth' WHERE id='92000000-0000-0000-0000-000000000001'$$,'42501',NULL,'direct plan update denied'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.update_organization_profile('Manager')$$,'42501','active organization administrator required','manager denied'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000003',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.update_organization_profile('Viewer')$$,'42501','active organization administrator required','viewer denied'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000004',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.update_organization_profile('Supplier')$$,'42501','active organization administrator required','supplier-only denied'); RESET ROLE;
SET LOCAL ROLE anon; SELECT throws_ok($$SELECT public.update_organization_profile('Anon')$$,'42501',NULL,'anonymous denied'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000005',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.update_organization_profile('No')$$,'42501','active organization administrator required','suspended denied'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000006',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.update_organization_profile('No')$$,'42501','active organization administrator required','deletion requested denied'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000007',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.update_organization_profile('No')$$,'42501','active organization administrator required','tombstoned denied'); RESET ROLE;

SELECT is((SELECT name FROM public.organizations WHERE id='92000000-0000-0000-0000-000000000002'),'Suspended profile tenant','active admin cannot target another tenant');
SELECT ok(NOT has_table_privilege('authenticated','public.organizations','UPDATE'),'authenticated organization update privilege revoked');
SELECT * FROM finish(); ROLLBACK;
