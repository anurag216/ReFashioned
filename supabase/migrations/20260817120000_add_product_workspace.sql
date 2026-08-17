-- A single, minimal product operating projection plus linearized remediation
-- mutations.  Readiness is selected from the existing authoritative RPC rather
-- than reimplemented here.
DO $preflight$
DECLARE duplicate_record record;
BEGIN
  SELECT organization_id, lower(btrim(sku)) canonical_sku INTO duplicate_record
  FROM public.products WHERE btrim(coalesce(sku,'')) <> ''
  GROUP BY organization_id, lower(btrim(sku)) HAVING count(*) > 1 LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'duplicate canonical product SKU for tenant %: %', duplicate_record.organization_id, duplicate_record.canonical_sku;
  END IF;
END $preflight$;

CREATE UNIQUE INDEX products_organization_canonical_sku_key
  ON public.products (organization_id, lower(btrim(sku)))
  WHERE btrim(coalesce(sku,'')) <> '';

CREATE FUNCTION public.get_product_workspace(p_product_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid; v_product public.products%ROWTYPE; v_readiness jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT m.organization_id INTO v_org FROM public.organization_members m
  JOIN public.organizations o ON o.id=m.organization_id
  WHERE m.profile_id=auth.uid() AND o.lifecycle_status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'active organization membership required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_product FROM public.products p WHERE p.id=p_product_id AND p.organization_id=v_org;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT r INTO v_readiness FROM jsonb_array_elements(public.get_organization_product_readiness()) r
  WHERE r->>'product_id'=p_product_id::text;
  RETURN jsonb_build_object(
    'product',jsonb_build_object('id',v_product.id,'name',v_product.name,'sku',v_product.sku,'season',v_product.season,'status',v_product.status),
    'readiness',v_readiness,
    'actions',COALESCE((SELECT jsonb_agg(jsonb_build_object('category',a->>'category','priority',a->>'priority','severity',a->>'severity','title',a->>'title','explanation',a->>'explanation','destination',a->>'destination') ORDER BY a->>'priority',a->>'category') FROM jsonb_array_elements(public.get_organization_action_center()) a WHERE a->>'product_id'=p_product_id::text),'[]'::jsonb),
    'materials',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'material_name',m.material_name,'composition_percentage',m.composition_percentage,'certification_required',m.certification_required) ORDER BY m.material_name,m.id) FROM public.product_materials m WHERE m.product_id=p_product_id),'[]'::jsonb),
    'lifecycle',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',s.id,'stage_name',s.stage_name,'stage_order',s.stage_order,'supplier_name',supplier.name,
      'co2_impact_kg',s.co2_impact_kg,'water_usage_l',s.water_usage_l,'flagged',s.flagged,
      'evidence_state',CASE WHEN EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.lifecycle_stage_id=s.id AND e.status='approved' AND e.scan_status='clean' AND e.content_sha256 IS NOT NULL) THEN 'trusted'
        WHEN EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.lifecycle_stage_id=s.id AND e.status='rejected') THEN 'rejected'
        WHEN EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.lifecycle_stage_id=s.id AND e.status='quarantined') THEN 'quarantined'
        WHEN EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.lifecycle_stage_id=s.id AND e.status='pending_review') THEN 'pending_review'
        WHEN EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.lifecycle_stage_id=s.id AND e.status='upload_pending') THEN 'upload_pending' ELSE 'missing' END
    ) ORDER BY s.stage_order,s.id) FROM public.lifecycle_stages s LEFT JOIN public.suppliers supplier ON supplier.id=s.supplier_id WHERE s.product_id=p_product_id AND s.organization_id=v_org),'[]'::jsonb),
    'certifications',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'verification_status',c.verification_status,'expiry_date',c.expiry_date,'evidence_trusted',(e.status='approved' AND e.scan_status='clean' AND e.content_sha256 IS NOT NULL)) ORDER BY c.name,c.id)
      FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id
      WHERE s.product_id=p_product_id AND c.organization_id=v_org AND e.organization_id=v_org),'[]'::jsonb)
  );
