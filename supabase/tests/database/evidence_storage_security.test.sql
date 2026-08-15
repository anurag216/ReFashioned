BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(65);

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e-admin@test.invalid'),
 ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e-manager@test.invalid'),
 ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e-viewer@test.invalid'),
 ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e-admin-b@test.invalid'),
 ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e-supplier@test.invalid'),
 ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e-supplier-b@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'a0000000%';
INSERT INTO public.organizations(id,name) VALUES
 ('a1000000-0000-0000-0000-000000000001','Evidence Tenant A'),
 ('a1000000-0000-0000-0000-000000000002','Evidence Tenant B');
INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','admin'),
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','manager'),
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','viewer'),
 ('a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004','admin');
INSERT INTO public.products(id,organization_id,name,status) VALUES
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Evidence Product','draft'),
 ('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','Other Product','draft'),
 ('a2000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','Archived Product','archived');
INSERT INTO public.suppliers(id,organization_id,name) VALUES
 ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Evidence Supplier'),
 ('a3000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','Other Supplier');
INSERT INTO public.supplier_contacts(id,supplier_id,name,email) VALUES
 ('a3100000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','Supplier A','e-supplier@test.invalid'),
 ('a3100000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000002','Supplier B','e-supplier-b@test.invalid');
INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES
 ('a1000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','a3100000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',true),
 ('a1000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000002','a3100000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000006',true);
INSERT INTO public.lifecycle_stages(id,organization_id,product_id,supplier_id,stage_name) VALUES
 ('a4000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','Evidence Stage'),
 ('a4000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000002','Other Stage'),
 ('a4000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001',NULL,'Unassigned Stage'),
 ('a4000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000003','a3000000-0000-0000-0000-000000000001','Archived Stage');
INSERT INTO storage.buckets(id,name,public) VALUES('other_private','other_private',false);

-- Configuration, grants, and schema invariants (the original structural coverage).
SELECT ok(EXISTS(SELECT 1 FROM storage.buckets WHERE id='compliance_docs'),'bucket exists');
SELECT is((SELECT public FROM storage.buckets WHERE id='compliance_docs'),false,'bucket is private');
SELECT is((SELECT file_size_limit FROM storage.buckets WHERE id='compliance_docs'),10485760::bigint,'10 MiB limit');
SELECT is((SELECT allowed_mime_types FROM storage.buckets WHERE id='compliance_docs'),ARRAY['application/pdf','image/png','image/jpeg']::text[],'safe MIME allowlist');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND (coalesce(qual,'') ILIKE '%compliance_docs%' OR coalesce(with_check,'') ILIKE '%compliance_docs%')),2::bigint,'only two bucket policies');
SELECT unlike((SELECT with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='compliance_docs_insert'),'%metadata%','Storage INSERT policy does not require preflight metadata');
SELECT like((SELECT with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='compliance_docs_insert'),'%owner_id%','Storage INSERT policy requires supported owner_id');
SELECT ok(NOT has_table_privilege('authenticated','public.evidence_uploads','INSERT'),'direct evidence insert revoked');
SELECT ok(NOT has_table_privilege('authenticated','public.evidence_uploads','UPDATE'),'direct evidence update revoked');
SELECT ok(NOT has_table_privilege('authenticated','public.certifications','INSERT'),'direct certification insert revoked');
SELECT ok(NOT has_table_privilege('authenticated','public.certifications','UPDATE'),'direct certification update revoked');
SELECT has_function('public','current_actor_can_upload_evidence',ARRAY['uuid'],'current-actor upload helper exists');
SELECT has_function('public','current_actor_can_read_evidence_object',ARRAY['text','text'],'current-actor read helper exists');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('evidence_actor_authorized','can_read_evidence_object')),'no arbitrary-actor helper');
SELECT ok(NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='evidence_uploads' AND column_name='file_url'),'file_url removed');
SELECT ok(NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lifecycle_stages' AND column_name='certificate_url'),'certificate_url removed');
SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conname='lifecycle_stage_product_scope_fkey'),'product scope FK exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conname='lifecycle_stage_supplier_scope_fkey'),'supplier scope FK exists');
SELECT throws_ok($$INSERT INTO public.lifecycle_stages(organization_id,product_id,supplier_id,stage_name) VALUES('a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000002','bad')$$,'23503',NULL,'cross-tenant supplier stage rejected');
SELECT throws_ok($$INSERT INTO public.lifecycle_stages(organization_id,product_id,supplier_id,stage_name) VALUES('a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000001','bad')$$,'23503',NULL,'cross-tenant product stage rejected');

