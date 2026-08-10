-- Separate supplier contact metadata from the server-controlled portal identity.

ALTER TABLE public.supplier_contacts
  ADD CONSTRAINT supplier_contacts_id_supplier_id_key UNIQUE (id, supplier_id);

CREATE TABLE public.supplier_access_memberships (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  organization_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  supplier_contact_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  invitation_id uuid REFERENCES public.supplier_invites(id),
  legacy_migrated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason text,
  CONSTRAINT supplier_access_supplier_scope_fkey
    FOREIGN KEY (supplier_id, organization_id)
    REFERENCES public.suppliers(id, organization_id),
  CONSTRAINT supplier_access_contact_scope_fkey
    FOREIGN KEY (supplier_contact_id, supplier_id)
    REFERENCES public.supplier_contacts(id, supplier_id),
  CONSTRAINT supplier_access_provenance_check CHECK (
    (legacy_migrated AND invitation_id IS NULL) OR
    (NOT legacy_migrated AND invitation_id IS NOT NULL)
  ),
  CONSTRAINT supplier_access_revocation_check CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND length(revocation_reason) BETWEEN 3 AND 500)
  )
);
CREATE UNIQUE INDEX supplier_access_active_profile_uidx
  ON public.supplier_access_memberships(profile_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX supplier_access_active_contact_uidx
  ON public.supplier_access_memberships(supplier_contact_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX supplier_access_invitation_uidx
  ON public.supplier_access_memberships(invitation_id) WHERE invitation_id IS NOT NULL;

-- Fail closed, identifying the exact unsafe legacy contact before changing data.
DO $$
DECLARE bad record;
BEGIN
  SELECT c.id, CASE
    WHEN s.id IS NULL THEN 'supplier does not exist'
    WHEN o.id IS NULL THEN 'supplier organization does not exist'
    WHEN c.email IS NULL OR btrim(c.email) = '' THEN 'contact email is missing'
    WHEN length(btrim(c.email)) > 254 OR lower(btrim(c.email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN 'contact email is invalid'
    WHEN p.id IS NULL THEN 'profile does not exist'
    WHEN u.id IS NULL THEN 'auth user does not exist'
    WHEN lower(btrim(coalesce(u.email,''))) IS DISTINCT FROM lower(btrim(c.email)) THEN 'auth email does not match contact email'
    WHEN EXISTS (SELECT 1 FROM public.organization_members m WHERE m.profile_id=c.profile_id) THEN 'profile is an internal organization member'
    WHEN (SELECT count(*) FROM public.supplier_contacts x WHERE x.profile_id=c.profile_id) > 1 THEN 'profile is attached to multiple supplier contacts'
    ELSE NULL END AS reason
  INTO bad
  FROM public.supplier_contacts c
  LEFT JOIN public.suppliers s ON s.id=c.supplier_id
  LEFT JOIN public.organizations o ON o.id=s.organization_id
  LEFT JOIN public.profiles p ON p.id=c.profile_id
  LEFT JOIN auth.users u ON u.id=c.profile_id
  WHERE c.profile_id IS NOT NULL
    AND (s.id IS NULL OR o.id IS NULL OR c.email IS NULL OR btrim(c.email) = ''
      OR length(btrim(c.email)) > 254 OR lower(btrim(c.email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      OR p.id IS NULL OR u.id IS NULL
      OR lower(btrim(coalesce(u.email,''))) IS DISTINCT FROM lower(btrim(c.email))
      OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.profile_id=c.profile_id)
      OR (SELECT count(*) FROM public.supplier_contacts x WHERE x.profile_id=c.profile_id) > 1)
  ORDER BY c.id LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'unsafe legacy supplier contact %: %', bad.id, bad.reason; END IF;
END $$;

INSERT INTO public.supplier_access_memberships
  (organization_id,supplier_id,supplier_contact_id,profile_id,legacy_migrated)
SELECT s.organization_id,c.supplier_id,c.id,c.profile_id,true
FROM public.supplier_contacts c JOIN public.suppliers s ON s.id=c.supplier_id
WHERE c.profile_id IS NOT NULL;

DROP INDEX IF EXISTS public.supplier_contacts_one_profile_uidx;

ALTER TABLE public.supplier_access_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supplier_access_memberships FROM PUBLIC,anon,authenticated;
DROP POLICY IF EXISTS supplier_contacts_insert ON public.supplier_contacts;
DROP POLICY IF EXISTS supplier_contacts_update ON public.supplier_contacts;
DROP POLICY IF EXISTS supplier_contacts_delete ON public.supplier_contacts;
REVOKE INSERT,UPDATE,DELETE ON public.supplier_contacts FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.supplier_identity_lock(p_supplier_id uuid,p_email text)
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT pg_advisory_xact_lock(hashtextextended(p_supplier_id::text || ':' || lower(btrim(p_email)), 0))
$$;
REVOKE ALL ON FUNCTION public.supplier_identity_lock(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.validate_supplier_contact_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
    RAISE EXCEPTION 'supplier contact supplier is immutable';
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND (TG_OP='DELETE' OR lower(btrim(NEW.email)) IS DISTINCT FROM lower(btrim(OLD.email))) THEN
    IF EXISTS (SELECT 1 FROM public.supplier_access_memberships a WHERE a.supplier_contact_id=OLD.id AND a.revoked_at IS NULL) THEN
      RAISE EXCEPTION 'revoke active supplier access before changing or deleting this contact' USING ERRCODE='55000';
    END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_invites i WHERE i.supplier_id=OLD.supplier_id
      AND lower(btrim(i.email))=lower(btrim(OLD.email)) AND i.redeemed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now()) THEN
      RAISE EXCEPTION 'revoke pending supplier invitation before changing or deleting this contact' USING ERRCODE='55000';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_supplier_contact_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_supplier_contact_change_trigger
BEFORE UPDATE OR DELETE ON public.supplier_contacts FOR EACH ROW
EXECUTE FUNCTION public.validate_supplier_contact_change();

CREATE OR REPLACE FUNCTION public.prevent_dual_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_TABLE_NAME='organization_members' THEN
    IF EXISTS (SELECT 1 FROM public.supplier_access_memberships a WHERE a.profile_id=NEW.profile_id AND a.revoked_at IS NULL) THEN
      RAISE EXCEPTION 'revoke supplier access before adding an internal membership' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.revoked_at IS NULL AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.profile_id=NEW.profile_id) THEN
    RAISE EXCEPTION 'remove internal membership before granting supplier access' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.prevent_dual_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER organization_members_no_supplier_identity
BEFORE INSERT OR UPDATE OF profile_id ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.prevent_dual_identity();
CREATE TRIGGER supplier_access_no_internal_identity
BEFORE INSERT OR UPDATE OF profile_id,revoked_at ON public.supplier_access_memberships FOR EACH ROW EXECUTE FUNCTION public.prevent_dual_identity();

CREATE OR REPLACE FUNCTION public.create_supplier_contact(p_supplier_id uuid,p_name text,p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_name text:=regexp_replace(btrim(p_name),'[[:space:]]+',' ','g'); v_email text:=lower(btrim(p_email)); v_id uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.suppliers WHERE id=p_supplier_id;
  IF v_actor IS NULL OR v_org IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE profile_id=v_actor AND organization_id=v_org AND role IN ('admin','manager')) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'contact name must be 1 to 120 characters' USING ERRCODE='22023'; END IF;
  IF v_email IS NULL OR length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'a valid email is required' USING ERRCODE='22023'; END IF;
  INSERT INTO public.supplier_contacts(supplier_id,name,email) VALUES(p_supplier_id,v_name,v_email) RETURNING id INTO v_id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'supplier_contact_created','supplier_contact',v_id::text);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_supplier_contact(p_supplier_contact_id uuid,p_name text,p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v record; v_name text:=regexp_replace(btrim(p_name),'[[:space:]]+',' ','g'); v_email text:=lower(btrim(p_email));
BEGIN
  SELECT c.*,s.organization_id INTO v FROM public.supplier_contacts c JOIN public.suppliers s ON s.id=c.supplier_id WHERE c.id=p_supplier_contact_id FOR UPDATE OF c;
  IF NOT FOUND OR v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE profile_id=v_actor AND organization_id=v.organization_id AND role IN ('admin','manager')) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'contact name must be 1 to 120 characters' USING ERRCODE='22023'; END IF;
  IF v_email IS NULL OR length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'a valid email is required' USING ERRCODE='22023'; END IF;
  UPDATE public.supplier_contacts SET name=v_name,email=v_email WHERE id=v.id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'supplier_contact_updated','supplier_contact',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.delete_supplier_contact(p_supplier_contact_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v record;
BEGIN
  SELECT c.*,s.organization_id INTO v FROM public.supplier_contacts c JOIN public.suppliers s ON s.id=c.supplier_id WHERE c.id=p_supplier_contact_id FOR UPDATE OF c;
  IF NOT FOUND OR v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE profile_id=v_actor AND organization_id=v.organization_id AND role='admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  DELETE FROM public.supplier_contacts WHERE id=v.id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'supplier_contact_deleted','supplier_contact',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.create_supplier_invite(p_supplier_id uuid,p_email text)
RETURNS TABLE(invitation_id uuid,token text,expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_email text:=lower(btrim(p_email)); v_token text; v_id uuid; v_exp timestamptz:=now()+interval '7 days'; v_old record;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  IF v_email IS NULL OR length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'a valid email is required' USING ERRCODE='22023'; END IF;
  SELECT organization_id INTO v_org FROM public.suppliers WHERE id=p_supplier_id;
  IF v_org IS NULL OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=v_actor AND organization_id=v_org AND role='admin') THEN RAISE EXCEPTION 'not authorized to invite for this supplier' USING ERRCODE='42501'; END IF;
  PERFORM public.supplier_identity_lock(p_supplier_id,v_email);
  IF EXISTS(SELECT 1 FROM public.supplier_contacts c JOIN public.supplier_access_memberships a ON a.supplier_contact_id=c.id AND a.revoked_at IS NULL WHERE c.supplier_id=p_supplier_id AND lower(btrim(c.email))=v_email) THEN RAISE EXCEPTION 'supplier contact already has active portal access' USING ERRCODE='55000'; END IF;
  FOR v_old IN SELECT id FROM public.supplier_invites WHERE supplier_id=p_supplier_id AND lower(btrim(email))=v_email AND redeemed_at IS NULL AND revoked_at IS NULL FOR UPDATE LOOP
    UPDATE public.supplier_invites SET revoked_at=now(),status='revoked' WHERE id=v_old.id;
    INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'supplier_invite_replaced','supplier_invite',v_old.id::text);
  END LOOP;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO public.supplier_invites(organization_id,supplier_id,email,token_hash,status,expires_at,created_by) VALUES(v_org,p_supplier_id,v_email,encode(extensions.digest(v_token,'sha256'),'hex'),'sent',v_exp,v_actor) RETURNING id INTO v_id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'supplier_invite_created','supplier_invite',v_id::text);
  RETURN QUERY SELECT v_id,v_token,v_exp;
END $$;

CREATE OR REPLACE FUNCTION public.redeem_supplier_invite(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v_email text:=lower(btrim(auth.jwt()->>'email')); v record; v_contact record;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invitation is invalid' USING ERRCODE='22023'; END IF;
  SELECT supplier_id,email INTO v FROM public.supplier_invites WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation is invalid' USING ERRCODE='22023'; END IF;
  PERFORM public.supplier_identity_lock(v.supplier_id,v.email);
  SELECT * INTO v FROM public.supplier_invites WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex') FOR UPDATE;
  IF v.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invitation was revoked'; END IF;
  IF v.redeemed_at IS NOT NULL THEN RAISE EXCEPTION 'invitation was already redeemed'; END IF;
  IF v.expires_at<=now() THEN RAISE EXCEPTION 'invitation has expired'; END IF;
  IF v_email IS NULL OR v_email='' OR lower(btrim(v.email)) IS DISTINCT FROM v_email THEN RAISE EXCEPTION 'sign in with the invited email address' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_actor) THEN RAISE EXCEPTION 'profile required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=v_actor) THEN RAISE EXCEPTION 'use a separate supplier account' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.supplier_access_memberships WHERE profile_id=v_actor AND revoked_at IS NULL) THEN RAISE EXCEPTION 'account already has active supplier access' USING ERRCODE='55000'; END IF;
  SELECT * INTO v_contact FROM public.supplier_contacts WHERE supplier_id=v.supplier_id AND lower(btrim(email))=lower(btrim(v.email)) FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.supplier_contacts(supplier_id,name,email) VALUES(v.supplier_id,split_part(v.email,'@',1),lower(btrim(v.email))) RETURNING * INTO v_contact;
    INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'supplier_contact_created','supplier_contact',v_contact.id::text);
  ELSIF EXISTS(SELECT 1 FROM public.supplier_access_memberships WHERE supplier_contact_id=v_contact.id AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'supplier contact already has active portal access' USING ERRCODE='55000';
  END IF;
  INSERT INTO public.supplier_access_memberships(organization_id,supplier_id,supplier_contact_id,profile_id,invitation_id) VALUES(v.organization_id,v.supplier_id,v_contact.id,v_actor,v.id);
  UPDATE public.supplier_invites SET redeemed_at=now(),redeemed_by=v_actor,status='redeemed' WHERE id=v.id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'supplier_invite_redeemed','supplier_invite',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_supplier_invite(p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v record;
BEGIN
  SELECT * INTO v FROM public.supplier_invites WHERE id=p_invitation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'unused invitation not found or not authorized' USING ERRCODE='42501'; END IF;
  PERFORM public.supplier_identity_lock(v.supplier_id,v.email);
  SELECT * INTO v FROM public.supplier_invites WHERE id=p_invitation_id FOR UPDATE;
  IF v_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=v_actor AND organization_id=v.organization_id AND role='admin') THEN RAISE EXCEPTION 'unused invitation not found or not authorized' USING ERRCODE='42501'; END IF;
  IF v.redeemed_at IS NOT NULL THEN RAISE EXCEPTION 'invitation was already redeemed'; END IF;
  IF v.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invitation was already revoked'; END IF;
  UPDATE public.supplier_invites SET revoked_at=now(),status='revoked' WHERE id=v.id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'supplier_invite_revoked','supplier_invite',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_supplier_access(p_access_membership_id uuid,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v_reason text:=regexp_replace(btrim(p_reason),'[[:space:]]+',' ','g'); v record; v_email text;
BEGIN
  IF v_reason IS NULL OR length(v_reason) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'revocation reason must be 3 to 500 characters' USING ERRCODE='22023'; END IF;
  SELECT a.*,c.email INTO v FROM public.supplier_access_memberships a JOIN public.supplier_contacts c ON c.id=a.supplier_contact_id WHERE a.id=p_access_membership_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'active supplier access not found or not authorized' USING ERRCODE='42501'; END IF;
  PERFORM public.supplier_identity_lock(v.supplier_id,v.email);
  SELECT a.*,c.email INTO v FROM public.supplier_access_memberships a JOIN public.supplier_contacts c ON c.id=a.supplier_contact_id WHERE a.id=p_access_membership_id FOR UPDATE OF a;
  IF v_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=v_actor AND organization_id=v.organization_id AND role='admin') THEN RAISE EXCEPTION 'active supplier access not found or not authorized' USING ERRCODE='42501'; END IF;
  IF v.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'supplier access was already revoked'; END IF;
  UPDATE public.supplier_access_memberships SET revoked_at=now(),revoked_by=v_actor,revocation_reason=v_reason WHERE id=v.id;
  UPDATE public.supplier_invites SET revoked_at=now(),status='revoked' WHERE supplier_id=v.supplier_id AND lower(btrim(email))=lower(btrim(v.email)) AND redeemed_at IS NULL AND revoked_at IS NULL;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'supplier_access_revoked','supplier_access_membership',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.get_my_supplier_access()
RETURNS TABLE(supplier_name text,organization_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT s.name,o.name FROM public.supplier_access_memberships a
 JOIN public.suppliers s ON (s.id,s.organization_id)=(a.supplier_id,a.organization_id)
 JOIN public.organizations o ON o.id=a.organization_id
 WHERE a.profile_id=auth.uid() AND a.revoked_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_access_admin(p_supplier_id uuid)
RETURNS TABLE(supplier_contact_id uuid,contact_name text,contact_email text,active_access_membership_id uuid,access_state text,pending_invitation_id uuid,invitation_state text,invitation_expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid;
BEGIN
 SELECT organization_id INTO v_org FROM public.suppliers WHERE id=p_supplier_id;
 IF auth.uid() IS NULL OR v_org IS NULL OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=auth.uid() AND organization_id=v_org) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT c.id,c.name,c.email,a.id,CASE WHEN a.id IS NULL THEN 'inactive' ELSE 'active' END,
   i.id,CASE WHEN i.id IS NULL THEN 'none' WHEN i.expires_at<=now() THEN 'expired' ELSE 'pending' END,i.expires_at
 FROM public.supplier_contacts c
 LEFT JOIN public.supplier_access_memberships a ON a.supplier_contact_id=c.id AND a.revoked_at IS NULL
 LEFT JOIN LATERAL (SELECT x.id,x.expires_at FROM public.supplier_invites x WHERE x.supplier_id=c.supplier_id AND lower(btrim(x.email))=lower(btrim(c.email)) AND x.redeemed_at IS NULL AND x.revoked_at IS NULL ORDER BY x.created_at DESC LIMIT 1)i ON true
 WHERE c.supplier_id=p_supplier_id ORDER BY c.name,c.email;
END $$;

-- Replace every evidence authorization branch with an active membership lookup.
CREATE OR REPLACE FUNCTION public.current_actor_can_upload_evidence(p_lifecycle_stage_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.lifecycle_stages s JOIN public.products p ON (p.id,p.organization_id)=(s.product_id,s.organization_id) JOIN public.suppliers su ON (su.id,su.organization_id)=(s.supplier_id,s.organization_id) WHERE s.id=p_lifecycle_stage_id AND p.status<>'archived' AND (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid() AND m.organization_id=s.organization_id AND m.role IN ('admin','manager')) OR (NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid()) AND EXISTS(SELECT 1 FROM public.supplier_access_memberships a WHERE a.profile_id=auth.uid() AND a.supplier_id=s.supplier_id AND a.revoked_at IS NULL))))
$$;

CREATE OR REPLACE FUNCTION public.current_actor_can_read_evidence_object(p_bucket text,p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.storage_bucket=p_bucket AND e.storage_path=p_path AND e.status IN ('pending_review','approved','rejected','superseded') AND (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid() AND m.organization_id=e.organization_id) OR (NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid()) AND EXISTS(SELECT 1 FROM public.supplier_access_memberships a WHERE a.profile_id=auth.uid() AND a.supplier_id=e.supplier_id AND a.revoked_at IS NULL))))
$$;

