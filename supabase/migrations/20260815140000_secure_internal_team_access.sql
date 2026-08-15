-- Email-bound, one-time invitations and server-controlled internal access lifecycle.
CREATE TABLE public.organization_member_invites (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','manager','viewer')),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  redeemed_at timestamptz,
  redeemed_by uuid REFERENCES public.profiles(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id),
  revoke_reason text,
  CONSTRAINT organization_member_invites_email_check CHECK (
    email=lower(btrim(email)) AND length(email)<=254 AND
    email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  CONSTRAINT organization_member_invites_expiry_check CHECK (expires_at>created_at),
  CONSTRAINT organization_member_invites_redeemed_check CHECK (
    (redeemed_at IS NULL AND redeemed_by IS NULL) OR
    (redeemed_at IS NOT NULL AND redeemed_by IS NOT NULL)),
  CONSTRAINT organization_member_invites_revoked_check CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revoke_reason IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND length(revoke_reason) BETWEEN 3 AND 500)),
  CONSTRAINT organization_member_invites_terminal_check CHECK (redeemed_at IS NULL OR revoked_at IS NULL)
);
CREATE INDEX organization_member_invites_org_created_idx
  ON public.organization_member_invites(organization_id,created_at DESC);
CREATE INDEX organization_member_invites_pending_email_idx
  ON public.organization_member_invites(organization_id,email)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;
ALTER TABLE public.organization_member_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organization_member_invites FROM PUBLIC,anon,authenticated;

-- Membership creation and mutation are exclusively mediated by reviewed RPCs.
DROP POLICY IF EXISTS organization_members_insert ON public.organization_members;
DROP POLICY IF EXISTS organization_members_update ON public.organization_members;
DROP POLICY IF EXISTS organization_members_delete ON public.organization_members;
REVOKE INSERT,UPDATE,DELETE ON public.organization_members FROM anon,authenticated;

CREATE FUNCTION public.create_organization_member_invite(p_email text,p_role text)
RETURNS TABLE(invite_id uuid,raw_token text,expires_at timestamptz,role text,email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_email text:=lower(btrim(p_email)); v_token text; v_id uuid; v_exp timestamptz; v_old uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_members WHERE profile_id=v_actor AND role='admin';
  IF v_actor IS NULL OR v_org IS NULL THEN RAISE EXCEPTION 'administrator access required' USING ERRCODE='42501'; END IF;
  IF v_email IS NULL OR length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'a valid email is required' USING ERRCODE='22023'; END IF;
  IF p_role IS NULL OR p_role NOT IN ('admin','manager','viewer') THEN RAISE EXCEPTION 'unsupported organization role' USING ERRCODE='22023'; END IF;
  IF v_email=lower(btrim(coalesce(auth.jwt()->>'email',''))) THEN RAISE EXCEPTION 'cannot invite your own account' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.organization_members m JOIN public.profiles p ON p.id=m.profile_id WHERE m.organization_id=v_org AND lower(btrim(p.email))=v_email) THEN RAISE EXCEPTION 'account is already an organization member' USING ERRCODE='23505'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_org::text||':'||v_email,0));
  SELECT id INTO v_old FROM public.organization_member_invites WHERE organization_id=v_org AND email=v_email AND redeemed_at IS NULL AND revoked_at IS NULL FOR UPDATE;
  IF v_old IS NOT NULL THEN
    UPDATE public.organization_member_invites SET revoked_at=now(),revoked_by=v_actor,revoke_reason='Replaced by a newer invitation' WHERE id=v_old;
    INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'organization_member_invite_replaced','organization_member_invite',v_old::text);
  END IF;
  v_token:=encode(gen_random_bytes(32),'hex'); v_exp:=now()+interval '7 days';
  INSERT INTO public.organization_member_invites(organization_id,email,role,token_hash,created_by,expires_at)
    VALUES(v_org,v_email,p_role,encode(digest(v_token,'sha256'),'hex'),v_actor,v_exp) RETURNING id INTO v_id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'organization_member_invite_created','organization_member_invite',v_id::text);
  RETURN QUERY SELECT v_id,v_token,v_exp,p_role,v_email;
END $$;

