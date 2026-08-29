BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-admin@test.invalid'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-manager@test.invalid'),
 ('b1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-viewer@test.invalid'),
 ('b1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-other@test.invalid'),
 ('b1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-supplier@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'b1000000%';
INSERT INTO public.organizations(id,name) VALUES ('b2000000-0000-4000-8000-000000000001','Workspace A'),('b2000000-0000-4000-8000-000000000002','Workspace B');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','admin'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','manager'),
 ('b3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','viewer'),
 ('b3000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000004','admin');
INSERT INTO public.products(id,organization_id,name,sku,status) VALUES
 ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Workspace product','WS-1','draft'),
 ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Private product','PRIVATE-1','draft'),
 ('b4000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','Archived product','OLD','archived'),
 ('b4000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000001','Archive transition product','ARCHIVE-ME','draft');
INSERT INTO public.suppliers(id,organization_id,name,status) VALUES ('b6000000-0000-4000-8000-000000000005','b2000000-0000-4000-8000-000000000001','Workspace supplier identity','active');
INSERT INTO public.supplier_contacts(id,supplier_id,name,email) VALUES ('b6100000-0000-4000-8000-000000000005','b6000000-0000-4000-8000-000000000005','Workspace supplier','workspace-supplier@test.invalid');
INSERT INTO public.supplier_access_memberships(id,organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated) VALUES ('b6200000-0000-4000-8000-000000000005','b2000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000005','b6100000-0000-4000-8000-000000000005','b1000000-0000-4000-8000-000000000005',true);

