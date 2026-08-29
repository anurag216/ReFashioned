-- A factual, tenant-derived reporting projection. Environmental sums remain
-- NULL when no observations exist and the response contains no object paths or PII.
CREATE FUNCTION public.get_organization_sustainability_report()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid; v_name text; v_readiness jsonb; v_actions jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT m.organization_id,o.name INTO v_org,v_name
  FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
  WHERE m.profile_id=auth.uid() AND o.lifecycle_status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'active organization membership required' USING ERRCODE='42501'; END IF;

  v_readiness:=public.get_organization_product_readiness();
  v_actions:=public.get_organization_action_center();
  RETURN jsonb_build_object(
    'organization',jsonb_build_object('id',v_org,'name',v_name),
    'generated_at',statement_timestamp(),
    'tracked_product_count',(SELECT count(*) FROM public.products p WHERE p.organization_id=v_org AND p.status<>'archived'),
    'supplier_count',(SELECT count(*) FROM public.suppliers s WHERE s.organization_id=v_org),
    'products_ready_count',(SELECT count(*) FROM jsonb_array_elements(v_readiness) r WHERE (r->>'blocker_count')::int=0),
    'readiness_blocker_count',(SELECT count(*) FROM jsonb_array_elements(v_actions) a WHERE a->>'priority'<>'READY'),
    'material_complete_product_count',(SELECT count(*) FROM jsonb_array_elements(v_readiness) r WHERE (r->'dimensions'->'materials'->>'complete')::boolean),
    'supply_chain_complete_product_count',(SELECT count(*) FROM jsonb_array_elements(v_readiness) r WHERE (r->'dimensions'->'supply_chain'->>'complete')::boolean),
    'lifecycle_stage_count',(SELECT count(*) FROM public.lifecycle_stages s WHERE s.organization_id=v_org),
    'co2_observation_count',(SELECT count(s.co2_impact_kg) FROM public.lifecycle_stages s WHERE s.organization_id=v_org),
    'recorded_co2_kg',(SELECT sum(s.co2_impact_kg) FROM public.lifecycle_stages s WHERE s.organization_id=v_org AND s.co2_impact_kg IS NOT NULL),
    'water_observation_count',(SELECT count(s.water_usage_l) FROM public.lifecycle_stages s WHERE s.organization_id=v_org),
    'recorded_water_l',(SELECT sum(s.water_usage_l) FROM public.lifecycle_stages s WHERE s.organization_id=v_org AND s.water_usage_l IS NOT NULL),
    'trusted_evidence_count',(SELECT count(*) FROM public.evidence_uploads e WHERE e.organization_id=v_org AND e.status='approved' AND e.scan_status='clean' AND e.content_sha256 IS NOT NULL),
    'pending_evidence_count',(SELECT count(*) FROM public.evidence_uploads e WHERE e.organization_id=v_org AND e.status IN ('upload_pending','pending_review')),
    'quarantined_evidence_count',(SELECT count(*) FROM public.evidence_uploads e WHERE e.organization_id=v_org AND e.status='quarantined'),
    'rejected_evidence_count',(SELECT count(*) FROM public.evidence_uploads e WHERE e.organization_id=v_org AND e.status='rejected'),
    'valid_certification_count',(SELECT count(DISTINCT c.id) FROM public.certifications c JOIN public.evidence_uploads e ON e.id=c.evidence_id WHERE c.organization_id=v_org AND e.organization_id=v_org AND c.verification_status='verified' AND c.expiry_date>=current_date AND e.status='approved' AND e.scan_status='clean' AND e.content_sha256 IS NOT NULL),
    'published_dpp_count',(SELECT count(*) FROM jsonb_array_elements(v_readiness) r WHERE r->>'dpp_state' IN ('published','republish_needed')),
    'dpps_needing_republish',(SELECT count(*) FROM jsonb_array_elements(v_readiness) r WHERE r->>'dpp_state'='republish_needed')
  );
END $$;

COMMENT ON FUNCTION public.get_organization_sustainability_report() IS 'Factual sustainability data-readiness projection for the caller active organization; no PII or storage identifiers.';
REVOKE ALL ON FUNCTION public.get_organization_sustainability_report() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_sustainability_report() TO authenticated;