CREATE FUNCTION public.get_organization_member_invite_metadata(p_token text)
RETURNS TABLE(invitation_state text,organization_name text,masked_email text,role text,expiration timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE v record;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RETURN QUERY SELECT 'invalid'::text,NULL::text,NULL::text,NULL::text,NULL::timestamptz; RETURN; END IF;
  SELECT i.*,o.name INTO v FROM public.organization_member_invites i JOIN public.organizations o ON o.id=i.organization_id WHERE i.token_hash=encode(digest(p_token,'sha256'),'hex');
  IF NOT FOUND THEN RETURN QUERY SELECT 'invalid'::text,NULL::text,NULL::text,NULL::text,NULL::timestamptz; RETURN; END IF;
  RETURN QUERY SELECT CASE WHEN v.redeemed_at IS NOT NULL THEN 'redeemed' WHEN v.revoked_at IS NOT NULL THEN 'revoked' WHEN v.expires_at<=now() THEN 'expired' ELSE 'usable' END,
    v.name,regexp_replace(v.email,'^(.).*(@.*)$','\1***\2'),v.role,v.expires_at;
END $$;

CREATE FUNCTION public.redeem_organization_member_invite(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v_email text:=lower(btrim(coalesce(auth.jwt()->>'email',''))); v record; v_member uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid invitation' USING ERRCODE='22023'; END IF;
  SELECT * INTO v FROM public.organization_member_invites WHERE token_hash=encode(digest(p_token,'sha256'),'hex') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid invitation' USING ERRCODE='22023'; END IF;
  IF v.revoked_at IS NOT NULL OR v.redeemed_at IS NOT NULL OR v.expires_at<=now() THEN RAISE EXCEPTION 'invitation is no longer usable' USING ERRCODE='55000'; END IF;
  IF v_email='' OR v_email IS DISTINCT FROM v.email THEN RAISE EXCEPTION 'authenticated email does not match invitation' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('supplier-profile:'||v_actor::text,0));
  IF EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=v_actor) THEN RAISE EXCEPTION 'account already has organization membership' USING ERRCODE='23505'; END IF;
  IF EXISTS(SELECT 1 FROM public.supplier_access_memberships WHERE profile_id=v_actor AND revoked_at IS NULL) THEN RAISE EXCEPTION 'supplier identities cannot redeem internal invitations' USING ERRCODE='23514'; END IF;
  INSERT INTO public.profiles(id,email) VALUES(v_actor,v_email) ON CONFLICT(id) DO UPDATE SET email=excluded.email;
  INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES(v.organization_id,v_actor,v.role) RETURNING id INTO v_member;
  UPDATE public.organization_member_invites SET redeemed_at=now(),redeemed_by=v_actor WHERE id=v.id AND redeemed_at IS NULL AND revoked_at IS NULL;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'organization_member_invite_redeemed','organization_member_invite',v.id::text);
  RETURN v_member;
END $$;

CREATE FUNCTION public.get_organization_access_admin_view()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_result jsonb;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_members WHERE profile_id=v_actor AND role='admin';
  IF v_org IS NULL THEN RAISE EXCEPTION 'administrator access required' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object(
    'members',coalesce((SELECT jsonb_agg(jsonb_build_object('member_id',m.id,'email',p.email,'role',m.role,'created_at',m.created_at) ORDER BY m.created_at) FROM public.organization_members m JOIN public.profiles p ON p.id=m.profile_id WHERE m.organization_id=v_org),'[]'::jsonb),
    'invites',coalesce((SELECT jsonb_agg(jsonb_build_object('invite_id',i.id,'email',i.email,'role',i.role,'expires_at',i.expires_at,'state',CASE WHEN i.redeemed_at IS NOT NULL THEN 'redeemed' WHEN i.revoked_at IS NOT NULL THEN 'revoked' WHEN i.expires_at<=now() THEN 'expired' ELSE 'usable' END) ORDER BY i.created_at DESC) FROM public.organization_member_invites i WHERE i.organization_id=v_org),'[]'::jsonb)) INTO v_result;
  RETURN v_result;
END $$;

CREATE FUNCTION public.revoke_organization_member_invite(p_invite_id uuid,p_reason text DEFAULT 'Revoked by administrator')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_count integer;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_members WHERE profile_id=v_actor AND role='admin';
  IF v_org IS NULL OR length(btrim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'administrator access and a reason are required' USING ERRCODE='42501'; END IF;
  UPDATE public.organization_member_invites SET revoked_at=now(),revoked_by=v_actor,revoke_reason=btrim(p_reason) WHERE id=p_invite_id AND organization_id=v_org AND redeemed_at IS NULL AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count=ROW_COUNT; IF v_count<>1 THEN RAISE EXCEPTION 'usable invitation not found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'organization_member_invite_revoked','organization_member_invite',p_invite_id::text);
END $$;

CREATE FUNCTION public.update_organization_member_role(p_member_id uuid,p_new_role text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_old text;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_members WHERE profile_id=v_actor AND role='admin';
  IF v_org IS NULL THEN RAISE EXCEPTION 'administrator access required' USING ERRCODE='42501'; END IF;
  IF p_new_role NOT IN ('admin','manager','viewer') OR length(btrim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'valid role and reason are required' USING ERRCODE='22023'; END IF;
  SELECT role INTO v_old FROM public.organization_members WHERE id=p_member_id AND organization_id=v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'organization member not found' USING ERRCODE='P0002'; END IF;
  UPDATE public.organization_members SET role=p_new_role WHERE id=p_member_id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'organization_member_role_changed','organization_member',p_member_id::text||':'||v_old||'->'||p_new_role||':'||btrim(p_reason));
END $$;

CREATE FUNCTION public.revoke_organization_member_access(p_member_id uuid,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor uuid:=auth.uid(); v_org uuid; v_count integer;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_members WHERE profile_id=v_actor AND role='admin';
  IF v_org IS NULL THEN RAISE EXCEPTION 'administrator access required' USING ERRCODE='42501'; END IF;
  IF length(btrim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'revocation reason must be at least 3 characters' USING ERRCODE='22023'; END IF;
  DELETE FROM public.organization_members WHERE id=p_member_id AND organization_id=v_org;
  GET DIAGNOSTICS v_count=ROW_COUNT; IF v_count<>1 THEN RAISE EXCEPTION 'organization member not found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_org,v_actor,'organization_member_access_revoked','organization_member',p_member_id::text||':'||btrim(p_reason));
END $$;

GRANT EXECUTE ON FUNCTION public.get_organization_member_invite_metadata(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_member_invite(text,text),public.redeem_organization_member_invite(text),
  public.get_organization_access_admin_view(),public.revoke_organization_member_invite(uuid,text),
  public.update_organization_member_role(uuid,text,text),public.revoke_organization_member_access(uuid,text) TO authenticated;
