-- Private, immutable evidence storage. All evidence and certification mutations
-- are mediated by the fixed-search-path functions below.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $migration$
DECLARE v_bad record;
BEGIN
  SELECT o.name,
         o.metadata->>'mimetype' AS mime_type,
         o.metadata->>'size' AS object_size
  INTO v_bad
  FROM storage.objects o
  WHERE o.bucket_id = 'compliance_docs'
    AND (o.metadata IS NULL
      OR o.metadata->>'mimetype' IS NULL
      OR o.metadata->>'size' IS NULL
      OR o.metadata->>'mimetype' NOT IN ('application/pdf','image/png','image/jpeg')
      OR NOT (o.metadata->>'size' ~ '^[0-9]+$')
      OR (o.metadata->>'size')::bigint > 10485760)
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'compliance_docs object % cannot be safely tightened (mime %, size %)',
      v_bad.name, v_bad.mime_type, v_bad.object_size;
  END IF;

  SELECT o.name INTO v_bad
  FROM storage.objects o
  LEFT JOIN public.evidence_uploads e ON e.file_url = o.name
  WHERE o.bucket_id='compliance_docs'
  GROUP BY o.name HAVING count(e.id) > 1 LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'compliance_docs object % conflicts with multiple evidence records', v_bad.name;
  END IF;
