BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-admin@test.invalid'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-manager@test.invalid'),
 ('b1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-viewer@test.invalid'),
 ('b1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-other@test.invalid'),
 ('b1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-supplier@test.invalid'),
 ('b1000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-suspended@test.invalid'),
 ('b1000000-0000-4000-8000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-deleting@test.invalid'),
 ('b1000000-0000-4000-8000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-tombstone@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'b1000000%';
INSERT INTO public.organizations(id,name,lifecycle_status) VALUES
 ('b2000000-0000-4000-8000-000000000001','Report tenant A','active'),('b2000000-0000-4000-8000-000000000002','Report tenant B','active'),
 ('b2000000-0000-4000-8000-000000000006','Suspended report tenant','active'),('b2000000-0000-4000-8000-000000000007','Deleting report tenant','active'),('b2000000-0000-4000-8000-000000000008','Tombstoned report tenant','active');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','admin'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','manager'),
 ('b3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','viewer'),
 ('b3000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000004','admin'),
 ('b3000000-0000-4000-8000-000000000006','b2000000-0000-4000-8000-000000000006','b1000000-0000-4000-8000-000000000006','admin'),
 ('b3000000-0000-4000-8000-000000000007','b2000000-0000-4000-8000-000000000007','b1000000-0000-4000-8000-000000000007','admin'),
 ('b3000000-0000-4000-8000-000000000008','b2000000-0000-4000-8000-000000000008','b1000000-0000-4000-8000-000000000008','admin');
UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='b2000000-0000-4000-8000-000000000006';
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='b2000000-0000-4000-8000-000000000007';
UPDATE public.organizations SET lifecycle_status='tombstoned' WHERE id='b2000000-0000-4000-8000-000000000008';
INSERT INTO public.suppliers(id,organization_id,name,status,contact_name) VALUES ('b6000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','A factual supplier','active','Private Contact'),('b6000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Secret tenant B supplier','active','Other Private Contact');
INSERT INTO public.supplier_contacts(id,supplier_id,name,email) VALUES ('b6100000-0000-4000-8000-000000000005','b6000000-0000-4000-8000-000000000001','Supplier user','report-supplier@test.invalid');
INSERT INTO public.supplier_access_memberships(id,organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES ('b6200000-0000-4000-8000-000000000005','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b6100000-0000-4000-8000-000000000005','b1000000-0000-4000-8000-000000000005',true);
INSERT INTO public.products(id,organization_id,name,sku,status) VALUES ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Tenant A product','A-1','draft'),('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Tenant B secret product','B-1','draft');

SELECT plan(31);
SELECT has_function('public','get_organization_sustainability_report',ARRAY[]::text[],'report RPC exists');
SELECT ok((SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid='public.get_organization_sustainability_report()'::regprocedure),'report is security definer');
SELECT ok((SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_catalog.pg_proc WHERE oid='public.get_organization_sustainability_report()'::regprocedure),'report has fixed search path');
SELECT ok(NOT has_function_privilege('anon','public.get_organization_sustainability_report()','EXECUTE'),'anonymous role has no report execute grant');
SELECT ok(has_function_privilege('authenticated','public.get_organization_sustainability_report()','EXECUTE'),'authenticated ACL includes report');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT is(public.get_organization_sustainability_report()->'organization'->>'name','Report tenant A','admin reads own report');
SELECT is((public.get_organization_sustainability_report()->>'tracked_product_count')::int,1,'admin report contains own product only');
SELECT ok(public.get_organization_sustainability_report()::text !~ 'Tenant B|secret product|Secret tenant','cross-tenant values never appear');
SELECT ok(public.get_organization_sustainability_report()::text !~ 'Private Contact|report-supplier@','supplier contact PII is absent');
SELECT ok(public.get_organization_sustainability_report()::text !~ 'storage_path|storage_bucket|evidence/','evidence storage identifiers are absent');
SELECT ok(public.get_organization_sustainability_report()->'recorded_co2_kg' = 'null'::jsonb,'missing CO2 is JSON null');
SELECT ok(public.get_organization_sustainability_report()->'recorded_water_l' = 'null'::jsonb,'missing water is JSON null');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SELECT is(public.get_organization_sustainability_report()->'organization'->>'name','Report tenant A','manager reads report');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
SELECT is(public.get_organization_sustainability_report()->'organization'->>'name','Report tenant A','viewer reads report');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000005',true);
SELECT throws_ok($$SELECT public.get_organization_sustainability_report()$$,'42501','active organization membership required','supplier-only identity denied');
SELECT set_config('request.jwt.claim.sub','',true);
SELECT throws_ok($$SELECT public.get_organization_sustainability_report()$$,'28000','authentication required','unauthenticated caller denied');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000006',true);
SELECT throws_ok($$SELECT public.get_organization_sustainability_report()$$,'42501','active organization membership required','suspended tenant denied');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000007',true);
SELECT throws_ok($$SELECT public.get_organization_sustainability_report()$$,'42501','active organization membership required','deletion-requested tenant denied');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000008',true);
SELECT throws_ok($$SELECT public.get_organization_sustainability_report()$$,'42501','active organization membership required','tombstoned tenant denied');

INSERT INTO public.lifecycle_stages(id,organization_id,product_id,supplier_id,stage_name,stage_order,co2_impact_kg,water_usage_l) VALUES ('b7000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','Recorded stage',1,124.5,880),('b7000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','Missing stage',2,NULL,NULL);
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT is((public.get_organization_sustainability_report()->>'recorded_co2_kg')::numeric,124.5,'stored CO2 returned exactly');
SELECT is((public.get_organization_sustainability_report()->>'recorded_water_l')::numeric,880::numeric,'stored water returned exactly');
SELECT is((public.get_organization_sustainability_report()->>'co2_observation_count')::int,1,'CO2 observation count excludes missing value');
SELECT is((public.get_organization_sustainability_report()->>'water_observation_count')::int,1,'water observation count excludes missing value');

INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result,reviewed_by,reviewed_at) VALUES ('b8000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','private/report.pdf','certificate','approved','b1000000-0000-4000-8000-000000000001','report.pdf','application/pdf',10,repeat('d',64),'clean',now(),now(),'test','clean','b1000000-0000-4000-8000-000000000001',now());
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes) VALUES ('b8000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000002','private/quarantine.pdf','certificate','quarantined','b1000000-0000-4000-8000-000000000001','quarantine.pdf','application/pdf',10);
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result) VALUES ('b8000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000002','private/pending.pdf','test_report','pending_review','b1000000-0000-4000-8000-000000000001','pending.pdf','application/pdf',10,repeat('e',64),'clean',now(),now(),'test','clean');
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,content_sha256,scan_status,scan_started_at,scan_completed_at,scan_engine,scan_result,reviewed_by,reviewed_at,rejection_reason) VALUES ('b8000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000002','private/rejected.pdf','test_report','rejected','b1000000-0000-4000-8000-000000000001','rejected.pdf','application/pdf',10,repeat('f',64),'clean',now(),now(),'test','clean','b1000000-0000-4000-8000-000000000001',now(),'not acceptable');
SELECT is((public.get_organization_sustainability_report()->>'trusted_evidence_count')::int,1,'only approved clean fingerprinted evidence is trusted');
SELECT is((public.get_organization_sustainability_report()->>'quarantined_evidence_count')::int,1,'quarantined evidence is reported but not trusted');
SELECT is((public.get_organization_sustainability_report()->>'pending_evidence_count')::int,1,'pending-review evidence is not trusted');
SELECT is((public.get_organization_sustainability_report()->>'rejected_evidence_count')::int,1,'rejected evidence is not trusted');
INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by) VALUES ('b9000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','Current fact',current_date+30,'verified','b1000000-0000-4000-8000-000000000001');
SELECT is((public.get_organization_sustainability_report()->>'valid_certification_count')::int,1,'current evidence-backed certification counts');
INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by) VALUES ('b9000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','Expired fact',current_date-1,'verified','b1000000-0000-4000-8000-000000000001');
SELECT is((public.get_organization_sustainability_report()->>'valid_certification_count')::int,1,'expired certification is not represented as valid');
UPDATE public.certifications SET verification_status='revoked',revoked_at=now(),revoked_by='b1000000-0000-4000-8000-000000000001' WHERE id='b9000000-0000-4000-8000-000000000001';
SELECT is((public.get_organization_sustainability_report()->>'valid_certification_count')::int,0,'revoked certification is not valid');
SELECT is((public.get_organization_sustainability_report()->>'trusted_evidence_count')::int,1,'untrusted evidence states never inflate the trusted count');
SELECT * FROM finish();
ROLLBACK;
