-- Close the public-schema API by default. Existing application access is
-- re-established below as an explicit, reviewable allowlist.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, USAGE ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON ROUTINES FROM anon, authenticated;

-- Event-trigger failures must abort the creating transaction. In particular,
-- do not catch an ALTER TABLE failure and allow an unprotected table to exist.
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
      AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
  END LOOP;
END;
$function$;

-- PostgreSQL grants EXECUTE to PUBLIC on new routines. Remove every inherited
-- or historical client grant first, then expose only the reviewed API below.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Anonymous API: curated, privacy-safe projections only.
GRANT EXECUTE ON FUNCTION public.get_public_product_passport(text),
  public.get_supplier_invite_metadata(text)
TO anon;

-- Authenticated RLS helpers and application RPCs.
GRANT EXECUTE ON FUNCTION
  public.is_org_member(uuid),
  public.has_org_role(uuid,text[]),
  public.create_organization_with_admin(text),
  public.create_supplier_invite(uuid,text),
  public.get_supplier_invite_metadata(text),
  public.redeem_supplier_invite(text),
  public.get_my_supplier_access(),
  public.create_supplier_contact(uuid,text,text),
  public.update_supplier_contact(uuid,text,text),
  public.delete_supplier_contact(uuid),
  public.revoke_supplier_invite(uuid),
  public.revoke_supplier_access(uuid,text),
  public.get_supplier_access_admin(uuid),
  public.current_actor_is_active_supplier_for(uuid),
  public.publish_product_passport(uuid),
  public.unpublish_product_passport(uuid),
  public.rotate_product_passport_slug(uuid),
  public.get_product_passport_publication_state(uuid),
  public.get_public_product_passport(text),
  public.current_actor_can_upload_evidence(uuid),
  public.current_actor_can_read_evidence_object(text,text),
  public.create_evidence_upload_intent(uuid,text,text,text,bigint),
  public.finalize_evidence_upload(uuid),
  public.cancel_evidence_upload_intent(uuid),
  public.get_evidence_download_target(uuid),
  public.review_evidence_upload(uuid,text,text),
  public.create_certification_from_evidence(uuid,text,date),
  public.revoke_certification(uuid),
  public.get_my_supplier_evidence_tasks(),
  public.get_my_organization_evidence(uuid)
TO authenticated;

-- No table is an anonymous projection. Public passport and invitation reads go
-- through the two curated RPCs above.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Sensitive workflows are RPC/server controlled. Retain the audit trail's
-- intentionally RLS-scoped read, but never its client mutation privileges.
REVOKE ALL ON TABLE public.brands, public.users, public.audit_events,
  public.supplier_contacts, public.supplier_invites,
  public.supplier_access_memberships, public.evidence_uploads,
  public.certifications, public.digital_product_passports
FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Identity rows are self-scoped by RLS and needed during onboarding. Deletion
-- remains a server concern.
REVOKE DELETE ON public.profiles FROM authenticated;

-- The event trigger invokes this as infrastructure; no API role needs direct
-- execution, including the otherwise privileged service API role.
REVOKE ALL ON FUNCTION public.rls_auto_enable()
FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.rls_auto_enable() IS
  'Private event-trigger function: enables RLS on new public tables and propagates failures to abort unsafe DDL.';

-- Storage policies execute with the caller's table privileges. Keep evidence
-- rows private and expose only this current-actor boolean decision to the
-- compliance_docs INSERT policy.
CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- Per-schema default ACLs cannot subtract PostgreSQL's global default EXECUTE
-- grant to PUBLIC. Harden each new or replaced public routine at DDL completion
-- instead, so its creating transaction must explicitly restore intended API
-- grants after CREATE or CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION private.harden_public_routine_privileges()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  command record;
BEGIN
  FOR command IN
    SELECT *
    FROM pg_catalog.pg_event_trigger_ddl_commands()
    WHERE schema_name = 'public'
      AND object_type IN ('function', 'procedure', 'aggregate')
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE EXECUTE ON ROUTINE %s FROM PUBLIC, anon, authenticated',
      command.object_identity
    );
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION private.harden_public_routine_privileges()
FROM PUBLIC, anon, authenticated, service_role;

DROP EVENT TRIGGER IF EXISTS harden_public_routine_privileges;
CREATE EVENT TRIGGER harden_public_routine_privileges
ON ddl_command_end
WHEN TAG IN ('CREATE FUNCTION', 'CREATE PROCEDURE', 'CREATE AGGREGATE')
EXECUTE FUNCTION private.harden_public_routine_privileges();

CREATE OR REPLACE FUNCTION private.current_actor_can_upload_evidence_object(
  p_bucket text,
  p_path text,
  p_mime_type text,
  p_size_bytes bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.evidence_uploads AS evidence
      WHERE evidence.storage_bucket = p_bucket
        AND evidence.storage_path = p_path
        AND evidence.status = 'upload_pending'
        AND evidence.upload_expires_at > pg_catalog.now()
        AND evidence.uploaded_by = auth.uid()
        AND evidence.mime_type = p_mime_type
        AND evidence.size_bytes = p_size_bytes
        AND public.current_actor_can_upload_evidence(evidence.lifecycle_stage_id)
    );
$function$;

REVOKE ALL ON FUNCTION private.current_actor_can_upload_evidence_object(text,text,text,bigint)
FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_actor_can_upload_evidence_object(text,text,text,bigint)
TO authenticated;

DROP POLICY IF EXISTS compliance_docs_insert ON storage.objects;
CREATE POLICY compliance_docs_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'compliance_docs'
  AND owner = auth.uid()
  AND metadata->>'mimetype' IN ('application/pdf','image/png','image/jpeg')
  AND CASE
    WHEN metadata->>'size' ~ '^[0-9]{1,8}$' THEN
      (metadata->>'size')::bigint BETWEEN 1 AND 10485760
      AND private.current_actor_can_upload_evidence_object(
        bucket_id,
        name,
        metadata->>'mimetype',
        (metadata->>'size')::bigint
      )
    ELSE false
  END
);