END $migration$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('compliance_docs','compliance_docs',false,10485760,
  ARRAY['application/pdf','image/png','image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, public=false, file_size_limit=EXCLUDED.file_size_limit,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

-- A lifecycle stage is tenant-owned as a whole. Validate before installing
-- composite keys so a historical cross-tenant relationship is never blessed.
DO $stage_scope$
DECLARE v_bad record;
BEGIN
  SELECT s.id,
    CASE WHEN p.id IS NULL THEN 'product does not exist'
         WHEN p.organization_id IS DISTINCT FROM s.organization_id THEN 'product belongs to another organization'
         WHEN s.supplier_id IS NOT NULL AND su.id IS NULL THEN 'supplier does not exist'
         WHEN su.organization_id IS DISTINCT FROM s.organization_id THEN 'supplier belongs to another organization'
    END AS reason
  INTO v_bad
  FROM public.lifecycle_stages s
  LEFT JOIN public.products p ON p.id=s.product_id
  LEFT JOIN public.suppliers su ON su.id=s.supplier_id
  WHERE s.organization_id IS NULL OR s.product_id IS NULL OR p.id IS NULL OR p.organization_id IS DISTINCT FROM s.organization_id
     OR (s.supplier_id IS NOT NULL AND (su.id IS NULL OR su.organization_id IS DISTINCT FROM s.organization_id))
  LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'lifecycle stage % cannot be secured: %',v_bad.id,v_bad.reason; END IF;
END $stage_scope$;

ALTER TABLE public.products ADD CONSTRAINT products_id_organization_key UNIQUE(id,organization_id);
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_id_organization_key UNIQUE(id,organization_id);
ALTER TABLE public.lifecycle_stages
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN product_id SET NOT NULL,
  ADD CONSTRAINT lifecycle_stage_product_scope_fkey FOREIGN KEY(product_id,organization_id)
    REFERENCES public.products(id,organization_id),
  ADD CONSTRAINT lifecycle_stage_supplier_scope_fkey FOREIGN KEY(supplier_id,organization_id)
    REFERENCES public.suppliers(id,organization_id);

ALTER TABLE public.evidence_uploads RENAME COLUMN file_url TO storage_path;
ALTER TABLE public.evidence_uploads
  ADD COLUMN storage_bucket text NOT NULL DEFAULT 'compliance_docs',
  ADD COLUMN original_filename text,
  ADD COLUMN mime_type text,
  ADD COLUMN size_bytes bigint,
  ADD COLUMN upload_expires_at timestamptz,
  ADD COLUMN uploaded_at timestamptz,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN rejection_reason text,
  ADD COLUMN legacy_migrated boolean NOT NULL DEFAULT false,
  ADD COLUMN superseded_at timestamptz,
  ADD COLUMN superseded_by uuid REFERENCES public.evidence_uploads(id),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Existing database evidence is accepted only when its object can be verified.
DO $legacy$
DECLARE v_bad record;
BEGIN
  SELECT e.id, e.storage_path INTO v_bad
  FROM public.evidence_uploads e
  LEFT JOIN storage.objects o ON o.bucket_id='compliance_docs' AND o.name=e.storage_path
  LEFT JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id
  LEFT JOIN public.products p ON p.id=s.product_id
  WHERE o.id IS NULL OR s.id IS NULL OR s.supplier_id IS NULL
     OR s.organization_id IS DISTINCT FROM p.organization_id
     OR e.organization_id IS DISTINCT FROM s.organization_id
     OR e.supplier_id IS DISTINCT FROM s.supplier_id
     OR o.metadata->>'mimetype' NOT IN ('application/pdf','image/png','image/jpeg')
     OR NOT (o.metadata->>'size' ~ '^[0-9]+$')
     OR (o.metadata->>'size')::bigint NOT BETWEEN 1 AND 10485760
  LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'legacy evidence % at % cannot be safely migrated',v_bad.id,v_bad.storage_path; END IF;

  UPDATE public.evidence_uploads e SET
    original_filename=right(e.storage_path,255), mime_type=o.metadata->>'mimetype',
    size_bytes=(o.metadata->>'size')::bigint, status='pending_review',
    uploaded_at=coalesce(o.created_at,e.created_at), legacy_migrated=true
  FROM storage.objects o WHERE o.bucket_id='compliance_docs' AND o.name=e.storage_path;

  SELECT s.id, s.certificate_url INTO v_bad FROM public.lifecycle_stages s
  LEFT JOIN public.products p ON p.id=s.product_id
  LEFT JOIN storage.objects o ON o.bucket_id='compliance_docs' AND o.name=s.certificate_url
  WHERE s.certificate_url IS NOT NULL AND
    (s.supplier_id IS NULL OR p.id IS NULL OR p.organization_id IS DISTINCT FROM s.organization_id
     OR o.id IS NULL OR o.metadata->>'mimetype' NOT IN ('application/pdf','image/png','image/jpeg')
     OR NOT (o.metadata->>'size' ~ '^[0-9]+$')
     OR (o.metadata->>'size')::bigint NOT BETWEEN 1 AND 10485760
     OR EXISTS (SELECT 1 FROM public.lifecycle_stages x WHERE x.id<>s.id AND x.certificate_url=s.certificate_url))
  LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'lifecycle stage % certificate % cannot be safely migrated',v_bad.id,v_bad.certificate_url; END IF;

  INSERT INTO public.evidence_uploads
    (organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,
     uploaded_by,original_filename,mime_type,size_bytes,uploaded_at,legacy_migrated)
  SELECT s.organization_id,s.supplier_id,s.id,s.certificate_url,'certificate','pending_review',
    NULL,right(s.certificate_url,255),o.metadata->>'mimetype',(o.metadata->>'size')::bigint,o.created_at,true
  FROM public.lifecycle_stages s JOIN storage.objects o
    ON o.bucket_id='compliance_docs' AND o.name=s.certificate_url
  WHERE s.certificate_url IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.evidence_uploads e WHERE e.storage_path=s.certificate_url);
END $legacy$;

ALTER TABLE public.lifecycle_stages DROP COLUMN certificate_url;
ALTER TABLE public.evidence_uploads
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN supplier_id SET NOT NULL,
  ALTER COLUMN lifecycle_stage_id SET NOT NULL,
  ALTER COLUMN original_filename SET NOT NULL,
  ALTER COLUMN mime_type SET NOT NULL,
  ALTER COLUMN size_bytes SET NOT NULL,
  DROP CONSTRAINT IF EXISTS evidence_uploads_status_check,
  ADD CONSTRAINT evidence_storage_bucket_check CHECK (storage_bucket='compliance_docs'),
  ADD CONSTRAINT evidence_storage_path_key UNIQUE(storage_path),
  ADD CONSTRAINT evidence_document_type_check CHECK (document_type IN ('certificate','test_report','material_declaration','invoice','other')),
  ADD CONSTRAINT evidence_status_check CHECK (status IN ('upload_pending','pending_review','approved','rejected','superseded')),
  ADD CONSTRAINT evidence_mime_check CHECK (mime_type IN ('application/pdf','image/png','image/jpeg')),
  ADD CONSTRAINT evidence_size_check CHECK (size_bytes BETWEEN 1 AND 10485760),
  ADD CONSTRAINT evidence_uploader_check CHECK (uploaded_by IS NOT NULL OR legacy_migrated),
  ADD CONSTRAINT evidence_expiry_check CHECK (status<>'upload_pending' OR upload_expires_at IS NOT NULL),
  ADD CONSTRAINT evidence_review_check CHECK (
    (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    OR (status IN ('upload_pending','pending_review') AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR status='superseded'),
  ADD CONSTRAINT evidence_rejection_check CHECK (
    (status='rejected' AND length(btrim(rejection_reason))>=3) OR
    (status='superseded') OR
    (status NOT IN ('rejected','superseded') AND rejection_reason IS NULL)),
  ADD CONSTRAINT evidence_supersession_check CHECK (
    (status='superseded' AND superseded_at IS NOT NULL AND superseded_by IS NOT NULL AND superseded_by<>id)
    OR (status<>'superseded' AND superseded_at IS NULL AND superseded_by IS NULL));

-- A legacy unverified row has no authoritative evidence review or creator. It
-- cannot be guessed into a verified record, so abort with its identity.
DO $legacy_certifications$
DECLARE v_bad record;
BEGIN
 SELECT c.id,
   CASE WHEN c.organization_id IS NULL THEN 'organization is null'
        WHEN c.supplier_id IS NULL THEN 'supplier is null'
        WHEN c.evidence_id IS NULL THEN 'evidence is null'
        WHEN c.verification_status IS NULL THEN 'verification status is null'
        WHEN c.verification_status NOT IN ('verified','revoked') THEN 'verification status is not authoritative'
        WHEN e.id IS NULL THEN 'evidence does not exist'
        WHEN e.status<>'approved' THEN 'evidence is not approved'
        WHEN e.organization_id IS DISTINCT FROM c.organization_id THEN 'organization differs from evidence'
        WHEN e.supplier_id IS DISTINCT FROM c.supplier_id THEN 'supplier differs from evidence'
        WHEN e.document_type NOT IN ('certificate','test_report') THEN 'evidence type cannot certify'
        ELSE 'creator identity cannot be established safely'
   END reason INTO v_bad
 FROM public.certifications c LEFT JOIN public.evidence_uploads e ON e.id=c.evidence_id
 WHERE c.organization_id IS NULL OR c.supplier_id IS NULL OR c.evidence_id IS NULL
   OR c.verification_status IS NULL OR c.verification_status NOT IN ('verified','revoked')
   OR e.id IS NULL OR e.status<>'approved' OR e.organization_id IS DISTINCT FROM c.organization_id
   OR e.supplier_id IS DISTINCT FROM c.supplier_id OR e.document_type NOT IN ('certificate','test_report')
   OR c.id IS NOT NULL
 LIMIT 1;
 IF FOUND THEN RAISE EXCEPTION 'legacy certification % cannot be safely migrated: %',v_bad.id,v_bad.reason; END IF;
END $legacy_certifications$;

ALTER TABLE public.certifications
  ADD COLUMN created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN revoked_at timestamptz,
  ADD COLUMN revoked_by uuid REFERENCES public.profiles(id),
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN supplier_id SET NOT NULL,
  ALTER COLUMN evidence_id SET NOT NULL,
  ALTER COLUMN verification_status DROP DEFAULT,
  ALTER COLUMN verification_status SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL,
  DROP CONSTRAINT IF EXISTS certifications_verification_status_check,
  ADD CONSTRAINT certifications_verification_status_check CHECK (verification_status IN ('verified','revoked')),
  ADD CONSTRAINT certifications_revocation_check CHECK (
    (verification_status='verified' AND revoked_at IS NULL AND revoked_by IS NULL)
    OR (verification_status='revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL));
CREATE UNIQUE INDEX certifications_active_evidence_uidx ON public.certifications(evidence_id)
  WHERE verification_status='verified';

CREATE OR REPLACE FUNCTION public.validate_evidence_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v record;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.organization_id,NEW.supplier_id,NEW.lifecycle_stage_id,
    NEW.storage_bucket,NEW.storage_path,NEW.uploaded_by) IS DISTINCT FROM
    (OLD.organization_id,OLD.supplier_id,OLD.lifecycle_stage_id,OLD.storage_bucket,OLD.storage_path,OLD.uploaded_by)
  THEN RAISE EXCEPTION 'evidence ownership and object identity are immutable'; END IF;
  SELECT s.organization_id,s.supplier_id,p.organization_id product_org INTO v
  FROM public.lifecycle_stages s JOIN public.products p ON p.id=s.product_id
  WHERE s.id=NEW.lifecycle_stage_id;
  IF NOT FOUND OR v.supplier_id IS NULL OR v.organization_id IS DISTINCT FROM NEW.organization_id
    OR v.product_org IS DISTINCT FROM NEW.organization_id OR v.supplier_id IS DISTINCT FROM NEW.supplier_id
  THEN RAISE EXCEPTION 'evidence stage, supplier, product, and organization scope must match'; END IF;
  NEW.updated_at:=now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_evidence_scope() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_evidence_scope_trigger BEFORE INSERT OR UPDATE ON public.evidence_uploads
FOR EACH ROW EXECUTE FUNCTION public.validate_evidence_scope();

CREATE OR REPLACE FUNCTION public.current_actor_can_upload_evidence(p_lifecycle_stage_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.lifecycle_stages s
  JOIN public.products p ON (p.id,p.organization_id)=(s.product_id,s.organization_id)
  JOIN public.suppliers su ON (su.id,su.organization_id)=(s.supplier_id,s.organization_id)
  WHERE s.id=p_lifecycle_stage_id AND p.status<>'archived' AND (
    EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid() AND m.organization_id=s.organization_id AND m.role IN ('admin','manager'))
    OR (NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid())
        AND EXISTS(SELECT 1 FROM public.supplier_contacts c WHERE c.profile_id=auth.uid() AND c.supplier_id=s.supplier_id))))
$$;
REVOKE ALL ON FUNCTION public.current_actor_can_upload_evidence(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_actor_can_upload_evidence(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_evidence_upload_intent(p_lifecycle_stage_id uuid,p_document_type text,p_original_filename text,p_mime_type text,p_size_bytes bigint)
RETURNS TABLE(evidence_id uuid,bucket_id text,storage_path text,upload_expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v_stage record; v_id uuid:=extensions.gen_random_uuid(); v_ext text; v_path text; v_exp timestamptz:=now()+interval '15 minutes'; v_resub boolean;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 SELECT s.organization_id,s.supplier_id,p.status INTO v_stage FROM public.lifecycle_stages s JOIN public.products p ON p.id=s.product_id WHERE s.id=p_lifecycle_stage_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'lifecycle stage not found'; END IF;
 IF v_stage.supplier_id IS NULL THEN RAISE EXCEPTION 'lifecycle stage has no supplier'; END IF;
 IF v_stage.status='archived' THEN RAISE EXCEPTION 'archived products cannot receive evidence'; END IF;
 IF NOT public.current_actor_can_upload_evidence(p_lifecycle_stage_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF p_document_type IS NULL OR p_document_type NOT IN ('certificate','test_report','material_declaration','invoice','other') THEN RAISE EXCEPTION 'invalid document type'; END IF;
 IF p_original_filename IS NULL OR length(btrim(p_original_filename))=0 OR length(p_original_filename)>255 OR p_original_filename ~ '[/\\[:cntrl:]]' THEN RAISE EXCEPTION 'invalid filename'; END IF;
 v_ext:=CASE p_mime_type WHEN 'application/pdf' THEN 'pdf' WHEN 'image/png' THEN 'png' WHEN 'image/jpeg' THEN 'jpg' END;
 IF v_ext IS NULL OR lower(p_original_filename) !~ CASE v_ext WHEN 'jpg' THEN '\.(jpg|jpeg)$' ELSE '\.'||v_ext||'$' END THEN RAISE EXCEPTION 'filename extension and MIME type must agree'; END IF;
 IF p_size_bytes IS NULL OR p_size_bytes NOT BETWEEN 1 AND 10485760 THEN RAISE EXCEPTION 'file size must be between 1 byte and 10 MiB'; END IF;
 v_path:='evidence/'||v_id||'/'||encode(extensions.gen_random_bytes(32),'hex')||'.'||v_ext;
 SELECT EXISTS(SELECT 1 FROM public.evidence_uploads WHERE lifecycle_stage_id=p_lifecycle_stage_id AND status='rejected')
   AND EXISTS(SELECT 1 FROM public.supplier_contacts WHERE profile_id=v_actor AND supplier_id=v_stage.supplier_id)
 INTO v_resub;
 INSERT INTO public.evidence_uploads(id,organization_id,supplier_id,lifecycle_stage_id,storage_path,document_type,status,uploaded_by,original_filename,mime_type,size_bytes,upload_expires_at)
 VALUES(v_id,v_stage.organization_id,v_stage.supplier_id,p_lifecycle_stage_id,v_path,p_document_type,'upload_pending',v_actor,p_original_filename,p_mime_type,p_size_bytes,v_exp);
 UPDATE public.evidence_uploads SET status='superseded',superseded_at=now(),superseded_by=v_id
 WHERE lifecycle_stage_id=p_lifecycle_stage_id AND id<>v_id AND status='rejected';
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v_stage.organization_id,v_actor,CASE WHEN v_resub THEN 'supplier_resubmission' ELSE 'evidence_upload_intent_created' END,'evidence_upload',v_id::text);
 RETURN QUERY SELECT v_id,'compliance_docs'::text,v_path,v_exp;
END $$;

CREATE OR REPLACE FUNCTION public.finalize_evidence_upload(p_evidence_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=auth.uid(); v record; v_owner text; v_metadata jsonb; v_count int;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.evidence_uploads WHERE id=p_evidence_id FOR UPDATE;
 IF NOT FOUND OR v.uploaded_by IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'upload intent not found' USING ERRCODE='42501'; END IF;
 IF v.status<>'upload_pending' THEN RAISE EXCEPTION 'upload intent is not pending'; END IF;
 IF v.upload_expires_at<=now() THEN RAISE EXCEPTION 'upload intent expired'; END IF;
 IF NOT public.current_actor_can_upload_evidence(v.lifecycle_stage_id) THEN RAISE EXCEPTION 'authorization is no longer valid' USING ERRCODE='42501'; END IF;
 SELECT count(*),min(o.owner::text),min(o.metadata::text)::jsonb INTO v_count,v_owner,v_metadata FROM storage.objects o WHERE o.bucket_id=v.storage_bucket AND o.name=v.storage_path;
 IF v_count<>1 THEN RAISE EXCEPTION 'exactly one uploaded object is required'; END IF;
 IF v_owner IS DISTINCT FROM v_actor::text THEN RAISE EXCEPTION 'storage object owner mismatch'; END IF;
 IF v_metadata->>'mimetype' IS DISTINCT FROM v.mime_type OR NOT (v_metadata->>'size' ~ '^[0-9]+$') OR (v_metadata->>'size')::bigint IS DISTINCT FROM v.size_bytes OR v.size_bytes>10485760 THEN RAISE EXCEPTION 'storage object metadata mismatch'; END IF;
 UPDATE public.evidence_uploads SET status='pending_review',uploaded_at=now(),upload_expires_at=NULL WHERE id=v.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'evidence_upload_finalized','evidence_upload',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_evidence_upload_intent(p_evidence_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=auth.uid(); v record;
BEGIN
 SELECT * INTO v FROM public.evidence_uploads WHERE id=p_evidence_id FOR UPDATE;
 IF v_actor IS NULL OR NOT FOUND OR v.uploaded_by IS DISTINCT FROM v_actor OR v.status<>'upload_pending' THEN RAISE EXCEPTION 'pending upload intent not found' USING ERRCODE='42501'; END IF;
 DELETE FROM public.evidence_uploads WHERE id=v.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'evidence_upload_intent_cancelled','evidence_upload',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.current_actor_can_read_evidence_object(p_bucket text,p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.storage_bucket=p_bucket AND e.storage_path=p_path
 AND e.status IN ('pending_review','approved','rejected','superseded') AND
 (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid() AND m.organization_id=e.organization_id)
  OR (NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid())
      AND EXISTS(SELECT 1 FROM public.supplier_contacts c WHERE c.profile_id=auth.uid() AND c.supplier_id=e.supplier_id))))
$$;
REVOKE ALL ON FUNCTION public.current_actor_can_read_evidence_object(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_actor_can_read_evidence_object(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_evidence_download_target(p_evidence_id uuid)
RETURNS TABLE(bucket_id text,storage_path text,original_filename text,mime_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT e.storage_bucket,e.storage_path,e.original_filename,e.mime_type FROM public.evidence_uploads e
 WHERE e.id=p_evidence_id AND e.status<>'upload_pending' AND public.current_actor_can_read_evidence_object(e.storage_bucket,e.storage_path)
$$;

CREATE OR REPLACE FUNCTION public.review_evidence_upload(p_evidence_id uuid,p_decision text,p_rejection_reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=auth.uid(); v record;
BEGIN
 IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'decision must be approved or rejected'; END IF;
 IF p_decision='rejected' AND length(btrim(coalesce(p_rejection_reason,'')))<3 THEN RAISE EXCEPTION 'meaningful rejection reason required'; END IF;
 SELECT * INTO v FROM public.evidence_uploads WHERE id=p_evidence_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v.organization_id AND m.role IN ('admin','manager')) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF v.status<>'pending_review' THEN RAISE EXCEPTION 'evidence is not pending review'; END IF;
 UPDATE public.evidence_uploads SET status=p_decision,reviewed_by=v_actor,reviewed_at=now(),rejection_reason=CASE WHEN p_decision='rejected' THEN btrim(p_rejection_reason) END WHERE id=v.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'evidence_'||p_decision,'evidence_upload',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.create_certification_from_evidence(p_evidence_id uuid,p_name text,p_expiry_date date) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v record; v_id uuid:=extensions.gen_random_uuid(); v_name text:=regexp_replace(btrim(p_name),'[[:space:]]+',' ','g');
BEGIN
 SELECT * INTO v FROM public.evidence_uploads WHERE id=p_evidence_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v.organization_id AND m.role IN ('admin','manager')) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF v.status<>'approved' OR v.document_type NOT IN ('certificate','test_report') THEN RAISE EXCEPTION 'approved certification evidence required'; END IF;
 IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'certification name must be 1 to 120 characters'; END IF;
 IF p_expiry_date IS NULL OR p_expiry_date<=current_date THEN RAISE EXCEPTION 'expiry date must be in the future'; END IF;
 INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by) VALUES(v_id,v.organization_id,v.supplier_id,v.id,v_name,p_expiry_date,'verified',v_actor);
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'certification_created','certification',v_id::text); RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_certification(p_certification_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=auth.uid(); v record;
BEGIN
 SELECT * INTO v FROM public.certifications WHERE id=p_certification_id FOR UPDATE;
 IF NOT FOUND OR v.verification_status<>'verified' OR NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v.organization_id AND m.role IN ('admin','manager')) THEN RAISE EXCEPTION 'verified certification not found or not authorized' USING ERRCODE='42501'; END IF;
 UPDATE public.certifications SET verification_status='revoked',revoked_at=now(),revoked_by=v_actor WHERE id=v.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'certification_revoked','certification',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.validate_certification_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v record;
BEGIN
 SELECT e.organization_id,e.supplier_id,e.status,e.document_type INTO v
 FROM public.evidence_uploads e WHERE e.id=NEW.evidence_id;
 IF NOT FOUND OR v.organization_id IS DISTINCT FROM NEW.organization_id
   OR v.supplier_id IS DISTINCT FROM NEW.supplier_id
   OR v.document_type NOT IN ('certificate','test_report')
   OR (NEW.verification_status='verified' AND v.status<>'approved')
 THEN RAISE EXCEPTION 'certification scope requires matching approved evidence'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_certification_scope() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_certification_scope_trigger BEFORE INSERT OR UPDATE ON public.certifications
FOR EACH ROW EXECUTE FUNCTION public.validate_certification_scope();

CREATE OR REPLACE FUNCTION public.get_my_organization_evidence(p_product_id uuid DEFAULT NULL)
RETURNS TABLE(evidence_id uuid,lifecycle_stage_id uuid,document_type text,original_filename text,
 evidence_status text,uploaded_by uuid,uploaded_at timestamptz,reviewed_by uuid,reviewed_at timestamptz,
 rejection_reason text,certification_id uuid,certification_name text,certification_status text,certification_expiry date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT e.id,e.lifecycle_stage_id,e.document_type,e.original_filename,e.status,e.uploaded_by,e.uploaded_at,
   e.reviewed_by,e.reviewed_at,e.rejection_reason,c.id,c.name,c.verification_status,c.expiry_date
 FROM public.evidence_uploads e
 JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id AND s.organization_id=e.organization_id
 LEFT JOIN public.certifications c ON c.evidence_id=e.id
 WHERE EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid() AND m.organization_id=e.organization_id)
   AND (p_product_id IS NULL OR s.product_id=p_product_id)
 ORDER BY e.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.get_my_supplier_evidence_tasks()
RETURNS TABLE(lifecycle_stage_id uuid,stage_name text,product_name text,document_requirement text,evidence_status text,evidence_id uuid,rejection_reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT s.id,s.stage_name,p.name,'Evidence document'::text,e.status,e.id,e.rejection_reason
 FROM public.supplier_contacts c
 JOIN public.suppliers su ON su.id=c.supplier_id
 JOIN public.lifecycle_stages s ON (s.supplier_id,s.organization_id)=(su.id,su.organization_id)
 JOIN public.products p ON (p.id,p.organization_id)=(s.product_id,s.organization_id)
 LEFT JOIN LATERAL (SELECT x.id,x.status,x.rejection_reason FROM public.evidence_uploads x WHERE x.lifecycle_stage_id=s.id ORDER BY x.created_at DESC LIMIT 1)e ON true
 WHERE c.profile_id=auth.uid() AND p.status<>'archived'
$$;

REVOKE INSERT,UPDATE,DELETE ON public.evidence_uploads,public.certifications FROM anon,authenticated;
DROP POLICY IF EXISTS evidence_uploads_manager_insert ON public.evidence_uploads;
DROP POLICY IF EXISTS evidence_uploads_manager_update ON public.evidence_uploads;
DROP POLICY IF EXISTS evidence_uploads_admin_delete ON public.evidence_uploads;
DROP POLICY IF EXISTS certifications_manager_insert ON public.certifications;
DROP POLICY IF EXISTS certifications_manager_update ON public.certifications;
DROP POLICY IF EXISTS certifications_admin_delete ON public.certifications;
CREATE POLICY evidence_supplier_select ON public.evidence_uploads FOR SELECT TO authenticated USING
 (EXISTS(SELECT 1 FROM public.supplier_contacts c WHERE c.profile_id=auth.uid() AND c.supplier_id=supplier_id));

DO $policies$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_catalog.pg_policies WHERE schemaname='storage' AND tablename='objects'
  AND (policyname ILIKE '%compliance%docs%' OR coalesce(qual,'') ILIKE '%compliance_docs%' OR coalesce(with_check,'') ILIKE '%compliance_docs%')
 LOOP EXECUTE format('DROP POLICY %I ON storage.objects',p.policyname); END LOOP;
END $policies$;
CREATE POLICY compliance_docs_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK
 (bucket_id='compliance_docs' AND owner=auth.uid() AND metadata->>'mimetype' IN ('application/pdf','image/png','image/jpeg')
  AND metadata->>'size' ~ '^[0-9]+$' AND (metadata->>'size')::bigint BETWEEN 1 AND 10485760
  AND EXISTS(SELECT 1 FROM public.evidence_uploads e WHERE e.storage_bucket=bucket_id AND e.storage_path=name AND e.status='upload_pending'
    AND e.upload_expires_at>now() AND e.uploaded_by=auth.uid() AND e.mime_type=metadata->>'mimetype' AND e.size_bytes=(metadata->>'size')::bigint
    AND public.current_actor_can_upload_evidence(e.lifecycle_stage_id)));
CREATE POLICY compliance_docs_select ON storage.objects FOR SELECT TO authenticated USING
 (bucket_id='compliance_docs' AND public.current_actor_can_read_evidence_object(bucket_id,name));

REVOKE ALL ON FUNCTION public.create_evidence_upload_intent(uuid,text,text,text,bigint),public.finalize_evidence_upload(uuid),public.cancel_evidence_upload_intent(uuid),public.get_evidence_download_target(uuid),public.review_evidence_upload(uuid,text,text),public.create_certification_from_evidence(uuid,text,date),public.revoke_certification(uuid),public.get_my_supplier_evidence_tasks(),public.get_my_organization_evidence(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_evidence_upload_intent(uuid,text,text,text,bigint),public.finalize_evidence_upload(uuid),public.cancel_evidence_upload_intent(uuid),public.get_evidence_download_target(uuid),public.review_evidence_upload(uuid,text,text),public.create_certification_from_evidence(uuid,text,date),public.revoke_certification(uuid),public.get_my_supplier_evidence_tasks(),public.get_my_organization_evidence(uuid) TO authenticated;

COMMENT ON FUNCTION public.cancel_evidence_upload_intent(uuid) IS 'Cancels the database intent only. Any uploaded bytes are retained for a later privileged abandoned-object cleanup process.';
