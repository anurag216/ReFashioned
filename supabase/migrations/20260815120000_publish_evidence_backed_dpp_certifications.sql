-- Admit evidence-backed claims only through deliberate DPP publication, while
-- revalidating an admitted claim on every public read.
ALTER TABLE public.digital_product_passports
  ADD COLUMN published_certification_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.digital_product_passports.published_certification_ids IS
  'Server-private membership snapshot of certifications deliberately admitted by an administrator.';

CREATE OR REPLACE FUNCTION public.build_public_product_passport_payload(p_product_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE
  v_payload jsonb; v_stage_count bigint; v_co2_count bigint; v_water_count bigint; v_co2 numeric; v_water numeric;
BEGIN
  SELECT count(*),count(co2_impact_kg),count(water_usage_l),sum(co2_impact_kg),sum(water_usage_l)
    INTO v_stage_count,v_co2_count,v_water_count,v_co2,v_water
    FROM public.lifecycle_stages WHERE product_id=p_product_id;
  SELECT jsonb_build_object(
    'schema_version',2,
    'brand',jsonb_build_object('name',o.name),
    'product',jsonb_strip_nulls(jsonb_build_object('name',p.name,'identifier',p.sku,'season',p.season)),
    'materials',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',m.material_name,'percentage',m.composition_percentage) ORDER BY m.material_name,m.id) FROM public.product_materials m WHERE m.product_id=p.id),'[]'::jsonb),
    'impact',jsonb_strip_nulls(jsonb_build_object('total_co2_kg',CASE WHEN v_stage_count>0 AND v_co2_count=v_stage_count THEN v_co2 END,'total_water_l',CASE WHEN v_stage_count>0 AND v_water_count=v_stage_count THEN v_water END)),
    'lifecycle',COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('order',s.stage_order,'name',s.stage_name,'summary',s.subtitle,'co2_kg',s.co2_impact_kg,'water_l',s.water_usage_l,'certifications','[]'::jsonb)) ORDER BY s.stage_order NULLS LAST,s.stage_name,s.id) FROM public.lifecycle_stages s WHERE s.product_id=p.id),'[]'::jsonb),
    'certifications',COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name',eligible.name,'valid_until',eligible.expiry_date) ORDER BY eligible.id)
      FROM (
        SELECT DISTINCT c.id,c.name,c.expiry_date
        FROM public.certifications c
        JOIN public.evidence_uploads e ON e.id=c.evidence_id
          AND e.organization_id=c.organization_id AND e.supplier_id=c.supplier_id
        JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id
          AND s.organization_id=e.organization_id AND s.product_id=p.id
        WHERE c.organization_id=p.organization_id AND c.verification_status='verified'
          AND c.expiry_date>=current_date AND e.status='approved'
      ) eligible
    ),'[]'::jsonb)
  ) INTO v_payload
  FROM public.products p JOIN public.organizations o ON o.id=p.organization_id WHERE p.id=p_product_id;
  RETURN v_payload;
END $function$;

