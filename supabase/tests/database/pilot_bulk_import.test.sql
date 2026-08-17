BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','import-admin@test.invalid'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','import-manager@test.invalid'),
 ('b1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','import-viewer@test.invalid'),
 ('b1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','import-admin-b@test.invalid'),
 ('b1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','import-supplier@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'b1000000%';
INSERT INTO public.organizations(id,name) VALUES ('b2000000-0000-4000-8000-000000000001','Import A'),('b2000000-0000-4000-8000-000000000002','Import B');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','admin'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','manager'),
 ('b3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','viewer'),
 ('b3000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000004','admin');

SELECT plan(44);
SELECT has_table('public','pilot_import_batches','batch staging exists');
SELECT has_table('public','pilot_import_rows','row staging exists');
SELECT has_function('private','pilot_import_context',ARRAY['uuid'],'implementation helper is private');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl WHERE p.oid='private.pilot_import_context(uuid)'::regprocedure AND acl.grantee=0 AND acl.privilege_type='EXECUTE'),'private helper denies PUBLIC');
SELECT ok(NOT has_function_privilege('anon','private.pilot_import_context(uuid)','EXECUTE'),'private helper denies anon');
SELECT ok(NOT has_function_privilege('authenticated','private.pilot_import_context(uuid)','EXECUTE'),'private helper denies authenticated');
SELECT ok(NOT has_function_privilege('anon','public.create_pilot_import_batch(text,text)','EXECUTE'),'anon cannot create import');
SELECT ok(has_function_privilege('authenticated','public.create_pilot_import_batch(text,text)','EXECUTE'),'authenticated API role can reach authorized RPC');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
SELECT throws_ok($$SELECT public.create_pilot_import_batch('products','x.csv')$$,'42501','import not found or not authorized','viewer cannot import');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000005',true);
SELECT throws_ok($$SELECT public.create_pilot_import_batch('products','x.csv')$$,'42501','import not found or not authorized','supplier-only identity denied');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SELECT lives_ok($$SELECT public.create_pilot_import_batch('products','manager.csv')$$,'manager can create import');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT set_config('test.products_batch',public.create_pilot_import_batch('products','products.csv')::text,true);
SELECT lives_ok($$SELECT public.stage_pilot_import_rows(current_setting('test.products_batch')::uuid,'[{"name":"Imported tee","sku":"IMP-1","status":"draft"}]')$$,'admin stages products');
SELECT is(public.validate_pilot_import_batch(current_setting('test.products_batch')::uuid)->>'status','validated','valid product validates');
SELECT is(public.commit_pilot_import_batch(current_setting('test.products_batch')::uuid)->>'status','completed','valid product import succeeds');
SELECT ok(EXISTS(SELECT 1 FROM public.products WHERE organization_id='b2000000-0000-4000-8000-000000000001' AND sku='IMP-1'),'product reached core table');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.pilot_import_rows WHERE batch_id=current_setting('test.products_batch')::uuid AND raw_payload IS NOT NULL),'completed import scrubs raw payloads');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.pilot_import_rows WHERE batch_id=current_setting('test.products_batch')::uuid AND normalized_payload IS NOT NULL),'completed import scrubs normalized payloads');
SELECT throws_ok(format('SELECT public.commit_pilot_import_batch(%L::uuid)',current_setting('test.products_batch')),'55000','batch is not valid for commit','same batch cannot commit twice');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000004',true);
SELECT throws_ok(format('SELECT public.get_pilot_import_batch(%L::uuid)',current_setting('test.products_batch')),'42501','import not found or not authorized','Tenant B cannot access Tenant A batch');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT set_config('test.suppliers_batch',public.create_pilot_import_batch('suppliers','suppliers.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.suppliers_batch')::uuid,'[{"supplier_reference":" SUP-1 ","name":"Pilot supplier","contact_name":"Private Person","contact_email":"private@example.com"}]');
SELECT public.validate_pilot_import_batch(current_setting('test.suppliers_batch')::uuid);
SELECT is(public.commit_pilot_import_batch(current_setting('test.suppliers_batch')::uuid)->>'created_count','1','valid supplier import succeeds');
SELECT ok(EXISTS(SELECT 1 FROM public.suppliers WHERE organization_id='b2000000-0000-4000-8000-000000000001' AND external_reference='SUP-1'),'stable supplier reference stored');
SELECT ok(EXISTS(SELECT 1 FROM public.supplier_contacts c JOIN public.suppliers s ON s.id=c.supplier_id WHERE s.external_reference='SUP-1' AND c.email='private@example.com'),'supplier contact uses canonical contact workflow');
SELECT set_config('test.material_batch',public.create_pilot_import_batch('product_materials','materials.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.material_batch')::uuid,'[{"product_sku":"IMP-1","material_name":"Cotton","composition_percentage":"60"},{"product_sku":"IMP-1","material_name":"Linen","composition_percentage":"50"}]');
SELECT is(public.validate_pilot_import_batch(current_setting('test.material_batch')::uuid)->>'status','failed_validation','material total over 100 rejected');
SELECT throws_ok(format('SELECT public.commit_pilot_import_batch(%L::uuid)',current_setting('test.material_batch')),'55000','batch is not valid for commit','invalid batch cannot commit');
SELECT set_config('test.material_ok',public.create_pilot_import_batch('product_materials','material-ok.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.material_ok')::uuid,'[{"product_sku":"IMP-1","material_name":"Cotton","composition_percentage":"100"}]');
SELECT public.validate_pilot_import_batch(current_setting('test.material_ok')::uuid);
SELECT is(public.commit_pilot_import_batch(current_setting('test.material_ok')::uuid)->>'created_count','1','valid material import succeeds');
SELECT set_config('test.life_bad',public.create_pilot_import_batch('lifecycle_stages','negative.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.life_bad')::uuid,'[{"product_sku":"IMP-1","supplier_reference":"SUP-1","stage_name":"Sewing","stage_order":"1","co2_impact_kg":"-1","water_usage_l":""}]');
SELECT is(public.validate_pilot_import_batch(current_setting('test.life_bad')::uuid)->>'status','failed_validation','negative impact rejected');
SELECT set_config('test.life_ok',public.create_pilot_import_batch('lifecycle_stages','lifecycle.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.life_ok')::uuid,'[{"product_sku":"IMP-1","supplier_reference":"SUP-1","stage_name":"Sewing","stage_order":"1","co2_impact_kg":"","water_usage_l":""}]');
SELECT public.validate_pilot_import_batch(current_setting('test.life_ok')::uuid);
SELECT is(public.commit_pilot_import_batch(current_setting('test.life_ok')::uuid)->>'created_count','1','valid lifecycle import succeeds');
SELECT ok(EXISTS(SELECT 1 FROM public.lifecycle_stages WHERE organization_id='b2000000-0000-4000-8000-000000000001' AND co2_impact_kg IS NULL AND water_usage_l IS NULL),'blank impacts remain NULL');
SELECT set_config('test.cancelled',public.create_pilot_import_batch('products','cancel.csv')::text,true);
SELECT public.cancel_pilot_import_batch(current_setting('test.cancelled')::uuid);
SELECT throws_ok(format('SELECT public.commit_pilot_import_batch(%L::uuid)',current_setting('test.cancelled')),'55000','batch is not valid for commit','cancelled import cannot commit');
SELECT ok(EXISTS(SELECT 1 FROM public.audit_logs WHERE action='pilot_import_completed' AND entity_name !~ 'Private Person|private@example.com|Imported tee'),'audit metadata excludes raw CSV and PII');

