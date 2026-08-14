-- Make the active audit trail a server-owned, append-only record.

-- Refuse to tighten the schema when historical data cannot satisfy the new
-- integrity contract. Historical audit records are never silently rewritten.
DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.audit_logs AS audit
    LEFT JOIN public.organizations AS organization
      ON organization.id = audit.organization_id
    WHERE audit.organization_id IS NULL
       OR organization.id IS NULL
       OR audit.created_at IS NULL
       OR audit.action !~ '^[a-z0-9_]{1,100}$'
       OR audit.entity_type !~ '^[a-z0-9_]{1,100}$'
       OR pg_catalog.btrim(audit.entity_name) = ''
       OR pg_catalog.char_length(audit.entity_name) > 500
       OR audit.entity_name ~ '[[:cntrl:]]'
  ) THEN
    RAISE EXCEPTION 'audit_logs contains rows that violate the audit integrity contract';
  END IF;
END
$preflight$;

ALTER TABLE public.audit_logs
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT audit_logs_action_format
    CHECK (action ~ '^[a-z0-9_]{1,100}$'),
  ADD CONSTRAINT audit_logs_entity_type_format
    CHECK (entity_type ~ '^[a-z0-9_]{1,100}$'),
  ADD CONSTRAINT audit_logs_entity_name_format
    CHECK (pg_catalog.btrim(entity_name) <> ''
       AND pg_catalog.char_length(entity_name) <= 500
       AND entity_name !~ '[[:cntrl:]]');

DROP POLICY IF EXISTS audit_logs_insert_own_actor ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_privileged_select ON public.audit_logs;

-- Privileges are an intentional second boundary in addition to RLS. Even the
-- API's privileged service role is not a generic audit mutation channel.
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs
  FROM PUBLIC, anon, authenticated, service_role;

CREATE POLICY audit_logs_privileged_select
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['admin','manager']));

-- audit_events predates audit_logs and has no application writers. Retain its
-- historical data, but prevent it becoming an alternate audit channel.
REVOKE ALL ON public.audit_events FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_events FROM service_role;
COMMENT ON TABLE public.audit_events IS
  'Legacy audit table retained for historical compatibility; no new events should be written.';

CREATE OR REPLACE FUNCTION public.audit_organization_membership_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  audit_action text;
  audit_organization_id uuid;
  audit_membership_id uuid;
BEGIN
  -- Database-owner migrations, fixture creation, and cascade maintenance do
  -- not have an authenticated actor and must not be misattributed.
  IF actor_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- A parent organization is removed before its foreign-key cascade deletes
  -- memberships. Skip that cascade path: it is not a standalone membership
  -- removal and its deleted organization can no longer satisfy the audit FK.
  IF TG_OP = 'DELETE'
     AND NOT EXISTS (
       SELECT 1
       FROM public.organizations AS organization
       WHERE organization.id = OLD.organization_id
     ) THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    audit_action := 'organization_member_added';
    audit_organization_id := NEW.organization_id;
    audit_membership_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    audit_action := 'organization_member_removed';
    audit_organization_id := OLD.organization_id;
    audit_membership_id := OLD.id;
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    audit_action := 'organization_member_role_changed';
    audit_organization_id := NEW.organization_id;
    audit_membership_id := NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_logs
    (organization_id, profile_id, action, entity_type, entity_name)
  VALUES
    (audit_organization_id, actor_id, audit_action,
     'organization_member', audit_membership_id::text);

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

COMMENT ON FUNCTION public.audit_organization_membership_change() IS
  'Private trigger that records authenticated membership mutations using auth.uid().';
REVOKE ALL ON FUNCTION public.audit_organization_membership_change()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS audit_organization_membership_change_trigger
  ON public.organization_members;
CREATE TRIGGER audit_organization_membership_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.audit_organization_membership_change();

CREATE OR REPLACE FUNCTION public.audit_organization_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  audit_action text;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    audit_action := 'organization_created';
  ELSIF NEW.name IS DISTINCT FROM OLD.name OR NEW.plan IS DISTINCT FROM OLD.plan THEN
    audit_action := 'organization_updated';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_logs
    (organization_id, profile_id, action, entity_type, entity_name)
  VALUES (NEW.id, actor_id, audit_action, 'organization', NEW.id::text);

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.audit_organization_change() IS
  'Private trigger that records authenticated organization creation and meaningful settings changes using auth.uid().';
REVOKE ALL ON FUNCTION public.audit_organization_change()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS audit_organization_change_trigger ON public.organizations;
CREATE TRIGGER audit_organization_change_trigger
AFTER INSERT OR UPDATE OF name, plan ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.audit_organization_change();

-- These two direct RLS business mutations previously attempted a second,
-- client-authored audit INSERT. Move their events beside the authoritative
-- rows instead, deriving both tenant and actor inside PostgreSQL.
CREATE OR REPLACE FUNCTION public.audit_product_archive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NOT NULL
     AND NEW.status = 'archived'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs
      (organization_id, profile_id, action, entity_type, entity_name)
    VALUES (NEW.organization_id, actor_id, 'archived', 'product', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.audit_product_archive()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER audit_product_archive_trigger
AFTER UPDATE OF status ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_product_archive();

CREATE OR REPLACE FUNCTION public.audit_lifecycle_stage_addition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NOT NULL THEN
    INSERT INTO public.audit_logs
      (organization_id, profile_id, action, entity_type, entity_name)
    VALUES (NEW.organization_id, actor_id, 'stage_added', 'lifecycle_stage', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.audit_lifecycle_stage_addition()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER audit_lifecycle_stage_addition_trigger
AFTER INSERT ON public.lifecycle_stages
FOR EACH ROW EXECUTE FUNCTION public.audit_lifecycle_stage_addition();