-- Intent authorization and validation through real authenticated execution.
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000003',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','viewer.pdf','application/pdf',100)$$,'42501',NULL,'viewer cannot create intent'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000004',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','cross.pdf','application/pdf',100)$$,'42501',NULL,'cross-tenant admin cannot create intent'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000006',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','wrong.pdf','application/pdf',100)$$,'42501',NULL,'wrong supplier cannot create intent'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000003','certificate','none.pdf','application/pdf',100)$$,'P0001','lifecycle stage has no supplier','unassigned stage rejected');
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000004','certificate','old.pdf','application/pdf',100)$$,'P0001','archived products cannot receive evidence','archived product rejected');
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','../bad.pdf','application/pdf',100)$$,'P0001','invalid filename','path separator rejected');
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','bad.svg','image/svg+xml',100)$$,'P0001','filename extension and MIME type must agree','SVG rejected');
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','bad.png','application/pdf',100)$$,'P0001','filename extension and MIME type must agree','extension mismatch rejected');
SELECT throws_ok($$SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','large.pdf','application/pdf',10485761)$$,'P0001','file size must be between 1 byte and 10 MiB','oversize rejected');
CREATE TEMP TABLE admin_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','admin.pdf','application/pdf',100);
CREATE TEMP TABLE expired_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','expired.pdf','application/pdf',100);
CREATE TEMP TABLE cancelled_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','cancelled.pdf','application/pdf',100);
SELECT pass('admin creates upload intent');
SELECT ok((SELECT storage_path ~ '^evidence/[0-9a-f-]{36}/[0-9a-f]{64}\.pdf$' AND storage_path !~ 'admin' FROM admin_intent),'path is opaque and excludes filename');
SELECT is((SELECT bucket_id FROM admin_intent),'compliance_docs','bucket is server controlled');
SELECT throws_ok($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs','arbitrary.pdf','1','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001')$$,'42501',NULL,'metadata-less arbitrary Storage preflight denied');
SELECT throws_ok(format($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('other_private',%L,'1','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001')$$,(SELECT storage_path FROM admin_intent)),'42501',NULL,'metadata-less wrong-bucket Storage preflight denied');
RESET ROLE;
UPDATE public.evidence_uploads SET upload_expires_at=now()-interval '1 second' WHERE id=(SELECT evidence_id FROM expired_intent);
DELETE FROM public.evidence_uploads WHERE id=(SELECT evidence_id FROM cancelled_intent);
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs',%L,'1','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001')$$,(SELECT storage_path FROM expired_intent)),'42501',NULL,'metadata-less expired-intent Storage preflight denied');
SELECT throws_ok(format($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs',%L,'1','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001')$$,(SELECT storage_path FROM cancelled_intent)),'42501',NULL,'metadata-less cancelled-intent Storage preflight denied');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000004',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs',%L,'1','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004')$$,(SELECT storage_path FROM admin_intent)),'42501',NULL,'metadata-less cross-tenant actor Storage preflight denied');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok(format($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs',%L,'1','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001')$$,(SELECT storage_path FROM admin_intent)),'metadata-less exact Storage preflight succeeds');
RESET ROLE;
DELETE FROM storage.objects WHERE bucket_id='compliance_docs' AND name=(SELECT storage_path FROM admin_intent);
INSERT INTO storage.objects(bucket_id,name,owner,owner_id,metadata) VALUES('compliance_docs',(SELECT storage_path FROM admin_intent),'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','{"mimetype":"application/pdf","size":100}');
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM admin_intent)),'valid object finalizes');
RESET ROLE;
SELECT is((SELECT status FROM public.evidence_uploads WHERE id=(SELECT evidence_id FROM admin_intent)),'pending_review','finalization enters pending review');
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM admin_intent)),'P0001','upload intent is not pending','duplicate finalization fails');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='evidence_upload_finalized' AND entity_name=(SELECT evidence_id::text FROM admin_intent)),1::bigint,'finalization audited once');

