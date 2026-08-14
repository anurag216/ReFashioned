-- Close the public-schema API by default. Existing application access is
-- re-established below as an explicit, reviewable allowlist.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, USAGE ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON ROUTINES FROM PUBLIC, anon, authenticated;

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
