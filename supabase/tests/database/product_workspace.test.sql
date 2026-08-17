BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-admin@test.invalid'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-manager@test.invalid'),
 ('b1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-viewer@test.invalid'),
 ('b1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workspace-other@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE id::text LIKE 'b1000000%';
INSERT INTO public.organizations(id,name) VALUES ('b2000000-0000-4000-8000-000000000001','Workspace A'),('b2000000-0000-4000-8000-000000000002','Workspace B');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','admin'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','manager'),
 ('b3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','viewer'),
 ('b3000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000004','admin');
INSERT INTO public.products(id,organization_id,name,sku,status) VALUES
 ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Workspace product','WS-1','draft'),
 ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Private product','WS-1','draft'),
 ('b4000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','Archived product','OLD','archived');

SELECT plan(26);
SELECT has_function('public','get_product_workspace',ARRAY['uuid'],'workspace RPC exists');
SELECT ok(NOT has_function_privilege('anon','public.get_product_workspace(uuid)','EXECUTE'),'anon denied');
SELECT ok(has_function_privilege('authenticated','public.get_product_workspace(uuid)','EXECUTE'),'authenticated granted explicitly');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'product'->>'name','Workspace product','admin reads own product');
SELECT is(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'readiness'->>'overall_percent',public.get_organization_product_readiness()->0->>'overall_percent','workspace uses authoritative readiness');
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
SELECT lives_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','Organic cotton',60,false)$$,'valid material add succeeds');
SELECT is(jsonb_array_length(public.get_product_workspace('b4000000-0000-4000-8000-000000000001')->'materials'),1,'target material returned');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001',' organic COTTON ',20,false)$$,'23505','material already exists','canonical duplicate denied');
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','Polyester',50,false)$$,'23514','material composition exceeds 100%','total over 100 denied after lock');
SELECT lives_ok($$SELECT public.update_product_material((SELECT id FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'),'Organic cotton',100,true)$$,'valid material update succeeds');
SELECT is((SELECT composition_percentage FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'),100::numeric,'material update persisted');
SELECT lives_ok($$SELECT public.remove_product_material((SELECT id FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'))$$,'valid material removal succeeds');
SELECT is((SELECT count(*) FROM public.product_materials WHERE product_id='b4000000-0000-4000-8000-000000000001'),0::bigint,'material removed');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action LIKE 'product_material_%'),2::bigint+1,'three server audit events recorded');
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000004',true);
SELECT throws_ok($$SELECT public.create_product_material('b4000000-0000-4000-8000-000000000001','No',1,false)$$,'42501','editable product not found','cross-tenant material denied');
UPDATE public.organizations SET lifecycle_status='suspended' WHERE id='b2000000-0000-4000-8000-000000000002';
SELECT throws_ok($$SELECT public.get_product_workspace('b4000000-0000-4000-8000-000000000002')$$,'42501','active organization membership required','suspended tenant read denied');
SELECT throws_ok($$SELECT public.update_product_metadata('b4000000-0000-4000-8000-000000000002','No','NO','')$$,'42501','active admin or manager membership required','inactive tenant mutation denied');
SELECT set_config('request.jwt.claim.sub','',true);
SELECT throws_ok($$SELECT public.get_product_workspace('b4000000-0000-4000-8000-000000000001')$$,'28000','authentication required','unauthenticated denied');
SELECT * FROM finish();
ROLLBACK;