CREATE OR REPLACE FUNCTION public.publish_product_passport(p_product_id uuid)
RETURNS TABLE(public_slug text,published_at timestamptz,payload_generated_at timestamptz,payload_hash text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE
  p public.products%ROWTYPE; payload jsonb; certification_ids uuid[]; now_at timestamptz:=clock_timestamp(); existed boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_product_id::text,0));
 SELECT * INTO p FROM public.products WHERE id=p_product_id FOR UPDATE;
 IF NOT FOUND OR NOT public.has_org_role(p.organization_id,ARRAY['admin']) THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lifecycle_stages WHERE product_id=p_product_id) THEN RAISE EXCEPTION 'lifecycle data required'; END IF;
 IF EXISTS(SELECT 1 FROM public.lifecycle_stages WHERE product_id=p_product_id AND (flagged OR co2_impact_kg<0 OR water_usage_l<0)) THEN RAISE EXCEPTION 'lifecycle data requires review'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.digital_product_passports WHERE product_id=p_product_id) INTO existed;
 -- The builder and ID projection run after the product lock and use the same
 -- eligibility predicate. Claim mutations use this advisory-lock boundary too.
 SELECT public.build_public_product_passport_payload(p_product_id),
   COALESCE(array_agg(DISTINCT c.id ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL),'{}'::uuid[])
 INTO payload,certification_ids
 FROM public.products product
 LEFT JOIN public.lifecycle_stages s ON s.product_id=product.id AND s.organization_id=product.organization_id
 LEFT JOIN public.evidence_uploads e ON e.lifecycle_stage_id=s.id AND e.organization_id=s.organization_id AND e.status='approved'
 LEFT JOIN public.certifications c ON c.evidence_id=e.id AND c.organization_id=e.organization_id
   AND c.supplier_id=e.supplier_id AND c.verification_status='verified' AND c.expiry_date>=current_date
 WHERE product.id=p_product_id
 GROUP BY product.id;
 INSERT INTO public.digital_product_passports(organization_id,product_id,public_slug,is_published,published_at,public_payload,payload_version,payload_generated_at,payload_hash,published_certification_ids,updated_at)
 VALUES(p.organization_id,p_product_id,encode(extensions.gen_random_bytes(32),'hex'),true,now_at,payload,2,now_at,encode(extensions.digest(payload::text,'sha256'),'hex'),certification_ids,now_at)
 ON CONFLICT(product_id) DO UPDATE SET is_published=true,published_at=now_at,public_payload=payload,payload_version=2,payload_generated_at=now_at,payload_hash=encode(extensions.digest(payload::text,'sha256'),'hex'),published_certification_ids=certification_ids,updated_at=now_at;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(p.organization_id,auth.uid(),CASE WHEN existed THEN 'passport_republished' ELSE 'passport_published' END,'product',p.name);
 RETURN QUERY SELECT d.public_slug,d.published_at,d.payload_generated_at,d.payload_hash FROM public.digital_product_passports d WHERE d.product_id=p_product_id;
END $function$;

