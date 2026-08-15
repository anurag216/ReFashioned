BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(74);

INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dpp-admin-a@test.invalid'),
 ('90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dpp-manager@test.invalid'),
 ('90000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dpp-viewer@test.invalid'),
 ('90000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dpp-admin-b@test.invalid');
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users WHERE email LIKE 'dpp-%';
INSERT INTO public.organizations(id,name) VALUES('91000000-0000-0000-0000-000000000001','DPP Tenant A'),('91000000-0000-0000-0000-000000000002','DPP Tenant B');
INSERT INTO public.organization_members(id,organization_id,profile_id,role) VALUES
 ('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','admin'),
 ('92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','manager'),
 ('92000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000003','viewer'),
 ('92000000-0000-0000-0000-000000000004','91000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000004','admin');
INSERT INTO public.products(id,organization_id,name,sku,season) VALUES
 ('93000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','Safe Shirt','SAFE-1','SS26'),
 ('93000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','No stages',NULL,NULL),
 ('93000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000002','Other tenant',NULL,NULL);
INSERT INTO public.product_materials(id,product_id,material_name,composition_percentage) VALUES('93100000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','Cotton',100);
INSERT INTO public.lifecycle_stages(id,organization_id,product_id,stage_name,stage_order,co2_impact_kg,water_usage_l) VALUES
 ('94000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','Sourcing',1,0,10),
 ('94000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','Making',2,2,20),
 ('94000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000003','Other',1,1,1);

SELECT has_function('public','get_public_product_passport',ARRAY['text'],'public RPC exists');
SELECT has_function('public','get_product_passport_publication_state',ARRAY['uuid'],'state RPC exists');
SELECT function_privs_are('public','build_public_product_passport_payload',ARRAY['uuid'],'anon',ARRAY[]::text[],'builder is private from anon');
SELECT function_privs_are('public','build_public_product_passport_payload',ARRAY['uuid'],'authenticated',ARRAY[]::text[],'builder is private from authenticated');
SELECT ok(NOT has_table_privilege('authenticated','public.digital_product_passports','INSERT'),'authenticated DPP insert revoked');
SELECT ok(NOT has_table_privilege('authenticated','public.digital_product_passports','UPDATE'),'authenticated DPP update revoked');
SELECT ok(NOT has_table_privilege('authenticated','public.digital_product_passports','DELETE'),'authenticated DPP delete revoked');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.products$$,'42501',NULL,'anon product SELECT denied');
SELECT throws_ok($$SELECT * FROM public.product_materials$$,'42501',NULL,'anon material SELECT denied');
SELECT throws_ok($$SELECT * FROM public.lifecycle_stages$$,'42501',NULL,'anon stage SELECT denied');
SELECT throws_ok($$SELECT * FROM public.suppliers$$,'42501',NULL,'anon supplier SELECT denied');
SELECT throws_ok($$SELECT * FROM public.certifications$$,'42501',NULL,'anon certification SELECT denied');
SELECT throws_ok($$SELECT * FROM public.evidence_uploads$$,'42501',NULL,'anon evidence SELECT denied');
SELECT throws_ok($$SELECT * FROM public.digital_product_passports$$,'42501',NULL,'anon DPP SELECT denied');
SELECT is(public.get_public_product_passport('bad'),NULL::jsonb,'malformed lookup is empty');
SELECT is(public.get_public_product_passport(repeat('f',64)),NULL::jsonb,'unknown lookup is empty');
SELECT is(public.get_public_product_passport('93000000-0000-0000-0000-000000000001'),NULL::jsonb,'UUID lookup is empty');
SELECT throws_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'42501',NULL,'anon cannot execute publish');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$INSERT INTO public.digital_product_passports(organization_id,product_id,public_slug) VALUES('91000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001',repeat('a',64))$$,'42501',NULL,'manager direct insert denied');
SELECT throws_ok($$UPDATE public.digital_product_passports SET is_published=true$$,'42501',NULL,'manager direct publish denied');
SELECT throws_ok($$UPDATE public.digital_product_passports SET public_payload='{}'$$,'42501',NULL,'manager payload replacement denied');
SELECT throws_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'P0001',NULL,'manager publish RPC denied');
SELECT throws_ok($$SELECT public.unpublish_product_passport('93000000-0000-0000-0000-000000000001')$$,'P0001',NULL,'manager unpublish denied');
SELECT throws_ok($$SELECT public.rotate_product_passport_slug('93000000-0000-0000-0000-000000000001')$$,'P0001',NULL,'manager rotate denied'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$DELETE FROM public.digital_product_passports$$,'42501',NULL,'viewer direct delete denied'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'P0001',NULL,'cross-tenant publish denied');
SELECT throws_ok($$SELECT public.get_product_passport_publication_state('93000000-0000-0000-0000-000000000001')$$,'P0001',NULL,'cross-tenant state denied'); RESET ROLE;

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000002')$$,'P0001',NULL,'no stages prevents publish');
INSERT INTO public.lifecycle_stages(organization_id,product_id,stage_name,stage_order,flagged,co2_impact_kg,water_usage_l) VALUES('91000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000002','Review',1,true,1,1);
SELECT throws_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000002')$$,'P0001',NULL,'flagged stage prevents publish');
UPDATE public.lifecycle_stages SET flagged=false,co2_impact_kg=-1 WHERE product_id='93000000-0000-0000-0000-000000000002';
SELECT throws_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000002')$$,'P0001',NULL,'negative CO2 prevents publish');
UPDATE public.lifecycle_stages SET co2_impact_kg=1,water_usage_l=-1 WHERE product_id='93000000-0000-0000-0000-000000000002';
SELECT throws_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000002')$$,'P0001',NULL,'negative water prevents publish');
SELECT lives_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'admin publishes valid product'); RESET ROLE;

