-- Publish an immutable, deliberately minimal DPP snapshot through one RPC.
DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM public.digital_product_passports WHERE product_id IS NULL OR organization_id IS NULL) THEN
    RAISE EXCEPTION 'DPP has no product or organization; tenant ownership must be corrected explicitly';
  END IF;
  IF EXISTS (SELECT 1 FROM public.digital_product_passports d LEFT JOIN public.products p ON p.id = d.product_id WHERE d.product_id IS NOT NULL AND p.id IS NULL) THEN
    RAISE EXCEPTION 'DPP references a missing product';
  END IF;
  IF EXISTS (SELECT 1 FROM public.digital_product_passports d JOIN public.products p ON p.id = d.product_id WHERE d.organization_id IS DISTINCT FROM p.organization_id) THEN
    RAISE EXCEPTION 'DPP organization does not match product organization';
  END IF;
  IF EXISTS (SELECT 1 FROM public.digital_product_passports WHERE product_id IS NOT NULL GROUP BY product_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'more than one DPP exists for a product';
  END IF;
  IF EXISTS (SELECT 1 FROM public.digital_product_passports WHERE is_published AND (product_id IS NULL OR organization_id IS NULL)) THEN
    RAISE EXCEPTION 'published DPP has no product or organization';
  END IF;
  IF EXISTS (SELECT 1 FROM public.digital_product_passports WHERE is_published AND public_slug !~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'published DPP has an incompatible public slug';
  END IF;
END
$preflight$;

UPDATE public.digital_product_passports
SET public_slug = encode(extensions.gen_random_bytes(32), 'hex')
WHERE NOT is_published AND (public_slug IS NULL OR public_slug = '' OR public_slug !~ '^[0-9a-f]{64}$');

ALTER TABLE public.digital_product_passports
  ADD COLUMN public_payload jsonb,
  ADD COLUMN payload_version integer DEFAULT 1,
  ADD COLUMN payload_generated_at timestamptz,
  ADD COLUMN payload_hash text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.digital_product_passports
  ADD CONSTRAINT digital_product_passports_product_key UNIQUE (product_id),
  ADD CONSTRAINT digital_product_passports_slug_format CHECK (public_slug ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT digital_product_passports_payload_version_positive CHECK (payload_version > 0),
  ADD CONSTRAINT digital_product_passports_published_complete CHECK (
    NOT is_published OR (public_payload IS NOT NULL AND payload_hash IS NOT NULL AND published_at IS NOT NULL AND payload_generated_at IS NOT NULL)
  );
CREATE INDEX digital_product_passports_public_slug_lookup_idx
  ON public.digital_product_passports (public_slug) WHERE is_published;

DROP POLICY IF EXISTS published_dpps_public ON public.digital_product_passports;
DROP POLICY IF EXISTS published_products_public ON public.products;
DROP POLICY IF EXISTS published_stages_public ON public.lifecycle_stages;
DROP POLICY IF EXISTS published_product_suppliers_public ON public.suppliers;
DROP POLICY IF EXISTS "Published DPPs are public" ON public.digital_product_passports;
REVOKE SELECT ON public.digital_product_passports, public.products, public.product_materials,
  public.lifecycle_stages, public.suppliers, public.certifications, public.evidence_uploads FROM anon;

CREATE OR REPLACE FUNCTION public.build_public_product_passport_payload(p_product_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $function$
  SELECT jsonb_build_object(
    'schema_version', 1,
    'brand', jsonb_build_object('name', o.name),
    'product', jsonb_strip_nulls(jsonb_build_object('name', p.name, 'identifier', p.sku, 'season', p.season)),
    'materials', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', m.material_name, 'percentage', m.composition_percentage) ORDER BY m.material_name, m.id) FROM public.product_materials m WHERE m.product_id = p.id), '[]'::jsonb),
    'impact', jsonb_build_object(
      'total_co2_kg', (SELECT COALESCE(sum(s.co2_impact_kg), 0) FROM public.lifecycle_stages s WHERE s.product_id = p.id),
      'total_water_l', (SELECT COALESCE(sum(s.water_usage_l), 0) FROM public.lifecycle_stages s WHERE s.product_id = p.id)
    ),
    'lifecycle', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'order', s.stage_order, 'name', s.stage_name, 'summary', s.subtitle,
      'co2_kg', s.co2_impact_kg, 'water_l', s.water_usage_l,
      'certifications', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', c.name, 'valid_until', c.expiry_date) ORDER BY c.name, c.id)
        FROM public.certifications c WHERE c.supplier_id = s.supplier_id AND c.organization_id = p.organization_id
          AND c.verification_status = 'verified' AND (c.expiry_date IS NULL OR c.expiry_date >= CURRENT_DATE)), '[]'::jsonb)
    )) ORDER BY s.stage_order NULLS LAST, s.stage_name, s.id) FROM public.lifecycle_stages s WHERE s.product_id = p.id), '[]'::jsonb)
  ) FROM public.products p JOIN public.organizations o ON o.id = p.organization_id WHERE p.id = p_product_id;
