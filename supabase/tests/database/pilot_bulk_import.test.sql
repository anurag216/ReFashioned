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

SELECT plan(23);
SELECT has_table('public','pilot_import_batches','batch staging exists');
SELECT has_table('public','pilot_import_rows','row staging exists');
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
SELECT throws_ok(format('SELECT public.commit_pilot_import_batch(%L::uuid)',current_setting('test.products_batch')),'55000','batch is not valid for commit','same batch cannot commit twice');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000004',true);
SELECT throws_ok(format('SELECT public.get_pilot_import_batch(%L::uuid)',current_setting('test.products_batch')),'42501','import not found or not authorized','Tenant B cannot access Tenant A batch');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT set_config('test.suppliers_batch',public.create_pilot_import_batch('suppliers','suppliers.csv')::text,true);
SELECT public.stage_pilot_import_rows(current_setting('test.suppliers_batch')::uuid,'[{"supplier_reference":" SUP-1 ","name":"Pilot supplier","contact_name":"Private Person","contact_email":"private@example.com"}]');
SELECT public.validate_pilot_import_batch(current_setting('test.suppliers_batch')::uuid);
SELECT is(public.commit_pilot_import_batch(current_setting('test.suppliers_batch')::uuid)->>'created_count','1','valid supplier import succeeds');
SELECT ok(EXISTS(SELECT 1 FROM public.suppliers WHERE organization_id='b2000000-0000-4000-8000-000000000001' AND external_reference='SUP-1'),'stable supplier reference stored');
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
SELECT * FROM finish();
ROLLBACK;
