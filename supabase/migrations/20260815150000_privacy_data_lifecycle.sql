-- Privacy lifecycle foundations. Retention cutoffs are supplied by an approved
-- policy/process; this migration deliberately defines no statutory durations.
CREATE TYPE public.organization_lifecycle_status AS ENUM ('active','deletion_requested','suspended','tombstoned');
CREATE TYPE public.privacy_erasure_status AS ENUM ('requested','processing','completed','denied');

ALTER TABLE public.organizations
  ADD COLUMN lifecycle_status public.organization_lifecycle_status NOT NULL DEFAULT 'active',
  ADD COLUMN lifecycle_changed_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.privacy_erasure_requests (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  requester_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'personal_identity' CHECK (request_type='personal_identity'),
  status public.privacy_erasure_status NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  denied_at timestamptz,
  denial_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_erasure_request_state_check CHECK (
    (status='requested' AND processing_started_at IS NULL AND completed_at IS NULL AND denied_at IS NULL AND denial_reason IS NULL) OR
    (status='processing' AND processing_started_at IS NOT NULL AND completed_at IS NULL AND denied_at IS NULL AND denial_reason IS NULL) OR
    (status='completed' AND processing_started_at IS NOT NULL AND completed_at IS NOT NULL AND denied_at IS NULL AND denial_reason IS NULL) OR
    (status='denied' AND completed_at IS NULL AND denied_at IS NOT NULL AND length(btrim(denial_reason)) BETWEEN 3 AND 500))
  )
);
CREATE UNIQUE INDEX privacy_erasure_one_open_subject_idx ON public.privacy_erasure_requests(subject_profile_id)
  WHERE status IN ('requested','processing');
ALTER TABLE public.privacy_erasure_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.privacy_erasure_requests FROM PUBLIC,anon,authenticated;

CREATE POLICY privacy_erasure_request_subject_read ON public.privacy_erasure_requests
  FOR SELECT TO authenticated USING (subject_profile_id=auth.uid());
GRANT SELECT ON public.privacy_erasure_requests TO authenticated;

