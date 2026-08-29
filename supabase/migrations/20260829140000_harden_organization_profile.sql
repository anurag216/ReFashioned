-- Paying-pilot organization profile writes are intentionally narrow and
-- server-authorized. Browser roles retain tenant-scoped reads only.
REVOKE INSERT, UPDATE, DELETE ON public.organizations FROM authenticated;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create an organization" ON public.organizations;

CREATE FUNCTION public.update_organization_profile(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_org uuid;
  v_name text := btrim(p_name);
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'organization name cannot be empty' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'organization name cannot exceed 120 characters' USING ERRCODE = '22023';
  END IF;

  SELECT m.organization_id INTO v_org
  FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.profile_id = v_actor
    AND m.role = 'admin'
    AND o.lifecycle_status = 'active';

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'active organization administrator required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organizations SET name = v_name WHERE id = v_org;
  -- The existing protected organization audit trigger emits exactly one event.
END;
$function$;

REVOKE ALL ON FUNCTION public.update_organization_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_organization_profile(text) TO authenticated;
COMMENT ON FUNCTION public.update_organization_profile(text) IS
  'Updates only the authenticated active organization administrator name; plan is never client-controlled.';
