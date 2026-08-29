-- Authenticated, tenant-scoped projection of the exact public-safe payload that
-- would be snapshotted by publish_product_passport.
CREATE OR REPLACE FUNCTION public.get_product_passport_preview(p_product_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE v_org uuid; v_actor uuid:=auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT p.organization_id INTO v_org FROM public.products p WHERE p.id=p_product_id;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.profile_id=v_actor AND m.organization_id=v_org
      AND m.role IN ('admin','manager','viewer') AND o.lifecycle_status='active'
  ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  RETURN public.build_public_product_passport_payload(p_product_id);
END $function$;

REVOKE ALL ON FUNCTION public.get_product_passport_preview(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_passport_preview(uuid) TO authenticated;
COMMENT ON FUNCTION public.get_product_passport_preview(uuid) IS 'Current public-safe DPP projection for a live active organization member; delegates to the private authoritative builder.';