-- Historical actor references must not block removal of a profile. Authorization
-- rows remain deliberately cascading/required and are explicitly removed first.
ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_actor_id_fkey,
  ADD CONSTRAINT audit_events_actor_id_fkey FOREIGN KEY(actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.evidence_uploads DROP CONSTRAINT evidence_uploads_uploaded_by_fkey,
  ADD CONSTRAINT evidence_uploads_uploaded_by_fkey FOREIGN KEY(uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.evidence_uploads DROP CONSTRAINT IF EXISTS evidence_uploads_reviewed_by_fkey,
  ADD CONSTRAINT evidence_uploads_reviewed_by_fkey FOREIGN KEY(reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.evidence_uploads DROP CONSTRAINT IF EXISTS evidence_review_check,
  DROP CONSTRAINT IF EXISTS evidence_uploader_check,
  ADD CONSTRAINT evidence_review_check CHECK (
    (status IN ('approved','rejected') AND reviewed_at IS NOT NULL)
    OR (status IN ('upload_pending','quarantined','pending_review') AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR status='superseded');
ALTER TABLE public.certifications ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.certifications DROP CONSTRAINT IF EXISTS certifications_created_by_fkey,
  ADD CONSTRAINT certifications_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.certifications DROP CONSTRAINT IF EXISTS certifications_revoked_by_fkey,
  ADD CONSTRAINT certifications_revoked_by_fkey FOREIGN KEY(revoked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.certifications DROP CONSTRAINT IF EXISTS certifications_revocation_check,
  ADD CONSTRAINT certifications_revocation_check CHECK (
    (verification_status='verified' AND revoked_at IS NULL AND revoked_by IS NULL)
    OR (verification_status='revoked' AND revoked_at IS NOT NULL));
ALTER TABLE public.organization_member_invites ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.organization_member_invites DROP CONSTRAINT organization_member_invites_created_by_fkey,
  ADD CONSTRAINT organization_member_invites_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.organization_member_invites DROP CONSTRAINT organization_member_invites_redeemed_by_fkey,
  ADD CONSTRAINT organization_member_invites_redeemed_by_fkey FOREIGN KEY(redeemed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.organization_member_invites DROP CONSTRAINT organization_member_invites_revoked_by_fkey,
  ADD CONSTRAINT organization_member_invites_revoked_by_fkey FOREIGN KEY(revoked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.organization_member_invites DROP CONSTRAINT organization_member_invites_redeemed_check,
  ADD CONSTRAINT organization_member_invites_redeemed_check CHECK ((redeemed_at IS NULL AND redeemed_by IS NULL) OR redeemed_at IS NOT NULL);
ALTER TABLE public.organization_member_invites DROP CONSTRAINT organization_member_invites_revoked_check,
  ADD CONSTRAINT organization_member_invites_revoked_check CHECK ((revoked_at IS NULL AND revoke_reason IS NULL) OR (revoked_at IS NOT NULL AND length(revoke_reason) BETWEEN 3 AND 500));

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.request_personal_data_erasure()
RETURNS public.privacy_erasure_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_request public.privacy_erasure_requests;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=v_actor) THEN
    RAISE EXCEPTION 'authenticated profile required' USING ERRCODE='42501';
  END IF;
  SELECT m.organization_id INTO v_org FROM public.organization_members m WHERE m.profile_id=v_actor;
  SELECT * INTO v_request FROM public.privacy_erasure_requests r
    WHERE r.subject_profile_id=v_actor AND r.status IN ('requested','processing') ORDER BY r.requested_at LIMIT 1;
  IF FOUND THEN RETURN v_request; END IF;
  INSERT INTO public.privacy_erasure_requests(requester_profile_id,subject_profile_id,organization_id)
    VALUES(v_actor,v_actor,v_org) RETURNING * INTO v_request;
  IF v_org IS NOT NULL THEN
    INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
      VALUES(v_org,v_actor,'privacy_erasure_requested','privacy_erasure_request',v_request.id::text);
  END IF;
  RETURN v_request;
END $$;
REVOKE ALL ON FUNCTION public.request_personal_data_erasure() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_personal_data_erasure() TO authenticated;

-- Service boundary phase one. The server must subsequently remove auth.users via
-- the Supabase Admin API. The profile cascade then NULLs historical actor FKs.
CREATE FUNCTION private.prepare_personal_identity_erasure(p_profile_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_request uuid; v_email text;
BEGIN
  SELECT r.id,p.email INTO v_request,v_email
  FROM public.privacy_erasure_requests r JOIN public.profiles p ON p.id=r.subject_profile_id
  WHERE r.subject_profile_id=p_profile_id AND r.status='requested'
  FOR UPDATE OF r,p;
  IF NOT FOUND THEN RAISE EXCEPTION 'eligible erasure request not found' USING ERRCODE='55000'; END IF;
  UPDATE public.privacy_erasure_requests SET status='processing',processing_started_at=now() WHERE id=v_request;
  UPDATE public.organization_member_invites SET revoked_at=coalesce(revoked_at,now()),revoked_by=NULL,
    revoke_reason=coalesce(revoke_reason,'Identity erasure requested')
    WHERE email=lower(btrim(v_email)) AND redeemed_at IS NULL AND revoked_at IS NULL;
  UPDATE public.supplier_invites SET revoked_at=coalesce(revoked_at,now()),status='revoked'
    WHERE email=lower(btrim(v_email)) AND redeemed_at IS NULL AND revoked_at IS NULL;
  DELETE FROM public.organization_members WHERE profile_id=p_profile_id;
  DELETE FROM public.supplier_access_memberships WHERE profile_id=p_profile_id;
  UPDATE public.supplier_contacts SET profile_id=NULL,name='Erased contact',email='erased-'||id::text||'@invalid.example'
    WHERE profile_id=p_profile_id;
  UPDATE public.profiles SET email='erased-'||id::text||'@invalid.example',full_name=NULL WHERE id=p_profile_id;
  IF EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=p_profile_id)
     OR EXISTS(SELECT 1 FROM public.supplier_access_memberships WHERE profile_id=p_profile_id AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'active authorization remains; erasure aborted' USING ERRCODE='55000';
  END IF;
  RETURN v_request;
END $$;

CREATE FUNCTION private.complete_personal_identity_erasure(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  UPDATE public.privacy_erasure_requests SET status='completed',completed_at=now()
    WHERE id=p_request_id AND status='processing' AND subject_profile_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'auth/profile deletion has not completed' USING ERRCODE='55000'; END IF;
END $$;

CREATE FUNCTION private.purge_terminal_invitation_personal_data(p_cutoff timestamptz)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_count bigint; v_supplier bigint;
BEGIN
  IF p_cutoff IS NULL OR p_cutoff>now() THEN RAISE EXCEPTION 'valid past cutoff required' USING ERRCODE='22023'; END IF;
  UPDATE public.organization_member_invites SET email='erased-'||id::text||'@invalid.example'
    WHERE created_at<p_cutoff AND (redeemed_at IS NOT NULL OR revoked_at IS NOT NULL OR expires_at<=now());
  GET DIAGNOSTICS v_count=ROW_COUNT;
  UPDATE public.supplier_invites SET email='erased-'||id::text||'@invalid.example'
    WHERE created_at<p_cutoff AND (redeemed_at IS NOT NULL OR revoked_at IS NOT NULL OR expires_at<=now());
  GET DIAGNOSTICS v_supplier=ROW_COUNT;
  RETURN v_count+v_supplier;
END $$;
REVOKE ALL ON FUNCTION private.prepare_personal_identity_erasure(uuid),private.complete_personal_identity_erasure(uuid),private.purge_terminal_invitation_personal_data(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.prepare_personal_identity_erasure(uuid),private.complete_personal_identity_erasure(uuid),private.purge_terminal_invitation_personal_data(timestamptz) TO service_role;

-- Every authorization helper consults live tenant state, so stale JWTs fail closed.
CREATE OR REPLACE FUNCTION public.is_org_member(target_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
   WHERE m.organization_id=target_organization_id AND m.profile_id=auth.uid() AND o.lifecycle_status='active') $$;
CREATE OR REPLACE FUNCTION public.has_org_role(target_organization_id uuid,allowed_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
   WHERE m.organization_id=target_organization_id AND m.profile_id=auth.uid() AND m.role=ANY(allowed_roles) AND o.lifecycle_status='active') $$;
CREATE OR REPLACE FUNCTION public.is_active_supplier_for(p_profile_id uuid,p_supplier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.supplier_access_memberships a JOIN public.organizations o ON o.id=a.organization_id
   WHERE a.profile_id=p_profile_id AND a.supplier_id=p_supplier_id AND a.revoked_at IS NULL AND o.lifecycle_status='active') $$;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid),public.has_org_role(uuid,text[]),public.is_active_supplier_for(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_organization_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.profile_id IS DISTINCT FROM OLD.profile_id) THEN
    RAISE EXCEPTION 'membership organization and profile cannot be changed';
  END IF;
  PERFORM 1 FROM public.organizations WHERE id=OLD.organization_id FOR UPDATE;
  IF TG_OP='DELETE' AND NOT FOUND THEN RETURN OLD; END IF;
  IF OLD.role='admin' AND (TG_OP='DELETE' OR NEW.role<>'admin')
     AND NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=OLD.organization_id AND m.role='admin' AND m.id<>OLD.id)
     AND NOT EXISTS(SELECT 1 FROM public.privacy_erasure_requests r WHERE r.subject_profile_id=OLD.profile_id AND r.status='processing') THEN
    RAISE EXCEPTION 'cannot remove or demote the final organization admin';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION public.protect_organization_membership() FROM PUBLIC,anon,authenticated;

-- Fail closed even where an older SECURITY DEFINER routine performs a direct
-- membership lookup rather than calling the helpers above.
CREATE FUNCTION public.enforce_active_organization_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_org uuid:=CASE WHEN TG_TABLE_NAME='organizations' THEN NEW.id ELSE NEW.organization_id END;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=v_org AND o.lifecycle_status='active') THEN
    RAISE EXCEPTION 'organization is not active' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_active_organization_write() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER privacy_active_org_member_invites BEFORE INSERT OR UPDATE ON public.organization_member_invites FOR EACH ROW EXECUTE FUNCTION public.enforce_active_organization_write();
CREATE TRIGGER privacy_active_supplier_invites BEFORE INSERT OR UPDATE ON public.supplier_invites FOR EACH ROW EXECUTE FUNCTION public.enforce_active_organization_write();
CREATE TRIGGER privacy_active_evidence BEFORE INSERT OR UPDATE ON public.evidence_uploads FOR EACH ROW EXECUTE FUNCTION public.enforce_active_organization_write();

CREATE FUNCTION public.request_organization_deletion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid;
BEGIN
 SELECT m.organization_id INTO v_org FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
 WHERE m.profile_id=v_actor AND m.role='admin' AND o.lifecycle_status='active' FOR UPDATE OF o;
 IF v_org IS NULL THEN RAISE EXCEPTION 'active organization administrator required' USING ERRCODE='42501'; END IF;
 UPDATE public.organizations SET lifecycle_status='deletion_requested',lifecycle_changed_at=now() WHERE id=v_org;
 UPDATE public.digital_product_passports SET is_published=false WHERE organization_id=v_org;
 UPDATE public.supplier_access_memberships SET revoked_at=coalesce(revoked_at,now()),revoked_by=v_actor,revocation_reason=coalesce(revocation_reason,'Organization deletion requested') WHERE organization_id=v_org AND revoked_at IS NULL;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'organization_deletion_requested','organization',v_org::text);
END $$;
GRANT EXECUTE ON FUNCTION public.request_organization_deletion() TO authenticated;