SELECT is((SELECT count(*) FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),1::bigint,'publication creates one row');
SELECT ok((SELECT public_slug ~ '^[0-9a-f]{64}$' FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),'slug is secure hex');
SELECT ok((SELECT public_slug <> '93000000-0000-0000-0000-000000000001' FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),'slug is not product UUID');
SELECT is((SELECT public_payload#>>'{impact,total_co2_kg}' FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),'2','complete CO2 total is correct and zero retained');
SELECT is((SELECT public_payload#>>'{impact,total_water_l}' FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),'30','complete water total correct');
SELECT ok((SELECT public_payload::text !~ '(supplier|location|certificate_url|evidence_id|organization_id|product_id|audit|flagged)' FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),'forbidden fields absent');
SELECT is((SELECT public_payload#>'{lifecycle,0,certifications}' FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),'[]'::jsonb,'certifications excluded without approved evidence model');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='passport_published' AND profile_id='90000000-0000-0000-0000-000000000001'),1::bigint,'first publish audited with auth actor');

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT is((SELECT has_unpublished_changes FROM public.get_product_passport_publication_state('93000000-0000-0000-0000-000000000001')),false,'unchanged state is clean'); RESET ROLE;
UPDATE public.products SET name='Changed Shirt' WHERE id='93000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT is((SELECT has_unpublished_changes FROM public.get_product_passport_publication_state('93000000-0000-0000-0000-000000000001')),true,'public product change is dirty');
SELECT lives_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'republish succeeds');
SELECT is((SELECT has_unpublished_changes FROM public.get_product_passport_publication_state('93000000-0000-0000-0000-000000000001')),false,'republish clears dirty state'); RESET ROLE;
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='passport_republished'),1::bigint,'republish audited');

UPDATE public.lifecycle_stages SET co2_impact_kg=NULL WHERE id='94000000-0000-0000-0000-000000000002';
SELECT ok((public.build_public_product_passport_payload('93000000-0000-0000-0000-000000000001')#>'{impact}') ? 'total_water_l','complete water remains');
SELECT ok(NOT ((public.build_public_product_passport_payload('93000000-0000-0000-0000-000000000001')#>'{impact}') ? 'total_co2_kg'),'partial CO2 total omitted');
UPDATE public.lifecycle_stages SET water_usage_l=NULL WHERE id='94000000-0000-0000-0000-000000000002';
SELECT ok(NOT ((public.build_public_product_passport_payload('93000000-0000-0000-0000-000000000001')#>'{impact}') ? 'total_water_l'),'partial water total omitted');

UPDATE public.lifecycle_stages SET co2_impact_kg=2,water_usage_l=20 WHERE id='94000000-0000-0000-0000-000000000002';
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.unpublish_product_passport('93000000-0000-0000-0000-000000000001')$$,'unpublish succeeds');
SELECT throws_ok($$SELECT public.unpublish_product_passport('93000000-0000-0000-0000-000000000001')$$,'P0001',NULL,'already unpublished fails'); RESET ROLE;
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='passport_unpublished'),1::bigint,'only actual unpublish audited');
SELECT is(public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001')),NULL::jsonb,'unpublish hides snapshot');

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'republish after unpublish succeeds');
SELECT lives_ok($$SELECT public.rotate_product_passport_slug('93000000-0000-0000-0000-000000000001')$$,'rotation succeeds'); RESET ROLE;
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='passport_slug_rotated'),1::bigint,'rotation audited');
SELECT isnt(public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001')),NULL::jsonb,'new slug resolves');
SELECT lives_ok($$SET LOCAL ROLE service_role; UPDATE public.digital_product_passports SET updated_at=clock_timestamp() WHERE product_id='93000000-0000-0000-0000-000000000001'; RESET ROLE$$,'service role write remains possible');

-- Evidence-backed certification membership is deliberate, while validity fails closed.
INSERT INTO public.suppliers(id,organization_id,name) VALUES
 ('95000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','Private Supplier');
INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,uploaded_at,reviewed_by,reviewed_at) VALUES
 ('96000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','95000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','evidence/96000000-0000-0000-0000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf','certificate','approved','90000000-0000-0000-0000-000000000001','claim-one.pdf','application/pdf',100,now(),'90000000-0000-0000-0000-000000000001',now());
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
CREATE TEMP TABLE first_claim AS SELECT public.create_certification_from_evidence('96000000-0000-0000-0000-000000000001','Organic Standard',current_date+30) id;
RESET ROLE;
SELECT is((public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'))#>'{payload,certifications}'),'[]'::jsonb,'manager-created claim is not public before admin republish');
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT is((SELECT has_unpublished_changes FROM public.get_product_passport_publication_state('93000000-0000-0000-0000-000000000001')),true,'new certification creates dirty state');
SELECT lives_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'admin republish admits certification'); RESET ROLE;
SELECT is((SELECT payload_version FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),2,'republish stores v2');
SELECT is((SELECT published_certification_ids FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),ARRAY[(SELECT id FROM first_claim)]::uuid[],'membership snapshot stores exact certification set');
SELECT is((public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'))#>'{payload,certifications,0}'),jsonb_build_object('name','Organic Standard','valid_until',(current_date+30)),'public claim contains only name and validity');
SELECT ok(public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'))::text !~ '(96000000|95000000|organization_id|supplier_id|evidence_id|certification_id|storage_path)','public JSON leaks no internal claim identifiers');
SET LOCAL ROLE anon; SELECT throws_ok($$SELECT published_certification_ids FROM public.digital_product_passports$$,'42501',NULL,'anon cannot read private membership'); RESET ROLE;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true); SET LOCAL ROLE authenticated;
SELECT lives_ok(format('SELECT public.revoke_certification(%L)',(SELECT id FROM first_claim)),'manager revokes published certification'); RESET ROLE;
SELECT isnt(public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001')),NULL::jsonb,'passport remains available after revocation');
SELECT is((public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'))#>'{payload,certifications}'),'[]'::jsonb,'revoked claim disappears without republish');
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT is((SELECT has_unpublished_changes FROM public.get_product_passport_publication_state('93000000-0000-0000-0000-000000000001')),true,'revocation leaves formal snapshot dirty'); RESET ROLE;
UPDATE public.certifications SET verification_status='verified',revoked_at=NULL,revoked_by=NULL,expiry_date=current_date-1 WHERE id=(SELECT id FROM first_claim);
SELECT is((public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'))#>'{payload,certifications}'),'[]'::jsonb,'expired admitted claim disappears without republish');
UPDATE public.digital_product_passports SET payload_version=1,public_payload=jsonb_set(public_payload,'{schema_version}','1'::jsonb)-'certifications',published_certification_ids='{}' WHERE product_id='93000000-0000-0000-0000-000000000001';
SELECT is((public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'))#>>'{payload,schema_version}'),'1','v1 snapshot still resolves without retroactive claims');
SELECT ok(NOT ((public.get_public_product_passport((SELECT public_slug FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'))#>'{payload}') ? 'certifications'),'v1 snapshot receives no certification field');
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true); SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.publish_product_passport('93000000-0000-0000-0000-000000000001')$$,'v1 republish upgrades safely'); RESET ROLE;
SELECT is((SELECT payload_version FROM public.digital_product_passports WHERE product_id='93000000-0000-0000-0000-000000000001'),2,'v1 republish becomes v2');

SELECT * FROM finish();
ROLLBACK;