-- Finalization validates the privileged server's completed object against the intent.
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
CREATE TEMP TABLE wrong_owner_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','owner.pdf','application/pdf',100);
CREATE TEMP TABLE wrong_mime_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','mime.pdf','application/pdf',100);
CREATE TEMP TABLE wrong_size_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','size.pdf','application/pdf',100);
CREATE TEMP TABLE missing_object_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','missing.pdf','application/pdf',100);
CREATE TEMP TABLE expired_finalize_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','late.pdf','application/pdf',100);
RESET ROLE;
INSERT INTO storage.objects(bucket_id,name,owner,owner_id,metadata) VALUES
 ('compliance_docs',(SELECT storage_path FROM wrong_owner_intent),'a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','{"mimetype":"application/pdf","size":100}'),
 ('compliance_docs',(SELECT storage_path FROM wrong_mime_intent),'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','{"mimetype":"image/png","size":100}'),
 ('compliance_docs',(SELECT storage_path FROM wrong_size_intent),'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','{"mimetype":"application/pdf","size":99}'),
 ('compliance_docs',(SELECT storage_path FROM expired_finalize_intent),'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','{"mimetype":"application/pdf","size":100}');
UPDATE public.evidence_uploads SET upload_expires_at=now()-interval '1 second' WHERE id=(SELECT evidence_id FROM expired_finalize_intent);
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM wrong_owner_intent)),'P0001','storage object owner mismatch','wrong owner_id cannot finalize');
SELECT throws_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM wrong_mime_intent)),'P0001','storage object metadata mismatch','wrong actual MIME cannot finalize');
SELECT throws_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM wrong_size_intent)),'P0001','storage object metadata mismatch','wrong actual size cannot finalize');
SELECT throws_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM missing_object_intent)),'P0001','exactly one uploaded object is required','missing Storage object cannot finalize');
SELECT throws_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM expired_finalize_intent)),'P0001','upload intent expired','expired intent cannot finalize');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true); SET LOCAL ROLE authenticated;
CREATE TEMP TABLE revoked_finalize_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','certificate','revoked.pdf','application/pdf',100);
RESET ROLE;
INSERT INTO storage.objects(bucket_id,name,owner,owner_id,metadata) VALUES('compliance_docs',(SELECT storage_path FROM revoked_finalize_intent),'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005','{"mimetype":"application/pdf","size":100}');
UPDATE public.supplier_access_memberships SET revoked_at=now(),revoked_by='a0000000-0000-0000-0000-000000000001',revocation_reason='finalization test' WHERE profile_id='a0000000-0000-0000-0000-000000000005';
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format('SELECT public.finalize_evidence_upload(%L)',(SELECT evidence_id FROM revoked_finalize_intent)),'42501','authorization is no longer valid','revoked supplier cannot finalize uploaded bytes');
RESET ROLE;
UPDATE public.supplier_access_memberships SET revoked_at=NULL,revoked_by=NULL,revocation_reason=NULL WHERE profile_id='a0000000-0000-0000-0000-000000000005';

-- Active authorization is re-evaluated during every metadata-less preflight.
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,upload_expires_at) VALUES
 ('a5000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000002','a4000000-0000-0000-0000-000000000002','evidence/a5000000-0000-0000-0000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf','certificate','upload_pending','a0000000-0000-0000-0000-000000000005','different.pdf','application/pdf',100,now()+interval '15 minutes'),
 ('a5000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000004','evidence/a5000000-0000-0000-0000-000000000002/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf','certificate','upload_pending','a0000000-0000-0000-0000-000000000005','archived.pdf','application/pdf',100,now()+interval '15 minutes');