END $$;

CREATE FUNCTION public.update_product_metadata(p_product_id uuid,p_name text,p_sku text,p_season text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid; v_status text; v_rows bigint;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
 IF btrim(coalesce(p_name,''))='' THEN RAISE EXCEPTION 'product name is required' USING ERRCODE='22023'; END IF;
 -- The product row is the metadata mutation boundary. Authorization is read
 -- only after this wait, so membership/lifecycle/status changes win the race.
 SELECT p.organization_id,p.status INTO v_org,v_status FROM public.products p WHERE p.id=p_product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'product not found' USING ERRCODE='42501'; END IF;
 IF v_status='archived' THEN RAISE EXCEPTION 'archived products are read only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
   WHERE m.profile_id=auth.uid() AND m.organization_id=v_org AND m.role IN ('admin','manager') AND o.lifecycle_status='active')
 THEN RAISE EXCEPTION 'active admin or manager membership required' USING ERRCODE='42501'; END IF;
 UPDATE public.products SET name=btrim(p_name),sku=nullif(btrim(p_sku),''),season=nullif(btrim(p_season),'')
 WHERE id=p_product_id AND organization_id=v_org AND status<>'archived';
 GET DIAGNOSTICS v_rows=ROW_COUNT;
 IF v_rows<>1 THEN RAISE EXCEPTION 'product mutation failed closed' USING ERRCODE='42501'; END IF;
END $$;

CREATE FUNCTION public.create_product_material(p_product_id uuid,p_material_name text,p_composition_percentage numeric,p_certification_required boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid; v_id uuid; v_total numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
 IF btrim(coalesce(p_material_name,''))='' OR p_composition_percentage IS NULL OR p_composition_percentage<=0 OR p_composition_percentage>100 THEN RAISE EXCEPTION 'invalid material' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_product_id::text,0));
 -- Revalidate all live authority after acquiring the product mutation lock.
 SELECT p.organization_id INTO v_org FROM public.products p JOIN public.organizations o ON o.id=p.organization_id
 JOIN public.organization_members m ON m.organization_id=p.organization_id
 WHERE p.id=p_product_id AND p.status<>'archived' AND o.lifecycle_status='active'
   AND m.profile_id=auth.uid() AND m.role IN ('admin','manager');
 IF NOT FOUND THEN RAISE EXCEPTION 'editable product not found' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.product_materials WHERE product_id=p_product_id AND lower(btrim(material_name))=lower(btrim(p_material_name))) THEN RAISE EXCEPTION 'material already exists' USING ERRCODE='23505'; END IF;
 SELECT coalesce(sum(composition_percentage),0) INTO v_total FROM public.product_materials WHERE product_id=p_product_id;
 IF v_total+p_composition_percentage>100 THEN RAISE EXCEPTION 'material composition exceeds 100%%' USING ERRCODE='23514'; END IF;
 INSERT INTO public.product_materials(product_id,material_name,composition_percentage,certification_required) VALUES(p_product_id,btrim(p_material_name),p_composition_percentage,coalesce(p_certification_required,false)) RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,auth.uid(),'product_material_created','product_material',v_id::text);
 RETURN v_id;
END $$;