CREATE OR REPLACE FUNCTION public.get_product_passport_publication_state(p_product_id uuid)
RETURNS TABLE(public_slug text,is_published boolean,published_at timestamptz,payload_generated_at timestamptz,stored_payload_hash text,current_payload_hash text,has_unpublished_changes boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE org uuid; payload jsonb; current_hash text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
 SELECT organization_id INTO org FROM public.products WHERE id=p_product_id;
 IF NOT FOUND OR NOT public.is_org_member(org) THEN RAISE EXCEPTION 'not authorized'; END IF;
 payload:=public.build_public_product_passport_payload(p_product_id); current_hash:=encode(extensions.digest(payload::text,'sha256'),'hex');
 RETURN QUERY SELECT d.public_slug,d.is_published,d.published_at,d.payload_generated_at,d.payload_hash,current_hash,d.payload_hash IS DISTINCT FROM current_hash FROM public.digital_product_passports d WHERE d.product_id=p_product_id;
 IF NOT FOUND THEN RETURN QUERY SELECT NULL::text,false,NULL::timestamptz,NULL::timestamptz,NULL::text,current_hash,true; END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.get_public_product_passport(p_public_slug text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE d public.digital_product_passports%ROWTYPE; safe_payload jsonb;
BEGIN
 IF p_public_slug IS NULL OR p_public_slug !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
 SELECT * INTO d FROM public.digital_product_passports
 WHERE public_slug=p_public_slug AND is_published AND public_payload IS NOT NULL AND payload_hash IS NOT NULL AND payload_generated_at IS NOT NULL;
 IF NOT FOUND THEN RETURN NULL; END IF;
 safe_payload:=d.public_payload;
 IF d.payload_version=2 THEN
   safe_payload:=jsonb_set(safe_payload,'{certifications}',COALESCE((
     SELECT jsonb_agg(jsonb_build_object('name',eligible.name,'valid_until',eligible.expiry_date) ORDER BY eligible.id)
     FROM (
       SELECT DISTINCT c.id,c.name,c.expiry_date
       FROM unnest(d.published_certification_ids) admitted(id)
       JOIN public.certifications c ON c.id=admitted.id
       JOIN public.evidence_uploads e ON e.id=c.evidence_id AND e.organization_id=c.organization_id AND e.supplier_id=c.supplier_id
       JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id AND s.organization_id=e.organization_id AND s.product_id=d.product_id
       JOIN public.products p ON p.id=s.product_id AND p.organization_id=d.organization_id AND c.organization_id=p.organization_id
       WHERE c.verification_status='verified' AND c.expiry_date>=current_date AND e.status='approved'
     ) eligible
   ),'[]'::jsonb),true);
 END IF;
 RETURN jsonb_build_object('schema_version',d.payload_version,'published_at',d.published_at,'payload_generated_at',d.payload_generated_at,'payload',safe_payload);
END $function$;

CREATE OR REPLACE FUNCTION public.create_certification_from_evidence(p_evidence_id uuid,p_name text,p_expiry_date date) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $function$
DECLARE v_actor uuid:=auth.uid(); v record; v_product_id uuid; v_id uuid:=extensions.gen_random_uuid(); v_name text:=regexp_replace(btrim(p_name),'[[:space:]]+',' ','g');
BEGIN
 SELECT s.product_id INTO v_product_id FROM public.evidence_uploads e JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE e.id=p_evidence_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_product_id::text,0));
 SELECT e.*,s.product_id,s.organization_id AS stage_organization_id INTO v FROM public.evidence_uploads e JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE e.id=p_evidence_id FOR UPDATE OF e;
 IF NOT FOUND OR v.product_id IS DISTINCT FROM v_product_id OR v.stage_organization_id IS DISTINCT FROM v.organization_id OR NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v.organization_id AND m.role IN ('admin','manager')) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF v.status<>'approved' OR v.document_type NOT IN ('certificate','test_report') THEN RAISE EXCEPTION 'approved certification evidence required'; END IF;
 IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'certification name must be 1 to 120 characters'; END IF;
 IF p_expiry_date IS NULL OR p_expiry_date<=current_date THEN RAISE EXCEPTION 'expiry date must be in the future'; END IF;
 INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by) VALUES(v_id,v.organization_id,v.supplier_id,v.id,v_name,p_expiry_date,'verified',v_actor);
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'certification_created','certification',v_id::text); RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.revoke_certification(p_certification_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE v_actor uuid:=auth.uid(); v record; v_product_id uuid;
BEGIN
 SELECT s.product_id INTO v_product_id FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE c.id=p_certification_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'verified certification not found or not authorized' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_product_id::text,0));
 SELECT c.*,e.status AS evidence_status,e.organization_id AS evidence_organization_id,e.supplier_id AS evidence_supplier_id,s.product_id,s.organization_id AS stage_organization_id INTO v
 FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id
 WHERE c.id=p_certification_id FOR UPDATE OF c,e;
 IF NOT FOUND OR v.product_id IS DISTINCT FROM v_product_id OR v.stage_organization_id IS DISTINCT FROM v.organization_id OR v.evidence_organization_id IS DISTINCT FROM v.organization_id OR v.evidence_supplier_id IS DISTINCT FROM v.supplier_id OR v.verification_status<>'verified' OR NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v.organization_id AND m.role IN ('admin','manager')) THEN RAISE EXCEPTION 'verified certification not found or not authorized' USING ERRCODE='42501'; END IF;
 UPDATE public.certifications SET verification_status='revoked',revoked_at=now(),revoked_by=v_actor WHERE id=v.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'certification_revoked','certification',v.id::text);
END $function$;

-- The routine-hardening event trigger revokes these on replacement; restore only
-- the reviewed API surface explicitly.
REVOKE ALL ON FUNCTION public.build_public_product_passport_payload(uuid),public.publish_product_passport(uuid),public.get_product_passport_publication_state(uuid),public.get_public_product_passport(text),public.create_certification_from_evidence(uuid,text,date),public.revoke_certification(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_product_passport(uuid),public.get_product_passport_publication_state(uuid),public.create_certification_from_evidence(uuid,text,date),public.revoke_certification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_passport(text) TO anon,authenticated;