UPDATE public.supplier_access_memberships SET revoked_at=now(),revoked_by='a0000000-0000-0000-0000-000000000001',revocation_reason='preflight test' WHERE profile_id='a0000000-0000-0000-0000-000000000005';
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs',%L,'1','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005')$$,(SELECT storage_path FROM revoked_finalize_intent)),'42501',NULL,'revoked supplier metadata-less preflight denied');
RESET ROLE;
UPDATE public.supplier_access_memberships SET revoked_at=NULL,revoked_by=NULL,revocation_reason=NULL WHERE profile_id='a0000000-0000-0000-0000-000000000005';
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs','evidence/a5000000-0000-0000-0000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf','1','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005')$$,'42501',NULL,'different-supplier metadata-less preflight denied');
SELECT throws_ok($$INSERT INTO storage.objects(bucket_id,name,version,owner,owner_id) VALUES('compliance_docs','evidence/a5000000-0000-0000-0000-000000000002/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf','1','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005')$$,'42501',NULL,'archived-product metadata-less preflight denied');
RESET ROLE;

-- Read isolation, review, certification, and cancellation.
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000003',true); SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM storage.objects WHERE name=(SELECT storage_path FROM admin_intent)),1::bigint,'same-tenant viewer reads finalized object'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000004',true); SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM storage.objects WHERE name=(SELECT storage_path FROM admin_intent)),0::bigint,'cross-tenant raw path knowledge grants no read');
SELECT is((SELECT count(*) FROM public.get_evidence_download_target((SELECT evidence_id FROM admin_intent))),0::bigint,'cross-tenant download target hidden'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
SELECT lives_ok(format($$SELECT public.review_evidence_upload(%L,'approved',NULL)$$,(SELECT evidence_id FROM admin_intent)),'manager approves pending evidence');
RESET ROLE;
SELECT ok((SELECT reviewed_by='a0000000-0000-0000-0000-000000000002' AND reviewed_at IS NOT NULL FROM public.evidence_uploads WHERE id=(SELECT evidence_id FROM admin_intent)),'approval records reviewer and time');
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
CREATE TEMP TABLE certification AS SELECT public.create_certification_from_evidence((SELECT evidence_id FROM admin_intent),' Organic Standard ',current_date+30) id;
RESET ROLE;
SELECT ok((SELECT c.organization_id='a1000000-0000-0000-0000-000000000001' AND c.supplier_id='a3000000-0000-0000-0000-000000000001' AND c.verification_status='verified' FROM public.certifications c WHERE c.id=(SELECT id FROM certification)),'certification scope and verified state derived');
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$SELECT public.create_certification_from_evidence(%L,'Duplicate',current_date+30)$$,(SELECT evidence_id FROM admin_intent)),'23505',NULL,'duplicate active certification rejected');
SELECT lives_ok(format('SELECT public.revoke_certification(%L)',(SELECT id FROM certification)),'manager revokes certification');
RESET ROLE;
SELECT ok((SELECT verification_status='revoked' AND revoked_by='a0000000-0000-0000-0000-000000000002' AND revoked_at IS NOT NULL FROM public.certifications WHERE id=(SELECT id FROM certification)),'revocation records actor and time');

SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true); SET LOCAL ROLE authenticated;
CREATE TEMP TABLE supplier_intent AS SELECT * FROM public.create_evidence_upload_intent('a4000000-0000-0000-0000-000000000001','test_report','supplier.pdf','application/pdf',90);
SELECT pass('linked supplier creates own-stage intent');
SELECT lives_ok(format('SELECT public.cancel_evidence_upload_intent(%L)',(SELECT evidence_id FROM supplier_intent)),'uploader cancels pending intent');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.evidence_uploads WHERE id=(SELECT evidence_id FROM supplier_intent)),0::bigint,'cancel removes only intent record');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='evidence_upload_intent_cancelled' AND entity_name=(SELECT evidence_id::text FROM supplier_intent)),1::bigint,'cancellation audited once');
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true); SET LOCAL ROLE authenticated;
SELECT throws_ok(format($$SELECT public.review_evidence_upload(%L,'approved',NULL)$$,(SELECT evidence_id FROM admin_intent)),'42501',NULL,'supplier cannot review evidence'); RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
