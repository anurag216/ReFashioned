CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Abort rather than guessing when legacy rows cannot be migrated safely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.supplier_invites WHERE token IS NULL OR btrim(token) = '') THEN
    RAISE EXCEPTION 'supplier_invites contains empty legacy tokens';
  END IF;
  IF EXISTS (SELECT 1 FROM public.supplier_invites WHERE supplier_id IS NULL OR organization_id IS NULL OR created_at IS NULL) THEN
    RAISE EXCEPTION 'supplier_invites contains incomplete legacy rows';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.supplier_contacts WHERE profile_id IS NOT NULL
    GROUP BY profile_id HAVING count(DISTINCT supplier_id) > 1
  ) THEN
    RAISE EXCEPTION 'a profile is linked to multiple legacy suppliers';
  END IF;
END $$;

ALTER TABLE public.supplier_invites
  ADD COLUMN token_hash text,
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN redeemed_at timestamptz,
  ADD COLUMN redeemed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN revoked_at timestamptz;

UPDATE public.supplier_invites
SET token_hash = encode(extensions.digest(token, 'sha256'), 'hex'),
    expires_at = created_at + interval '7 days';

ALTER TABLE public.supplier_invites
  ALTER COLUMN token_hash SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN supplier_id SET NOT NULL;
ALTER TABLE public.supplier_invites DROP CONSTRAINT supplier_invites_token_key;
ALTER TABLE public.supplier_invites DROP COLUMN token;

CREATE UNIQUE INDEX supplier_invites_token_hash_uidx ON public.supplier_invites(token_hash);
CREATE UNIQUE INDEX supplier_invites_pending_supplier_email_uidx
  ON public.supplier_invites(supplier_id, lower(email))
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;
CREATE INDEX supplier_invites_supplier_idx ON public.supplier_invites(supplier_id, created_at DESC);
CREATE INDEX supplier_invites_expiration_idx ON public.supplier_invites(expires_at)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;
CREATE UNIQUE INDEX supplier_contacts_one_profile_uidx ON public.supplier_contacts(profile_id)
  WHERE profile_id IS NOT NULL;
CREATE UNIQUE INDEX supplier_contacts_supplier_email_uidx ON public.supplier_contacts(supplier_id, lower(email));

DROP POLICY IF EXISTS supplier_invites_admin_all ON public.supplier_invites;
DROP POLICY IF EXISTS "Brand members can manage invites" ON public.supplier_invites;
DROP POLICY IF EXISTS "Public can read invite by token" ON public.supplier_invites;
REVOKE ALL ON public.supplier_invites FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_supplier_invite(p_supplier_id uuid, p_email text)
RETURNS TABLE(invitation_id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_actor uuid := auth.uid(); v_org uuid; v_email text := lower(btrim(p_email));
  v_token text; v_id uuid; v_exp timestamptz := now() + interval '7 days'; v_old record;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF v_email IS NULL OR length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'a valid email is required' USING ERRCODE = '22023';
  END IF;
  SELECT s.organization_id INTO v_org FROM public.suppliers s WHERE s.id = p_supplier_id;
  IF v_org IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v_org AND m.role='admin') THEN
    RAISE EXCEPTION 'not authorized to invite for this supplier' USING ERRCODE = '42501';
  END IF;
  FOR v_old IN SELECT id FROM public.supplier_invites
    WHERE supplier_id=p_supplier_id AND lower(email)=v_email AND redeemed_at IS NULL AND revoked_at IS NULL FOR UPDATE
  LOOP
    UPDATE public.supplier_invites SET revoked_at=now(), status='revoked' WHERE id=v_old.id;
    INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
      VALUES(v_org,v_actor,'supplier_invite_replaced','supplier_invite',v_old.id::text);
  END LOOP;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.supplier_invites(organization_id,supplier_id,email,token_hash,status,expires_at,created_by)
    VALUES(v_org,p_supplier_id,v_email,encode(extensions.digest(v_token,'sha256'),'hex'),'sent',v_exp,v_actor)
    RETURNING id INTO v_id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
    VALUES(v_org,v_actor,'supplier_invite_created','supplier_invite',v_id::text);
  RETURN QUERY SELECT v_id,v_token,v_exp;
END $$;