CREATE OR REPLACE FUNCTION public.get_my_supplier_evidence_tasks()
RETURNS TABLE(lifecycle_stage_id uuid,stage_name text,product_name text,document_requirement text,evidence_status text,evidence_id uuid,rejection_reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.supplier_access_memberships WHERE profile_id=auth.uid() AND revoked_at IS NULL) THEN RAISE EXCEPTION 'supplier portal access is not active' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT s.id,s.stage_name,p.name,'Evidence document'::text,e.status,e.id,e.rejection_reason FROM public.supplier_access_memberships a JOIN public.suppliers su ON su.id=a.supplier_id JOIN public.lifecycle_stages s ON (s.supplier_id,s.organization_id)=(su.id,su.organization_id) JOIN public.products p ON (p.id,p.organization_id)=(s.product_id,s.organization_id) LEFT JOIN LATERAL (SELECT x.id,x.status,x.rejection_reason FROM public.evidence_uploads x WHERE x.lifecycle_stage_id=s.id ORDER BY x.created_at DESC LIMIT 1)e ON true WHERE a.profile_id=auth.uid() AND a.revoked_at IS NULL AND p.status<>'archived';
END $$;

DROP POLICY IF EXISTS evidence_supplier_select ON public.evidence_uploads;
CREATE POLICY evidence_supplier_select ON public.evidence_uploads FOR SELECT TO authenticated USING
 (EXISTS(SELECT 1 FROM public.supplier_access_memberships a WHERE a.profile_id=auth.uid() AND a.supplier_id=supplier_id AND a.revoked_at IS NULL));