CREATE FUNCTION public.update_product_material(p_material_id uuid,p_material_name text,p_composition_percentage numeric,p_certification_required boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid; v_product uuid; v_current_product uuid; v_total numeric; v_rows bigint;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
 IF btrim(coalesce(p_material_name,''))='' OR p_composition_percentage IS NULL OR p_composition_percentage<=0 OR p_composition_percentage>100 THEN RAISE EXCEPTION 'invalid material' USING ERRCODE='22023'; END IF;
 SELECT product_id INTO v_product FROM public.product_materials WHERE id=p_material_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'editable material not found' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_product::text,0));
 SELECT pm.product_id,p.organization_id INTO v_current_product,v_org FROM public.product_materials pm
 JOIN public.products p ON p.id=pm.product_id JOIN public.organizations o ON o.id=p.organization_id
 JOIN public.organization_members m ON m.organization_id=p.organization_id
 WHERE pm.id=p_material_id AND pm.product_id=v_product AND p.status<>'archived' AND o.lifecycle_status='active'
   AND m.profile_id=auth.uid() AND m.role IN ('admin','manager') FOR UPDATE OF pm;
 IF NOT FOUND OR v_current_product<>v_product THEN RAISE EXCEPTION 'editable material not found' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.product_materials WHERE product_id=v_product AND id<>p_material_id AND lower(btrim(material_name))=lower(btrim(p_material_name))) THEN RAISE EXCEPTION 'material already exists' USING ERRCODE='23505'; END IF;
 SELECT coalesce(sum(composition_percentage),0) INTO v_total FROM public.product_materials WHERE product_id=v_product AND id<>p_material_id;
 IF v_total+p_composition_percentage>100 THEN RAISE EXCEPTION 'material composition exceeds 100%%' USING ERRCODE='23514'; END IF;
 UPDATE public.product_materials SET material_name=btrim(p_material_name),composition_percentage=p_composition_percentage,certification_required=coalesce(p_certification_required,false) WHERE id=p_material_id AND product_id=v_product;
 GET DIAGNOSTICS v_rows=ROW_COUNT;
 IF v_rows<>1 THEN RAISE EXCEPTION 'material mutation failed closed' USING ERRCODE='42501'; END IF;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,auth.uid(),'product_material_updated','product_material',p_material_id::text);
END $$;

CREATE FUNCTION public.remove_product_material(p_material_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid; v_product uuid; v_current_product uuid; v_rows bigint;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
 SELECT product_id INTO v_product FROM public.product_materials WHERE id=p_material_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'editable material not found' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_product::text,0));
 SELECT pm.product_id,p.organization_id INTO v_current_product,v_org FROM public.product_materials pm
 JOIN public.products p ON p.id=pm.product_id JOIN public.organizations o ON o.id=p.organization_id
 JOIN public.organization_members m ON m.organization_id=p.organization_id
 WHERE pm.id=p_material_id AND pm.product_id=v_product AND p.status<>'archived' AND o.lifecycle_status='active'
   AND m.profile_id=auth.uid() AND m.role IN ('admin','manager') FOR UPDATE OF pm;
 IF NOT FOUND OR v_current_product<>v_product THEN RAISE EXCEPTION 'editable material not found' USING ERRCODE='42501'; END IF;
 DELETE FROM public.product_materials WHERE id=p_material_id AND product_id=v_product;
 GET DIAGNOSTICS v_rows=ROW_COUNT;
 IF v_rows<>1 THEN RAISE EXCEPTION 'material mutation failed closed' USING ERRCODE='42501'; END IF;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,auth.uid(),'product_material_removed','product_material',p_material_id::text);
END $$;

-- Product material writes are RPC-only for normal API clients. Keep SELECT for
-- existing read screens and service_role ownership for fixtures/imports.
REVOKE INSERT,UPDATE,DELETE ON public.product_materials FROM PUBLIC,anon,authenticated;
DROP POLICY IF EXISTS products_manager_update ON public.products;
CREATE POLICY products_manager_update ON public.products FOR UPDATE TO authenticated
 USING (status<>'archived' AND public.has_org_role(organization_id,ARRAY['admin','manager']))
 WITH CHECK (public.has_org_role(organization_id,ARRAY['admin','manager']));

REVOKE ALL ON FUNCTION public.get_product_workspace(uuid),public.update_product_metadata(uuid,text,text,text),public.create_product_material(uuid,text,numeric,boolean),public.update_product_material(uuid,text,numeric,boolean),public.remove_product_material(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_workspace(uuid),public.update_product_metadata(uuid,text,text,text),public.create_product_material(uuid,text,numeric,boolean),public.update_product_material(uuid,text,numeric,boolean),public.remove_product_material(uuid) TO authenticated;
