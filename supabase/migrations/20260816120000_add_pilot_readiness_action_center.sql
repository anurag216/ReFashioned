-- Deterministic, tenant-scoped pilot readiness projections. These routines are
-- read-only and intentionally return no evidence object paths or DPP payloads.
CREATE FUNCTION public.get_organization_product_readiness()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT m.organization_id INTO v_org
  FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
  WHERE m.profile_id=auth.uid() AND o.lifecycle_status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'active organization membership required' USING ERRCODE='42501'; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'product_id', q.product_id, 'product_name', q.product_name,
      'overall_percent', CASE WHEN q.requirement_count=0 THEN 0 ELSE (100*q.complete_count/q.requirement_count)::int END,
      'blocker_count', q.blocker_count, 'supplier_count', q.supplier_count,
      'evidence_state', q.evidence_state, 'certification_state', q.certification_state, 'dpp_state', q.dpp_state,
      'dimensions', jsonb_build_object(
        'core_product',jsonb_build_object('applicable',true,'complete',q.core_done=2,'percent',50*q.core_done),
        'materials',jsonb_build_object('applicable',true,'complete',q.material_done=1,'percent',100*q.material_done),
        'supply_chain',jsonb_build_object('applicable',true,'complete',q.supply_done=1,'percent',100*q.supply_done),
        'evidence',jsonb_build_object('applicable',q.stage_count>0,'complete',q.stage_count>0 AND q.trusted_count=q.stage_count,'percent',CASE WHEN q.stage_count=0 THEN NULL ELSE 100*q.trusted_count/q.stage_count END),
        'certifications',jsonb_build_object('applicable',q.cert_required,'complete',NOT q.cert_required OR q.valid_cert_count>0,'percent',CASE WHEN NOT q.cert_required THEN NULL WHEN q.valid_cert_count>0 THEN 100 ELSE 0 END),
        'dpp',jsonb_build_object('applicable',true,'ready',q.dpp_ready,'state',q.dpp_state)
      ), 'blockers', q.blockers
    ) ORDER BY q.product_name,q.product_id)
    FROM (
      SELECT b.*,
        b.core_done+b.material_done+b.supply_done+
          CASE WHEN b.stage_count>0 THEN b.trusted_count ELSE 0 END+
          CASE WHEN b.cert_required AND b.valid_cert_count>0 THEN 1 ELSE 0 END AS complete_count,
        2+1+1+b.stage_count+CASE WHEN b.cert_required THEN 1 ELSE 0 END AS requirement_count,
        (CASE WHEN b.core_done<2 THEN 1 ELSE 0 END + CASE WHEN b.material_done=0 THEN 1 ELSE 0 END +
         CASE WHEN b.supply_done=0 THEN 1 ELSE 0 END + (b.stage_count-b.trusted_count) +
         CASE WHEN b.cert_required AND b.valid_cert_count=0 THEN 1 ELSE 0 END + CASE WHEN NOT b.dpp_ready THEN 1 ELSE 0 END) AS blocker_count,
        CASE WHEN b.stage_count=0 THEN 'missing' WHEN b.trusted_count=b.stage_count THEN 'trusted' WHEN b.rejected_count>0 THEN 'rejected' WHEN b.quarantined_count>0 THEN 'quarantined' ELSE 'pending_review' END evidence_state,
        CASE WHEN NOT b.cert_required THEN 'not_applicable' WHEN b.revoked_count>0 THEN 'revoked' WHEN b.expired_count>0 AND b.valid_cert_count=0 THEN 'expired' WHEN b.valid_cert_count>0 THEN CASE WHEN b.expiring_count>0 THEN 'expiring_soon' ELSE 'valid' END ELSE 'missing' END certification_state,
        CASE WHEN b.dpp_published AND b.dpp_dirty THEN 'republish_needed' WHEN b.dpp_published THEN 'published' WHEN b.dpp_ready THEN 'ready_to_publish' WHEN b.has_dpp THEN 'blocked' ELSE 'draft' END dpp_state,
        array_remove(ARRAY[
          CASE WHEN b.core_done<2 THEN 'Required product identity is incomplete' END,
          CASE WHEN b.material_done=0 THEN 'Material composition must total 100%' END,
          CASE WHEN b.supply_done=0 THEN 'A supplier-linked lifecycle stage is required' END,
          CASE WHEN b.stage_count>b.trusted_count THEN 'Every lifecycle stage requires approved, clean, fingerprinted evidence' END,
          CASE WHEN b.cert_required AND b.valid_cert_count=0 THEN 'A required, current evidence-backed certification is missing' END,
          CASE WHEN NOT b.dpp_ready THEN 'Current DPP publication checks are not satisfied' END
        ],NULL) blockers
      FROM (
        SELECT p.id product_id,p.name product_name,
          ((p.name<>'' AND p.status<>'archived')::int+(p.sku IS NOT NULL AND btrim(p.sku)<>'')::int) core_done,
          (COALESCE((SELECT sum(m.composition_percentage)=100 AND count(*)>0 AND bool_and(m.composition_percentage>0) FROM public.product_materials m WHERE m.product_id=p.id),false))::int material_done,
          (EXISTS(SELECT 1 FROM public.lifecycle_stages s WHERE s.product_id=p.id AND s.organization_id=v_org AND s.supplier_id IS NOT NULL))::int supply_done,
          (SELECT count(*) FROM public.lifecycle_stages s WHERE s.product_id=p.id AND s.organization_id=v_org) stage_count,
          (SELECT count(*) FROM public.lifecycle_stages s WHERE s.product_id=p.id AND s.organization_id=v_org AND EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.lifecycle_stage_id=s.id AND e.organization_id=v_org AND e.status='approved' AND e.scan_status='clean' AND e.content_sha256 IS NOT NULL)) trusted_count,
          (SELECT count(*) FROM public.evidence_uploads e JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE s.product_id=p.id AND e.organization_id=v_org AND e.status='rejected') rejected_count,
          (SELECT count(*) FROM public.evidence_uploads e JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE s.product_id=p.id AND e.organization_id=v_org AND e.status='quarantined') quarantined_count,
          EXISTS(SELECT 1 FROM public.product_materials m WHERE m.product_id=p.id AND m.certification_required) cert_required,
          (SELECT count(DISTINCT c.id) FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE s.product_id=p.id AND c.organization_id=v_org AND e.organization_id=v_org AND c.verification_status='verified' AND c.expiry_date>=current_date AND e.status='approved' AND e.scan_status='clean' AND e.content_sha256 IS NOT NULL) valid_cert_count,
          (SELECT count(*) FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE s.product_id=p.id AND c.organization_id=v_org AND c.verification_status='revoked') revoked_count,
          (SELECT count(*) FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE s.product_id=p.id AND c.organization_id=v_org AND c.verification_status<>'revoked' AND c.expiry_date<current_date) expired_count,
          (SELECT count(*) FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE s.product_id=p.id AND c.organization_id=v_org AND c.verification_status='verified' AND c.expiry_date BETWEEN current_date AND current_date+30) expiring_count,
          EXISTS(SELECT 1 FROM public.digital_product_passports d WHERE d.product_id=p.id AND d.organization_id=v_org) has_dpp,
          COALESCE((SELECT d.is_published FROM public.digital_product_passports d WHERE d.product_id=p.id AND d.organization_id=v_org),false) dpp_published,
          COALESCE((SELECT d.payload_hash IS DISTINCT FROM encode(extensions.digest(public.build_public_product_passport_payload(p.id)::text,'sha256'),'hex') FROM public.digital_product_passports d WHERE d.product_id=p.id AND d.organization_id=v_org AND d.is_published),false) dpp_dirty,
          EXISTS(SELECT 1 FROM public.lifecycle_stages s WHERE s.product_id=p.id) AND NOT EXISTS(SELECT 1 FROM public.lifecycle_stages s WHERE s.product_id=p.id AND (s.flagged OR s.co2_impact_kg<0 OR s.water_usage_l<0)) dpp_ready,
          (SELECT count(DISTINCT s.supplier_id) FROM public.lifecycle_stages s WHERE s.product_id=p.id AND s.organization_id=v_org AND s.supplier_id IS NOT NULL) supplier_count
        FROM public.products p WHERE p.organization_id=v_org AND p.status<>'archived'
      ) b
    ) q
  ),'[]'::jsonb);
