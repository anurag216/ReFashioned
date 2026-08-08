-- Make tenant authorization authoritative in PostgreSQL. This migration is
-- additive and deliberately aborts rather than guessing how to repair bad roles.
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'organization_members contains null organization_id values; correct them before applying this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE profile_id IS NULL) THEN
    RAISE EXCEPTION 'organization_members contains null profile_id values; correct them before applying this migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE role IS NULL OR role NOT IN ('admin', 'manager', 'viewer')
  ) THEN
    RAISE EXCEPTION 'organization_members contains null or unsupported roles; correct them before applying this migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_members
    GROUP BY organization_id
    HAVING count(*) FILTER (WHERE role = 'admin') = 0
  ) THEN
    RAISE EXCEPTION 'an organization with memberships has no admin; add a valid admin before applying this migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_members
    GROUP BY profile_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'a profile has multiple organization memberships; the pilot supports one organization per profile';
  END IF;
END
$migration$;

ALTER TABLE public.organization_members
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN profile_id SET NOT NULL,
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('admin', 'manager', 'viewer'));

-- The pilot UI has no organization switcher. Enforce that same invariant in the
-- database so an administrator cannot create a state the client refuses to use.
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_profile_id_key UNIQUE (profile_id);

-- brands/users are unused legacy MVP tables with no relationship to the active
-- organization model. They remain available to service_role only and are not
-- exposed through the public client API.
REVOKE ALL ON TABLE public.brands, public.users FROM anon, authenticated;

-- These functions only reveal a boolean, pin their search path, fully qualify
-- all referenced objects, and run as their owner solely to avoid recursive RLS
-- evaluation on organization_members.
CREATE OR REPLACE FUNCTION public.is_org_member(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organization_members AS membership
    WHERE membership.organization_id = target_organization_id
      AND membership.profile_id = auth.uid()
  );
$function$;

COMMENT ON FUNCTION public.is_org_member(uuid) IS
  'RLS recursion-safe boolean membership check. SECURITY DEFINER is safe because it returns no tenant data and uses a fixed search_path and qualified relations.';

CREATE OR REPLACE FUNCTION public.has_org_role(target_organization_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organization_members AS membership
    WHERE membership.organization_id = target_organization_id
      AND membership.profile_id = auth.uid()
      AND membership.role = ANY (allowed_roles)
  );
$function$;

COMMENT ON FUNCTION public.has_org_role(uuid, text[]) IS
  'RLS recursion-safe boolean role check. SECURITY DEFINER is safe because it returns no tenant data and uses a fixed search_path and qualified relations.';

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated;

-- Serialize changes to an organization's administrator set by locking the
-- parent organization row. This makes the final-admin invariant concurrency-safe.
CREATE OR REPLACE FUNCTION public.protect_organization_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND
     (NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
      NEW.profile_id IS DISTINCT FROM OLD.profile_id) THEN
    RAISE EXCEPTION 'membership organization and profile cannot be changed';
  END IF;

  PERFORM 1 FROM public.organizations WHERE id = OLD.organization_id FOR UPDATE;
  -- A parent DELETE removes the organization before its FK cascade fires. In
  -- that one case there is no tenant whose final-admin invariant can protect.
  IF TG_OP = 'DELETE' AND NOT FOUND THEN
    RETURN OLD;
  END IF;

  IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role <> 'admin') AND NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = OLD.organization_id
      AND role = 'admin'
      AND id <> OLD.id
  ) THEN
    RAISE EXCEPTION 'cannot remove or demote the final organization admin';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

COMMENT ON FUNCTION public.protect_organization_membership() IS
  'Locks the organization and prevents concurrent removal or demotion of its final admin; exposes no data and is only callable as a trigger.';
REVOKE ALL ON FUNCTION public.protect_organization_membership() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_organization_membership_trigger ON public.organization_members;
CREATE TRIGGER protect_organization_membership_trigger
BEFORE UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.protect_organization_membership();

-- Remove all historical policies from the tenant-owned tables before installing
-- one explicit, auditable policy set. Intentional published-passport reads are
-- recreated below.
DO $policies$
DECLARE target_table text; policy_name text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'products', 'product_materials', 'suppliers', 'supplier_contacts',
    'lifecycle_stages', 'evidence_uploads', 'certifications', 'data_requests',
    'compliance_reports', 'digital_product_passports', 'supplier_invites',
    'audit_logs', 'organizations', 'organization_members'
  ] LOOP
    FOR policy_name IN
      SELECT policies.policyname FROM pg_catalog.pg_policies AS policies
      WHERE policies.schemaname = 'public' AND policies.tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_name, target_table);
    END LOOP;
  END LOOP;
END
$policies$;

-- No policy or application code uses this historical recursion workaround.
-- Remove its client grant and definition rather than retaining a broadly
-- exposed SECURITY DEFINER routine with a weaker search path.
REVOKE ALL ON FUNCTION public.get_auth_user_orgs() FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.get_auth_user_orgs();