CREATE OR REPLACE FUNCTION public.create_evidence_upload_intent(p_lifecycle_stage_id uuid,p_document_type text,p_original_filename text,p_mime_type text,p_size_bytes bigint)
RETURNS TABLE(evidence_id uuid,bucket_id text,storage_path text,upload_expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
DECLARE
 v_actor uuid:=auth.uid();
 v_stage record;
 v_id uuid:=extensions.gen_random_uuid();
 v_ext text;
 v_extension_pattern text;
 v_path text;
 v_exp timestamptz:=now()+interval '15 minutes';
 v_resub boolean;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 SELECT s.organization_id,s.supplier_id,p.status INTO v_stage FROM public.lifecycle_stages s JOIN public.products p ON p.id=s.product_id WHERE s.id=p_lifecycle_stage_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'lifecycle stage not found'; END IF;
 IF v_stage.supplier_id IS NULL THEN RAISE EXCEPTION 'lifecycle stage has no supplier'; END IF;
 IF v_stage.status='archived' THEN RAISE EXCEPTION 'archived products cannot receive evidence'; END IF;
 IF NOT public.current_actor_can_upload_evidence(p_lifecycle_stage_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF p_document_type IS NULL OR p_document_type NOT IN ('certificate','test_report','material_declaration','invoice','other') THEN RAISE EXCEPTION 'invalid document type'; END IF;
 IF p_original_filename IS NULL OR length(btrim(p_original_filename))=0 OR length(p_original_filename)>255 OR p_original_filename ~ '[/\\[:cntrl:]]' THEN RAISE EXCEPTION 'invalid filename'; END IF;
 v_ext:=CASE p_mime_type
  WHEN 'application/pdf' THEN 'pdf'
  WHEN 'image/png' THEN 'png'
  WHEN 'image/jpeg' THEN 'jpg'
 END;
 IF v_ext IS NULL THEN
  RAISE EXCEPTION 'filename extension and MIME type must agree';
 END IF;
 v_extension_pattern:=CASE v_ext
  WHEN 'jpg' THEN E'\\.(jpg|jpeg)$'
  ELSE E'\\.'||v_ext||'$'
 END;
 IF lower(p_original_filename) !~ v_extension_pattern THEN
  RAISE EXCEPTION 'filename extension and MIME type must agree';
 END IF;
 IF p_size_bytes IS NULL OR p_size_bytes NOT BETWEEN 1 AND 10485760 THEN RAISE EXCEPTION 'file size must be between 1 byte and 10 MiB'; END IF;
 v_path:='evidence/'||v_id||'/'||encode(extensions.gen_random_bytes(32),'hex')||'.'||v_ext;
 SELECT EXISTS(SELECT 1 FROM public.evidence_uploads WHERE lifecycle_stage_id=p_lifecycle_stage_id AND status='rejected')
   AND EXISTS(SELECT 1 FROM public.supplier_access_memberships WHERE profile_id=v_actor AND supplier_id=v_stage.supplier_id AND revoked_at IS NULL)
 INTO v_resub;
 INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,upload_expires_at)
 VALUES(v_id,v_stage.organization_id,v_stage.supplier_id,p_lifecycle_stage_id,v_path,p_document_type,'upload_pending',v_actor,p_original_filename,p_mime_type,p_size_bytes,v_exp);
 UPDATE public.evidence_uploads SET status='superseded',superseded_at=now(),superseded_by=v_id
 WHERE lifecycle_stage_id=p_lifecycle_stage_id AND id<>v_id AND status='rejected';
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_stage.organization_id,v_actor,CASE WHEN v_resub THEN 'supplier_resubmission' ELSE 'evidence_upload_intent_created' END,'evidence_upload',v_id::text);
 RETURN QUERY SELECT v_id,'compliance_docs'::text,v_path,v_exp;
END $$;


CREATE OR REPLACE FUNCTION public.is_active_supplier_for(p_profile_id uuid,p_supplier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.supplier_access_memberships WHERE profile_id=p_profile_id AND supplier_id=p_supplier_id AND revoked_at IS NULL)
$$;
REVOKE ALL ON FUNCTION public.is_active_supplier_for(uuid,uuid) FROM PUBLIC,anon,authenticated;

ALTER TABLE public.supplier_contacts DROP COLUMN profile_id;

REVOKE ALL ON FUNCTION public.create_supplier_contact(uuid,text,text),public.update_supplier_contact(uuid,text,text),public.delete_supplier_contact(uuid),public.revoke_supplier_invite(uuid),public.revoke_supplier_access(uuid,text),public.get_supplier_access_admin(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_supplier_contact(uuid,text,text),public.update_supplier_contact(uuid,text,text),public.delete_supplier_contact(uuid),public.revoke_supplier_invite(uuid),public.revoke_supplier_access(uuid,text),public.get_supplier_access_admin(uuid) TO authenticated;