-- Historical creator attribution must not block PR17 profile erasure.
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES('b1000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','erased-importer@test.invalid');
INSERT INTO public.profiles(id,email) VALUES('b1000000-0000-4000-8000-000000000006','erased-importer@test.invalid');
INSERT INTO public.pilot_import_batches(id,organization_id,created_by,import_type,file_name,status) VALUES('b9000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000006','products','historical.csv','cancelled');
DELETE FROM public.profiles WHERE id='b1000000-0000-4000-8000-000000000006';
SELECT ok(EXISTS(SELECT 1 FROM public.pilot_import_batches WHERE id='b9000000-0000-4000-8000-000000000001'),'creator erasure preserves historical batch');
SELECT ok((SELECT created_by IS NULL FROM public.pilot_import_batches WHERE id='b9000000-0000-4000-8000-000000000001'),'creator attribution is nulled on erasure');

SELECT set_config('test.invalid_cert',public.create_pilot_import_batch('product_materials','invalid-cert.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.invalid_cert')::uuid,'[{"product_sku":"IMP-1","material_name":"Hemp","composition_percentage":"1","certification_required":"maybe"}]');
SELECT is(public.validate_pilot_import_batch(current_setting('test.invalid_cert')::uuid)->>'status','failed_validation','unknown certification_required token is rejected');
SELECT set_config('test.existing_total',public.create_pilot_import_batch('product_materials','existing-total.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.existing_total')::uuid,'[{"product_sku":"IMP-1","material_name":"Hemp","composition_percentage":"1","certification_required":"false"}]');
SELECT is(public.validate_pilot_import_batch(current_setting('test.existing_total')::uuid)->>'status','failed_validation','existing plus imported material total over 100 is rejected');