CREATE POLICY organization_members_select ON public.organization_members FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_org_member(organization_id));
CREATE POLICY organization_members_insert ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']));
CREATE POLICY organization_members_update ON public.organization_members FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']) AND role IN ('admin','manager','viewer'));
CREATE POLICY organization_members_delete ON public.organization_members FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin']));

CREATE POLICY organizations_select ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, ARRAY['admin']))
  WITH CHECK (public.has_org_role(id, ARRAY['admin']));
-- No direct INSERT or DELETE policy: organization creation is only through RPC.

-- Standard organization-owned operational tables: all members read, admins and
-- managers create/update, and only admins delete.
DO $operational$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'products', 'suppliers', 'lifecycle_stages', 'evidence_uploads',
    'certifications', 'data_requests', 'compliance_reports',
    'digital_product_passports'
  ] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(organization_id))', target_table || '_tenant_select', target_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_org_role(organization_id, ARRAY[''admin'',''manager'']))', target_table || '_manager_insert', target_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY[''admin'',''manager''])) WITH CHECK (public.has_org_role(organization_id, ARRAY[''admin'',''manager'']))', target_table || '_manager_update', target_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY[''admin'']))', target_table || '_admin_delete', target_table);
  END LOOP;
END
$operational$;

-- Child tables derive their tenant from their immutable parent relationship.
CREATE POLICY product_materials_select ON public.product_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_member(p.organization_id)));
CREATE POLICY product_materials_insert ON public.product_materials FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_role(p.organization_id, ARRAY['admin','manager'])));
CREATE POLICY product_materials_update ON public.product_materials FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_role(p.organization_id, ARRAY['admin','manager'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_role(p.organization_id, ARRAY['admin','manager'])));
CREATE POLICY product_materials_delete ON public.product_materials FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_role(p.organization_id, ARRAY['admin'])));

CREATE POLICY supplier_contacts_select ON public.supplier_contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.is_org_member(s.organization_id)));
CREATE POLICY supplier_contacts_insert ON public.supplier_contacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.has_org_role(s.organization_id, ARRAY['admin','manager'])));
CREATE POLICY supplier_contacts_update ON public.supplier_contacts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.has_org_role(s.organization_id, ARRAY['admin','manager'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.has_org_role(s.organization_id, ARRAY['admin','manager'])));
CREATE POLICY supplier_contacts_delete ON public.supplier_contacts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.has_org_role(s.organization_id, ARRAY['admin'])));

CREATE POLICY supplier_invites_admin_all ON public.supplier_invites FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']));

-- Interim control until audit events are written server-side: callers may only
-- record their own identity in their tenant; viewing is admin/manager only.
CREATE POLICY audit_logs_insert_own_actor ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND profile_id = auth.uid());
CREATE POLICY audit_logs_privileged_select ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','manager']));

-- Preserve the current public passport behavior without granting public writes.
CREATE POLICY published_dpps_public ON public.digital_product_passports FOR SELECT TO anon, authenticated
  USING (is_published = true);
CREATE POLICY published_products_public ON public.products FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY published_stages_public ON public.lifecycle_stages FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published'));
CREATE POLICY published_product_suppliers_public ON public.suppliers FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.lifecycle_stages ls JOIN public.products p ON p.id = ls.product_id WHERE ls.supplier_id = suppliers.id AND p.status = 'published'));

CREATE OR REPLACE FUNCTION public.create_organization_with_admin(organization_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  normalized_name text := pg_catalog.btrim(organization_name);
  created_organization_id uuid;
  current_email text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;
  IF normalized_name IS NULL OR normalized_name = '' THEN
    RAISE EXCEPTION 'organization name is required' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.char_length(normalized_name) > 120 THEN
    RAISE EXCEPTION 'organization name must be 120 characters or fewer' USING ERRCODE = '22023';
  END IF;

  -- Serialize onboarding for this identity, including concurrent RPC calls.
  SELECT email INTO current_email FROM auth.users WHERE id = current_user_id FOR UPDATE;
  IF current_email IS NULL THEN
    RAISE EXCEPTION 'authenticated user has no email' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE profile_id = current_user_id) THEN
    RAISE EXCEPTION 'user already belongs to an organization' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.profiles (id, email)
  VALUES (current_user_id, current_email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.organizations (name, plan)
  VALUES (normalized_name, 'starter')
  RETURNING id INTO created_organization_id;

  INSERT INTO public.organization_members (organization_id, profile_id, role)
  VALUES (created_organization_id, current_user_id, 'admin');

  RETURN created_organization_id;
END;
$function$;

COMMENT ON FUNCTION public.create_organization_with_admin(text) IS
  'Atomic authenticated onboarding. The definer function derives identity from auth.uid(), validates input, and uses a fixed search_path with qualified objects.';
REVOKE ALL ON FUNCTION public.create_organization_with_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin(text) TO authenticated;
