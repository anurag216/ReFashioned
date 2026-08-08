BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(18);

SELECT has_function('public','get_public_product_passport',ARRAY['text'],'public projection RPC exists');
SELECT function_privs_are('public','get_public_product_passport',ARRAY['text'],'anon',ARRAY['EXECUTE'],'anonymous can only execute public projection');
SELECT function_privs_are('public','build_public_product_passport_payload',ARRAY['uuid'],'anon',ARRAY[]::text[],'anonymous cannot execute payload builder');
SELECT function_privs_are('public','publish_product_passport',ARRAY['uuid'],'anon',ARRAY[]::text[],'anonymous cannot publish');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.products$$,'42501',NULL,'anonymous product SELECT denied');
SELECT throws_ok($$SELECT * FROM public.product_materials$$,'42501',NULL,'anonymous material SELECT denied');
SELECT throws_ok($$SELECT * FROM public.lifecycle_stages$$,'42501',NULL,'anonymous lifecycle SELECT denied');
SELECT throws_ok($$SELECT * FROM public.suppliers$$,'42501',NULL,'anonymous supplier SELECT denied');
SELECT throws_ok($$SELECT * FROM public.certifications$$,'42501',NULL,'anonymous certification SELECT denied');
SELECT throws_ok($$SELECT * FROM public.evidence_uploads$$,'42501',NULL,'anonymous evidence SELECT denied');
SELECT throws_ok($$SELECT * FROM public.digital_product_passports$$,'42501',NULL,'anonymous DPP SELECT denied');
SELECT is(public.get_public_product_passport('bad'),NULL::jsonb,'malformed slug has generic empty result');
SELECT is(public.get_public_product_passport(repeat('f',64)),NULL::jsonb,'unknown slug has generic empty result');
SELECT is(public.get_public_product_passport('30000000-0000-0000-0000-000000000001'),NULL::jsonb,'product UUID is not a public slug');
SELECT throws_ok($$SELECT public.publish_product_passport('30000000-0000-0000-0000-000000000001')$$,'42501',NULL,'anonymous cannot invoke publication RPC');
RESET ROLE;

SELECT ok((SELECT NOT has_table_privilege('anon','public.products','SELECT')),'anon product grant revoked');
SELECT ok((SELECT NOT has_table_privilege('anon','public.digital_product_passports','SELECT')),'anon DPP grant revoked');
SELECT ok((SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_proc JOIN pg_namespace n ON n.oid=pronamespace WHERE n.nspname='public' AND proname='get_public_product_passport'),'public RPC has fixed search path');
SELECT * FROM finish();
ROLLBACK;