INSERT INTO public.products(id,organization_id,name,sku,status) VALUES('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Tenant B product','PRIVATE-B','draft');
INSERT INTO public.suppliers(id,organization_id,name,external_reference) VALUES('b6000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Tenant B supplier','PRIVATE-SUP-B');
SELECT set_config('test.cross_scope',public.create_pilot_import_batch('lifecycle_stages','cross.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.cross_scope')::uuid,'[{"product_sku":"PRIVATE-B","supplier_reference":"PRIVATE-SUP-B","stage_name":"Private","stage_order":"1"}]');
SELECT public.validate_pilot_import_batch(current_setting('test.cross_scope')::uuid);
SELECT ok((SELECT validation_errors ? 'Unknown product_sku: PRIVATE-B' FROM public.pilot_import_rows WHERE batch_id=current_setting('test.cross_scope')::uuid),'Tenant B product does not resolve in Tenant A import');
SELECT ok((SELECT validation_errors ? 'Unknown supplier_reference: PRIVATE-SUP-B' FROM public.pilot_import_rows WHERE batch_id=current_setting('test.cross_scope')::uuid),'Tenant B supplier does not resolve in Tenant A import');

SELECT set_config('test.duplicate_lifecycle',public.create_pilot_import_batch('lifecycle_stages','duplicate-lifecycle.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.duplicate_lifecycle')::uuid,'[{"product_sku":"IMP-1","supplier_reference":"SUP-1","stage_name":"Again","stage_order":"1"}]');
SELECT is(public.validate_pilot_import_batch(current_setting('test.duplicate_lifecycle')::uuid)->>'status','failed_validation','existing product and stage_order lifecycle key is rejected');

SELECT set_config('test.inactive_batch',public.create_pilot_import_batch('products','inactive.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.inactive_batch')::uuid,'[{"name":"Inactive","sku":"INACTIVE-1"}]');
UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='b2000000-0000-4000-8000-000000000001';
SELECT throws_ok(format('SELECT public.get_pilot_import_batch(%L::uuid)',current_setting('test.inactive_batch')),'42501','import not found or not authorized','suspended tenant cannot read import');
SELECT throws_ok(format('SELECT public.stage_pilot_import_rows(%L::uuid,''[{"name":"No","sku":"NO"}]'')',current_setting('test.inactive_batch')),'42501','import not found or not authorized','suspended tenant cannot stage import');
SELECT throws_ok(format('SELECT public.validate_pilot_import_batch(%L::uuid)',current_setting('test.inactive_batch')),'42501','import not found or not authorized','suspended tenant cannot validate import');
SELECT throws_ok(format('SELECT public.commit_pilot_import_batch(%L::uuid)',current_setting('test.inactive_batch')),'42501','import not found or not authorized','suspended tenant cannot commit import');
SELECT throws_ok(format('SELECT public.cancel_pilot_import_batch(%L::uuid)',current_setting('test.inactive_batch')),'42501','import not found or not authorized','suspended tenant cannot cancel import');
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='b2000000-0000-4000-8000-000000000001';
SELECT throws_ok(format('SELECT public.get_pilot_import_batch(%L::uuid)',current_setting('test.inactive_batch')),'42501','import not found or not authorized','deletion-requested tenant cannot read import');
UPDATE public.organizations SET lifecycle_status='tombstoned' WHERE id='b2000000-0000-4000-8000-000000000001';
SELECT throws_ok(format('SELECT public.get_pilot_import_batch(%L::uuid)',current_setting('test.inactive_batch')),'42501','import not found or not authorized','tombstoned tenant cannot read import');
SELECT * FROM finish();
ROLLBACK;