SELECT plan(52);
SELECT has_function('public','get_product_workspace',ARRAY['uuid'],'workspace RPC exists');
SELECT ok(NOT has_function_privilege('anon','public.get_product_workspace(uuid)','EXECUTE'),'anon denied');
SELECT ok(has_function_privilege('authenticated','public.get_product_workspace(uuid)','EXECUTE'),'authenticated granted explicitly');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'product'->>'name','Workspace product','admin reads own product');
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'readiness'->>'overall_percent',public.get_organization_product_readiness()->0->>'overall_percent','workspace uses authoritative readiness');
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'actions'->0->>'category','MISSING_MATERIAL_DATA','workspace contains structured action for target product');
SELECT ok(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')::text !~* '(storage_path|bucket|supplier.*email|contact.*email)','workspace excludes storage paths and supplier contact PII');
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000003')->'product'->>'status','archived','archived historical workspace remains readable');
SELECT throws_ok($$INSERT INTO public.products(organization_id,name,sku,status) VALUES('b2000000-0000-4000-8000-000000000001','Duplicate SKU',' ws-1 ','draft')$$,'23505',NULL,'same-tenant canonical SKU duplicate denied');
SELECT lives_ok($$INSERT INTO public.products(organization_id,name,sku,status) VALUES('b2000000-0000-4000-8000-000000000002','Cross-tenant same SKU',' ws-1 ','draft')$$,'same canonical SKU across tenants allowed');
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000002'),NULL::jsonb,'cross-tenant product fails safely');
SELECT is(public.get_product_workspace('b4990000-0000-4000-8000-000000000001'),NULL::jsonb,'unknown product fails safely');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'product'->>'name','Workspace product','manager reads own product');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'product'->>'name','Workspace product','viewer reads own product');
SELECT throws_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000001','No','NO','')$$,'42501','active admin or manager membership required','viewer mutation denied');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000001','Updated product','WS-2','SS26')$$,'admin metadata update succeeds');
SELECT is((SELECT name FROM public.products WHERE id='b4000000-0000-4000-8000-000000000001'),'Updated product','metadata persisted');
SELECT throws_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000003','No','NO','')$$,'42501','archived products are read only','archived mutation denied');
SET LOCAL ROLE authenticated;
SELECT lives_ok($$UPDATE public.products SET status='archived' WHERE id='b4000000-0000-4000-8000-000000000004'$$,'active product can transition to archived');
SELECT results_eq($$UPDATE public.products SET name='Forbidden' WHERE id='b4000000-0000-4000-8000-000000000004' RETURNING id$$,ARRAY[]::uuid[],'archived direct product update denied');
RESET ROLE;
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','Null create',NULL,false)$$,'22023','invalid material','NULL composition create denied');
SELECT lives_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','Organic cotton',60,false)$$,'valid material add succeeds');
SELECT is(jsonb_array_length(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'materials'),1,'target material returned');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001',' organic COTTON ',20,false)$$,'23505','material already exists','canonical duplicate denied');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','Polyester',50,false)$$,'23514','material composition exceeds 100%','total over 100 denied after lock');
SELECT throws_ok($$SELECT public.update_product_material((SELECT id FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'),'Organic cotton',NULL,true)$$,'22023','invalid material','NULL composition update denied');
SELECT lives_ok($$SELECT public.update_product_material((SELECT id FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'),'Organic cotton',100,true)$$,'valid material update succeeds');
SELECT is((SELECT composition_percentage FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'),100::numeric,'material update persisted');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$INSERT INTO public.product_materials(product_id,material_name,composition_percentage) VALUES('b4000000-0000-4000-8000-000000000001','Bypass',1)$$,'42501',NULL,'authenticated direct material INSERT denied');
SELECT throws_ok($$UPDATE public.product_materials SET composition_percentage=1 WHERE product_id='b4000000-0000-4000-8000-000000000001'$$,'42501',NULL,'authenticated direct material UPDATE denied');
SELECT throws_ok($$DELETE FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'$$,'42501',NULL,'authenticated direct material DELETE denied');
RESET ROLE;
SELECT lives_ok($$SELECT public.remove_product_material((SELECT id FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'))$$,'valid material removal succeeds');
SELECT is((SELECT count(*) FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'),0::bigint,'material removed');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action LIKE 'product_material_%'),2::bigint+1,'three server audit events recorded');
INSERT INTO public.product_materials(id,product_id,material_name,composition_percentage,certification_required) VALUES('b5000000-0000-4000-8000-000000000005','b4000000-0000-4000-8000-000000000001','Supplier forbidden material',10,false);
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000005',true);
SELECT throws_ok($$SELECT public.get_product_workspace('b4000000-0000-4000-8000-000000000001')$$,'42501','active organization membership required','supplier-only identity cannot read workspace');
SELECT throws_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000001','No','NO','')$$,'42501','active admin or manager membership required','supplier-only identity cannot update metadata');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','No',1,false)$$,'42501','editable product not found','supplier-only identity cannot create material');
SELECT throws_ok($$SELECT public.update_product_material('b5000000-0000-4000-8000-000000000005','No',1,false)$$,'42501','editable material not found','supplier-only identity cannot update material');
SELECT throws_ok($$SELECT public.remove_product_material('b5000000-0000-4000-8000-000000000005')$$,'42501','editable material not found','supplier-only identity cannot remove material');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000004',true);
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','No',1,false)$$,'42501','editable product not found','cross-tenant material denied');
SELECT throws_ok($$SELECT public.update_product_material('b5000000-0000-4000-8000-000000000005','No',1,false)$$,'42501','editable material not found','cross-tenant material update denied');
SELECT throws_ok($$SELECT public.remove_product_material('b5000000-0000-4000-8000-000000000005')$$,'42501','editable material not found','cross-tenant material delete denied');
UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='b2000000-0000-4000-8000-000000000002';
SELECT throws_ok($$SELECT public.get_product_workspace('b4000000-0000-4000-8000-000000000002')$$,'42501','active organization membership required','suspended tenant read denied');
SELECT throws_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000002','No','NO','')$$,'42501','active admin or manager membership required','suspended tenant metadata denied');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000002','No',1,false)$$,'42501','editable product not found','suspended tenant material denied');
UPDATE public.organizations SET lifecycle_status='deletion_requested' WHERE id='b2000000-0000-4000-8000-000000000002';
SELECT throws_ok($$SELECT public.get_product_workspace('b4000000-0000-4000-8000-000000000002')$$,'42501','active organization membership required','deletion-requested tenant read denied');
SELECT throws_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000002','No','NO','')$$,'42501','active admin or manager membership required','deletion-requested tenant metadata denied');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000002','No',1,false)$$,'42501','editable product not found','deletion-requested tenant material denied');
UPDATE public.organizations SET lifecycle_status='tombstoned' WHERE id='b2000000-0000-4000-8000-000000000002';
SELECT throws_ok($$SELECT public.get_product_workspace('b4000000-0000-4000-8000-000000000002')$$,'42501','active organization membership required','tombstoned tenant read denied');
SELECT throws_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000002','No','NO','')$$,'42501','active admin or manager membership required','tombstoned tenant metadata denied');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000002','No',1,false)$$,'42501','editable product not found','tombstoned tenant material denied');
SELECT set_config('request.jwt.claim.sub','',true);
SELECT throws_ok($$SELECT public.get_product_workspace('b4000000-0000-4000-8000-000000000001')$$,'28000','authentication required','unauthenticated denied');
SELECT * FROM finish();
ROLLBACK;
