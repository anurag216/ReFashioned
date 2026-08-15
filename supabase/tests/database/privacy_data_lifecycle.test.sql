begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('public','privacy_erasure_requests','privacy request state is server-owned');
select row_security_is('public','privacy_erasure_requests',true,'privacy requests enforce RLS');
select has_function('public','request_personal_data_erasure',array[]::text[],'self-service request has no arbitrary subject parameter');
select function_privs_are('public','request_personal_data_erasure',array[]::text[],'authenticated',array['EXECUTE'],'authenticated may request own erasure');
select function_privs_are('private','prepare_personal_identity_erasure',array['uuid'],'authenticated',array[]::text[],'authenticated cannot prepare erasure');
select function_privs_are('private','complete_personal_identity_erasure',array['uuid'],'authenticated',array[]::text[],'authenticated cannot complete erasure');
select function_privs_are('private','purge_terminal_invitation_personal_data',array['timestamp with time zone'],'authenticated',array[]::text[],'clients cannot bulk-clean invitations');

select fk_ok('public','audit_logs','profile_id','public','profiles','id','audit profile FK remains valid');
select col_is_null('public','audit_logs','profile_id','audit actor is nullable for erasure');
select col_is_null('public','audit_events','actor_id','legacy audit actor is nullable for erasure');
select col_is_null('public','evidence_uploads','uploaded_by','preserved evidence can lose uploader identity');
select col_is_null('public','evidence_uploads','reviewed_by','preserved evidence can lose reviewer identity');
select col_is_null('public','certifications','created_by','preserved certification can lose creator identity');
select col_type_is('public','organizations','lifecycle_status','public.organization_lifecycle_status','tenant lifecycle is explicit');
select policies_are('public','privacy_erasure_requests',array['privacy_erasure_request_subject_read'],'only subject request read policy exists');

select * from finish();
rollback;
