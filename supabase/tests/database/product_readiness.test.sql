BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(18);

SELECT has_function('public','get_organization_product_readiness',ARRAY[]::text[],'product readiness RPC exists');
SELECT has_function('public','get_organization_action_center',ARRAY[]::text[],'Action Center RPC exists');
SELECT ok(has_function_privilege('authenticated','public.get_organization_product_readiness()','EXECUTE'),'viewer, manager, and admin callers use the authenticated readiness surface');
SELECT ok(has_function_privilege('authenticated','public.get_organization_action_center()','EXECUTE'),'authenticated organization members can use Action Center');
SELECT ok(NOT has_function_privilege('anon','public.get_organization_product_readiness()','EXECUTE'),'anonymous/public DPP readers cannot read private readiness');
SELECT ok(NOT has_function_privilege('anon','public.get_organization_action_center()','EXECUTE'),'anonymous callers cannot read Action Center');
SELECT ok(position('SECURITY DEFINER' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'readiness has a controlled definer boundary');
SELECT ok(position('SET search_path TO pg_catalog' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'readiness fixes a minimal search path');
SELECT ok(position('o.lifecycle_status = ''active''' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'suspended and deletion-requested organizations fail closed');
SELECT ok(position('m.profile_id = auth.uid()' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'readiness tenant derives only from caller membership');
SELECT ok(position('e.status = ''approved''' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'only approved evidence can satisfy readiness');
SELECT ok(position('e.scan_status = ''clean''' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'quarantined, pending, and unscanned evidence cannot satisfy readiness');
SELECT ok(position('e.content_sha256 IS NOT NULL' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'trusted evidence requires an immutable fingerprint');
SELECT ok(position('c.verification_status = ''verified''' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'revoked certification cannot satisfy readiness');
SELECT ok(position('C.EXPIRY_DATE >= CURRENT_DATE' in upper(pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure)))>0,'expired certification cannot satisfy readiness');
SELECT ok(position('c.organization_id = v_org' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))>0,'cross-tenant certification cannot satisfy readiness');
SELECT ok(position('public_payload' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))=0,'private or public DPP payload fields are not returned');
SELECT ok(position('data_completeness' in pg_get_functiondef('public.get_organization_product_readiness()'::regprocedure))=0,'legacy supplier percentage is never authoritative');

SELECT * FROM finish();
ROLLBACK;
