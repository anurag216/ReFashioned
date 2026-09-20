-- Resolve pilot QA findings discovered by the deployed comprehensive audit.
-- DPP publication must enforce the same readiness blockers shown to users, and
-- failed evidence setup must be able to compensate a newly-created empty stage.

CREATE OR REPLACE FUNCTION public.publish_product_passport(p_product_id uuid)
RETURNS TABLE(public_slug text, published_at timestamptz, payload_generated_at timestamptz, payload_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog
AS $$
DECLARE
  p public.products%ROWTYPE;
  payload jsonb;
  certification_ids uuid[];
  now_at timestamptz:=clock_timestamp();
  existed boolean;
  v_readiness jsonb;
  v_blocker_text text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE='28000';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_product_id::text,0));
  SELECT * INTO p FROM public.products WHERE id=p_product_id FOR UPDATE;

  IF NOT FOUND OR NOT public.has_org_role(p.organization_id,ARRAY['admin']) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT item.value
  INTO v_readiness
  FROM jsonb_array_elements(public.get_organization_product_readiness()) AS item(value)
  WHERE item.value->>'product_id'=p_product_id::text
  LIMIT 1;

  IF v_readiness IS NULL THEN
    RAISE EXCEPTION 'passport publication blocked: readiness unavailable';
  END IF;

  IF COALESCE((v_readiness->>'blocker_count')::integer,1)>0 THEN
    SELECT string_agg(blocker.value,'; ')
    INTO v_blocker_text
    FROM jsonb_array_elements_text(COALESCE(v_readiness->'blockers','[]'::jsonb)) AS blocker(value);

    RAISE EXCEPTION 'passport publication blocked: %',
      COALESCE(NULLIF(v_blocker_text,''),'readiness requirements are incomplete');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.digital_product_passports WHERE product_id=p_product_id) INTO existed;

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

  INSERT INTO public.digital_product_passports(
    organization_id,product_id,public_slug,is_published,published_at,public_payload,
    payload_version,payload_generated_at,payload_hash,published_certification_ids,updated_at
  )
  VALUES(
    p.organization_id,p_product_id,encode(extensions.gen_random_bytes(32),'hex'),true,now_at,payload,
    2,now_at,encode(extensions.digest(payload::text,'sha256'),'hex'),certification_ids,now_at
  )
  ON CONFLICT(product_id) DO UPDATE SET
    is_published=true,
    published_at=now_at,
    public_payload=payload,
    payload_version=2,
    payload_generated_at=now_at,
    payload_hash=encode(extensions.digest(payload::text,'sha256'),'hex'),
    published_certification_ids=certification_ids,
    updated_at=now_at;

  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
  VALUES(p.organization_id,auth.uid(),CASE WHEN existed THEN 'passport_republished' ELSE 'passport_published' END,'product',p.name);

  RETURN QUERY
  SELECT d.public_slug,d.published_at,d.payload_generated_at,d.payload_hash
  FROM public.digital_product_passports d
  WHERE d.product_id=p_product_id;
END;
$$;

COMMENT ON FUNCTION public.publish_product_passport(uuid) IS
  'Admin-only publication. Fails closed whenever authoritative product readiness contains blockers.';

CREATE OR REPLACE FUNCTION public.rollback_lifecycle_stage_without_evidence(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_stage public.lifecycle_stages%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE='28000';
  END IF;

  SELECT *
  INTO v_stage
  FROM public.lifecycle_stages
  WHERE id=p_stage_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.has_org_role(v_stage.organization_id,ARRAY['admin','manager']) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;

  IF EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.lifecycle_stage_id=p_stage_id) THEN
    RAISE EXCEPTION 'stage has evidence state and cannot be rolled back';
  END IF;

  DELETE FROM public.lifecycle_stages WHERE id=p_stage_id;

  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
  VALUES(v_stage.organization_id,v_actor,'lifecycle_stage_rolled_back','lifecycle_stage',p_stage_id::text);
END;
$$;

COMMENT ON FUNCTION public.rollback_lifecycle_stage_without_evidence(uuid) IS
  'Compensating operation for Admin/Manager evidence setup failures. Deletes only a same-tenant lifecycle stage with no evidence rows.';

REVOKE ALL ON FUNCTION public.rollback_lifecycle_stage_without_evidence(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_lifecycle_stage_without_evidence(uuid) TO authenticated;