$function$;
REVOKE ALL ON FUNCTION public.build_public_product_passport_payload(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_product_passport(p_product_id uuid)
RETURNS TABLE(public_slug text, published_at timestamptz, payload_generated_at timestamptz, payload_hash text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
DECLARE v_product public.products%ROWTYPE; v_payload jsonb; v_now timestamptz := clock_timestamp(); v_existing boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=p_product_id;
  IF NOT FOUND OR NOT public.has_org_role(v_product.organization_id, ARRAY['admin']) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lifecycle_stages WHERE product_id=p_product_id) THEN RAISE EXCEPTION 'lifecycle data required'; END IF;
  IF EXISTS (SELECT 1 FROM public.lifecycle_stages WHERE product_id=p_product_id AND (flagged OR co2_impact_kg < 0 OR water_usage_l < 0)) THEN RAISE EXCEPTION 'lifecycle data requires review'; END IF;
  v_payload := public.build_public_product_passport_payload(p_product_id);
  SELECT EXISTS(SELECT 1 FROM public.digital_product_passports WHERE product_id=p_product_id) INTO v_existing;
  INSERT INTO public.digital_product_passports(organization_id, product_id, public_slug, is_published, published_at, public_payload, payload_version, payload_generated_at, payload_hash, updated_at)
  VALUES(v_product.organization_id,p_product_id,encode(extensions.gen_random_bytes(32),'hex'),true,v_now,v_payload,1,v_now,encode(extensions.digest(v_payload::text,'sha256'),'hex'),v_now)
  ON CONFLICT (product_id) DO UPDATE SET is_published=true,published_at=v_now,public_payload=v_payload,payload_version=1,payload_generated_at=v_now,payload_hash=encode(extensions.digest(v_payload::text,'sha256'),'hex'),updated_at=v_now;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_product.organization_id,auth.uid(),CASE WHEN v_existing THEN 'passport_republished' ELSE 'passport_published' END,'product',v_product.name);
  RETURN QUERY SELECT d.public_slug,d.published_at,d.payload_generated_at,d.payload_hash FROM public.digital_product_passports d WHERE d.product_id=p_product_id;
END $function$;

CREATE OR REPLACE FUNCTION public.unpublish_product_passport(p_product_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE p public.products%ROWTYPE;
BEGIN
 SELECT * INTO p FROM public.products WHERE id=p_product_id;
 IF auth.uid() IS NULL OR NOT FOUND OR NOT public.has_org_role(p.organization_id,ARRAY['admin']) THEN RAISE EXCEPTION 'not authorized'; END IF;
 UPDATE public.digital_product_passports SET is_published=false,updated_at=clock_timestamp() WHERE product_id=p_product_id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(p.organization_id,auth.uid(),'passport_unpublished','product',p.name);
END $function$;

CREATE OR REPLACE FUNCTION public.rotate_product_passport_slug(p_product_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE p public.products%ROWTYPE; v_slug text := encode(extensions.gen_random_bytes(32),'hex');
BEGIN
 SELECT * INTO p FROM public.products WHERE id=p_product_id;
 IF auth.uid() IS NULL OR NOT FOUND OR NOT public.has_org_role(p.organization_id,ARRAY['admin']) THEN RAISE EXCEPTION 'not authorized'; END IF;
 UPDATE public.digital_product_passports SET public_slug=v_slug,updated_at=clock_timestamp() WHERE product_id=p_product_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'passport does not exist'; END IF;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(p.organization_id,auth.uid(),'passport_slug_rotated','product',p.name);
 RETURN v_slug;
END $function$;

CREATE OR REPLACE FUNCTION public.get_public_product_passport(p_public_slug text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE result jsonb;
BEGIN
 IF p_public_slug IS NULL OR p_public_slug !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',d.payload_version,'published_at',d.published_at,'payload_generated_at',d.payload_generated_at,'payload',d.public_payload)
 INTO result FROM public.digital_product_passports d WHERE d.public_slug=p_public_slug AND d.is_published AND d.public_payload IS NOT NULL AND d.payload_hash IS NOT NULL AND d.payload_generated_at IS NOT NULL;
 RETURN result;
END $function$;

REVOKE ALL ON FUNCTION public.publish_product_passport(uuid), public.unpublish_product_passport(uuid), public.rotate_product_passport_slug(uuid), public.get_public_product_passport(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_product_passport(uuid), public.unpublish_product_passport(uuid), public.rotate_product_passport_slug(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_passport(text) TO anon, authenticated;