END $$;

CREATE FUNCTION public.get_organization_action_center()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE rows jsonb; readiness jsonb;
BEGIN
  readiness:=public.get_organization_product_readiness();
  SELECT COALESCE(jsonb_agg(action ORDER BY priority,product_name,category),'[]'::jsonb) INTO rows
  FROM (
    SELECT CASE WHEN blocker='Current DPP publication checks are not satisfied' THEN 2 ELSE 1 END priority,
      jsonb_build_object(
        'category',CASE blocker WHEN 'Required product identity is incomplete' THEN 'MISSING_PRODUCT_DATA' WHEN 'Material composition must total 100%' THEN 'MISSING_MATERIAL_DATA' WHEN 'A supplier-linked lifecycle stage is required' THEN 'SUPPLIER_NOT_ONBOARDED' WHEN 'Every lifecycle stage requires approved, clean, fingerprinted evidence' THEN CASE r->>'evidence_state' WHEN 'rejected' THEN 'EVIDENCE_REJECTED' WHEN 'quarantined' THEN 'EVIDENCE_QUARANTINED' WHEN 'pending_review' THEN 'EVIDENCE_PENDING_REVIEW' ELSE 'MISSING_EVIDENCE' END WHEN 'A required, current evidence-backed certification is missing' THEN CASE r->>'certification_state' WHEN 'revoked' THEN 'CERTIFICATION_REVOKED' WHEN 'expired' THEN 'CERTIFICATION_EXPIRED' ELSE 'CERTIFICATION_MISSING' END ELSE 'DPP_NOT_READY' END,
        'priority',CASE WHEN blocker IN ('Every lifecycle stage requires approved, clean, fingerprinted evidence','A required, current evidence-backed certification is missing') THEN 'BLOCKED' ELSE 'NEEDS_ACTION' END,
        'severity',CASE WHEN blocker IN ('Every lifecycle stage requires approved, clean, fingerprinted evidence','A required, current evidence-backed certification is missing') THEN 'high' ELSE 'medium' END,
        'title',blocker,'explanation',blocker||' for “'||(r->>'product_name')||'”.',
        'entity_type','product','entity_id',r->>'product_id','product_id',r->>'product_id','product_name',r->>'product_name',
        'destination',CASE WHEN blocker LIKE '%supplier%' OR blocker LIKE '%lifecycle%' OR blocker LIKE '%evidence%' THEN '/traceability' WHEN blocker LIKE '%DPP%' THEN '/passport' ELSE '/products' END
      ) action,r->>'product_name' product_name,'BLOCKED' category
    FROM jsonb_array_elements(readiness) r CROSS JOIN LATERAL unnest(ARRAY(SELECT jsonb_array_elements_text(r->'blockers'))) blocker
    UNION ALL
    SELECT 3,jsonb_build_object('category','DPP_READY_TO_PUBLISH','priority','READY','severity','info','title','DPP ready to publish','explanation','“'||(r->>'product_name')||'” satisfies the application publication checks.','entity_type','product','entity_id',r->>'product_id','product_id',r->>'product_id','product_name',r->>'product_name','destination','/passport'),r->>'product_name','READY'
    FROM jsonb_array_elements(readiness) r WHERE r->>'dpp_state'='ready_to_publish'
    UNION ALL
    SELECT 1,jsonb_build_object('category','DPP_DIRTY_AFTER_PUBLICATION','priority','BLOCKED','severity','high','title','Republish recommended','explanation','The current internal record for “'||(r->>'product_name')||'” differs from its published snapshot.','entity_type','product','entity_id',r->>'product_id','product_id',r->>'product_id','product_name',r->>'product_name','destination','/passport'),r->>'product_name','BLOCKED'
    FROM jsonb_array_elements(readiness) r WHERE r->>'dpp_state'='republish_needed'
  ) actions;
  RETURN rows;
END $$;

COMMENT ON FUNCTION public.get_organization_product_readiness() IS 'Equal-count deterministic readiness checks for the caller active organization.';
COMMENT ON FUNCTION public.get_organization_action_center() IS 'Factual operational actions derived from the caller active organization records.';
REVOKE ALL ON FUNCTION public.get_organization_product_readiness(),public.get_organization_action_center() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_product_readiness(),public.get_organization_action_center() TO authenticated;