CREATE OR REPLACE FUNCTION public.get_supplier_invite_metadata(p_token text)
RETURNS TABLE(invitation_state text, organization_name text, supplier_name text, masked_email text, expiration timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, extensions
AS $$
DECLARE v record; v_local text; v_domain text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RETURN QUERY SELECT 'invalid'::text,NULL::text,NULL::text,NULL::text,NULL::timestamptz; RETURN; END IF;
  SELECT i.*,o.name AS org_name,s.name AS sup_name INTO v FROM public.supplier_invites i
    JOIN public.organizations o ON o.id=i.organization_id JOIN public.suppliers s ON s.id=i.supplier_id
    WHERE i.token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  IF NOT FOUND THEN RETURN QUERY SELECT 'invalid'::text,NULL::text,NULL::text,NULL::text,NULL::timestamptz; RETURN; END IF;
  IF v.revoked_at IS NOT NULL THEN RETURN QUERY SELECT 'revoked'::text,NULL::text,NULL::text,NULL::text,v.expires_at; RETURN;
  ELSIF v.redeemed_at IS NOT NULL THEN RETURN QUERY SELECT 'redeemed'::text,NULL::text,NULL::text,NULL::text,v.expires_at; RETURN;
  ELSIF v.expires_at <= now() THEN RETURN QUERY SELECT 'expired'::text,NULL::text,NULL::text,NULL::text,v.expires_at; RETURN; END IF;
  v_local := split_part(v.email,'@',1); v_domain := split_part(v.email,'@',2);
  RETURN QUERY SELECT 'usable'::text,v.org_name,v.sup_name,
    (left(v_local,1)||repeat('*',greatest(length(v_local)-1,2))||'@'||v_domain)::text,v.expires_at;
END $$;

CREATE OR REPLACE FUNCTION public.redeem_supplier_invite(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions
AS $$
DECLARE v_actor uuid:=auth.uid(); v_email text:=lower(btrim(auth.jwt()->>'email')); v record; v_contact record;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invitation is invalid' USING ERRCODE='22023'; END IF;
  SELECT * INTO v FROM public.supplier_invites WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation is invalid' USING ERRCODE='22023'; END IF;
  IF v.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invitation was revoked'; END IF;
  IF v.redeemed_at IS NOT NULL THEN RAISE EXCEPTION 'invitation was already redeemed'; END IF;
  IF v.expires_at <= now() THEN RAISE EXCEPTION 'invitation has expired'; END IF;
  IF v_email IS NULL
     OR v_email = ''
     OR lower(v.email) IS DISTINCT FROM v_email
  THEN
    RAISE EXCEPTION 'sign in with the invited email address'
      USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_actor) THEN RAISE EXCEPTION 'profile required'; END IF;
  IF EXISTS(SELECT 1 FROM public.organization_members WHERE profile_id=v_actor) THEN RAISE EXCEPTION 'use a separate supplier account' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.supplier_contacts WHERE profile_id=v_actor AND supplier_id<>v.supplier_id) THEN RAISE EXCEPTION 'account is already linked to another supplier'; END IF;
  SELECT * INTO v_contact
  FROM public.supplier_contacts
  WHERE supplier_id = v.supplier_id AND lower(email) = lower(v.email)
  FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.supplier_contacts(supplier_id,name,email,profile_id)
      VALUES(v.supplier_id,split_part(v.email,'@',1),v.email,v_actor);
  ELSIF v_contact.profile_id IS NULL THEN
    UPDATE public.supplier_contacts SET profile_id=v_actor WHERE id=v_contact.id;
  ELSIF v_contact.profile_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'supplier contact is already linked to another account'
      USING ERRCODE = '42501';
  END IF;
  UPDATE public.supplier_invites SET redeemed_at=now(),redeemed_by=v_actor,status='redeemed' WHERE id=v.id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
    VALUES(v.organization_id,v_actor,'supplier_invite_redeemed','supplier_invite',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.get_my_supplier_access()
RETURNS TABLE(supplier_name text, organization_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT s.name,o.name FROM public.supplier_contacts c JOIN public.suppliers s ON s.id=c.supplier_id
  JOIN public.organizations o ON o.id=s.organization_id WHERE c.profile_id=auth.uid() $$;

REVOKE ALL ON FUNCTION public.create_supplier_invite(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_supplier_invite(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_supplier_invite_metadata(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_invite_metadata(text) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.redeem_supplier_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_supplier_invite(text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_supplier_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_supplier_access() TO authenticated;
