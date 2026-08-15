-- Evidence remains untrusted until a privileged scanner binds its verdict to the
-- immutable Storage object and a SHA-256 of the bytes it inspected.
ALTER TABLE public.evidence_uploads
  ADD COLUMN integrity_legacy_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN content_sha256 text,
  ADD COLUMN scan_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN scan_started_at timestamptz,
  ADD COLUMN scan_completed_at timestamptz,
  ADD COLUMN scan_engine text,
  ADD COLUMN scan_result text;

ALTER TABLE public.evidence_uploads
  DROP CONSTRAINT evidence_status_check,
  DROP CONSTRAINT evidence_review_check,
  ADD CONSTRAINT evidence_status_check CHECK (status IN ('upload_pending','quarantined','pending_review','approved','rejected','superseded'));

-- Preserve reviewed historical evidence without inventing scan provenance. Rows
-- still awaiting review enter quarantine, while outstanding upload intents keep
-- their normal finalization lifecycle.
UPDATE public.evidence_uploads
SET integrity_legacy_accepted=true
WHERE status IN ('approved','rejected','superseded');
UPDATE public.evidence_uploads
SET status='quarantined'
WHERE status='pending_review';

ALTER TABLE public.evidence_uploads
  ADD CONSTRAINT evidence_sha256_check CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT evidence_scan_status_check CHECK (scan_status IN ('pending','clean','infected','error')),
  ADD CONSTRAINT evidence_review_check CHECK (
    (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    OR (status IN ('upload_pending','quarantined','pending_review') AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR status='superseded'),
  ADD CONSTRAINT evidence_scan_state_check CHECK (
    (integrity_legacy_accepted AND status IN ('approved','rejected','superseded')
      AND scan_status='pending' AND content_sha256 IS NULL AND scan_started_at IS NULL
      AND scan_completed_at IS NULL AND scan_engine IS NULL AND scan_result IS NULL)
    OR (NOT integrity_legacy_accepted AND status IN ('upload_pending','quarantined')
      AND scan_status='pending' AND content_sha256 IS NULL AND scan_completed_at IS NULL
      AND scan_engine IS NULL AND scan_result IS NULL)
    OR (NOT integrity_legacy_accepted AND status='quarantined' AND scan_status IN ('infected','error')
      AND content_sha256 IS NOT NULL AND scan_started_at IS NOT NULL AND scan_completed_at IS NOT NULL
      AND scan_engine IS NOT NULL AND scan_result IS NOT NULL)
    OR (NOT integrity_legacy_accepted AND status IN ('pending_review','approved','rejected','superseded')
      AND scan_status='clean' AND content_sha256 IS NOT NULL AND scan_started_at IS NOT NULL
      AND scan_completed_at IS NOT NULL AND scan_engine IS NOT NULL AND scan_result IS NOT NULL)
  );

COMMENT ON COLUMN public.evidence_uploads.integrity_legacy_accepted IS
  'True only for reviewed evidence predating mandatory integrity scanning; no scan or digest is implied.';
COMMENT ON COLUMN public.evidence_uploads.content_sha256 IS
  'Lowercase SHA-256 of actual object bytes, supplied only by the trusted scanner boundary and immutable after a clean verdict.';

CREATE OR REPLACE FUNCTION public.validate_evidence_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v record;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.organization_id,NEW.supplier_id,NEW.lifecycle_stage_id,
    NEW.storage_bucket,NEW.storage_path,NEW.uploaded_by) IS DISTINCT FROM
    (OLD.organization_id,OLD.supplier_id,OLD.lifecycle_stage_id,OLD.storage_bucket,OLD.storage_path,OLD.uploaded_by)
  THEN RAISE EXCEPTION 'evidence ownership and object identity are immutable'; END IF;
  IF TG_OP='UPDATE' AND NEW.integrity_legacy_accepted IS DISTINCT FROM OLD.integrity_legacy_accepted
  THEN RAISE EXCEPTION 'evidence integrity provenance is immutable'; END IF;
  IF TG_OP='UPDATE' AND OLD.scan_status='clean' AND
    (NEW.content_sha256,NEW.scan_status,NEW.scan_started_at,NEW.scan_completed_at,NEW.scan_engine,NEW.scan_result)
      IS DISTINCT FROM
    (OLD.content_sha256,OLD.scan_status,OLD.scan_started_at,OLD.scan_completed_at,OLD.scan_engine,OLD.scan_result)
  THEN RAISE EXCEPTION 'accepted evidence integrity is immutable'; END IF;
  SELECT s.organization_id,s.supplier_id,p.organization_id product_org INTO v
  FROM public.lifecycle_stages s JOIN public.products p ON p.id=s.product_id
  WHERE s.id=NEW.lifecycle_stage_id;
  IF NOT FOUND OR v.supplier_id IS NULL OR v.organization_id IS DISTINCT FROM NEW.organization_id
    OR v.product_org IS DISTINCT FROM NEW.organization_id OR v.supplier_id IS DISTINCT FROM NEW.supplier_id
  THEN RAISE EXCEPTION 'evidence stage, supplier, product, and organization scope must match'; END IF;
  NEW.updated_at:=now(); RETURN NEW;
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
 SELECT count(*),min(o.owner_id),min(o.metadata::text)::jsonb INTO v_count,v_owner,v_metadata FROM storage.objects o WHERE o.bucket_id=v.storage_bucket AND o.name=v.storage_path;
 IF v_count<>1 THEN RAISE EXCEPTION 'exactly one uploaded object is required'; END IF;
 IF v_owner IS DISTINCT FROM v_actor::text THEN RAISE EXCEPTION 'storage object owner mismatch'; END IF;
 IF v_metadata->>'mimetype' IS DISTINCT FROM v.mime_type OR NOT (v_metadata->>'size' ~ '^[0-9]+$') OR (v_metadata->>'size')::bigint IS DISTINCT FROM v.size_bytes OR v.size_bytes>10485760 THEN RAISE EXCEPTION 'storage object metadata mismatch'; END IF;
 UPDATE public.evidence_uploads SET status='quarantined',uploaded_at=now(),upload_expires_at=NULL,scan_started_at=now() WHERE id=v.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'evidence_quarantined','evidence_upload',v.id::text);
END $$;

-- Called by a server adapter after it downloads and hashes the exact object bytes
-- and identifies their magic bytes. service_role is deliberately the sole grantee.
CREATE OR REPLACE FUNCTION public.record_evidence_scan_result(
  p_evidence_id uuid,p_storage_bucket text,p_storage_path text,p_size_bytes bigint,
  p_declared_mime text,p_detected_mime text,p_content_sha256 text,p_verdict text,
  p_scan_engine text,p_scan_result text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v public.evidence_uploads%ROWTYPE; v_metadata jsonb; v_count integer; v_action text;
BEGIN
 IF coalesce(auth.jwt()->>'role','') <> 'service_role'
 THEN RAISE EXCEPTION 'trusted scanner required' USING ERRCODE='42501'; END IF;
 IF p_verdict NOT IN ('clean','infected','error') THEN RAISE EXCEPTION 'invalid scan verdict'; END IF;
 IF p_content_sha256 IS NULL OR p_content_sha256 !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid authoritative SHA-256'; END IF;
 IF p_scan_engine IS NULL OR length(btrim(p_scan_engine)) NOT BETWEEN 1 AND 80 OR p_scan_result IS NULL OR length(btrim(p_scan_result)) NOT BETWEEN 1 AND 120
 THEN RAISE EXCEPTION 'normalized scanner identity and result required'; END IF;
 IF p_detected_mime NOT IN ('application/pdf','image/png','image/jpeg') OR p_detected_mime IS DISTINCT FROM p_declared_mime
 THEN RAISE EXCEPTION 'object content type is not compatible'; END IF;
 SELECT * INTO v FROM public.evidence_uploads WHERE id=p_evidence_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'quarantined' OR v.scan_status<>'pending' OR v.integrity_legacy_accepted
 THEN RAISE EXCEPTION 'quarantined evidence is no longer scan-eligible'; END IF;
 IF (v.storage_bucket,v.storage_path,v.size_bytes,v.mime_type) IS DISTINCT FROM (p_storage_bucket,p_storage_path,p_size_bytes,p_declared_mime)
 THEN RAISE EXCEPTION 'scan result object identity mismatch'; END IF;
 SELECT count(*),min(o.metadata::text)::jsonb INTO v_count,v_metadata FROM storage.objects o
 WHERE o.bucket_id=v.storage_bucket AND o.name=v.storage_path;
 IF v_count<>1 OR v_metadata->>'mimetype' IS DISTINCT FROM v.mime_type OR NOT (v_metadata->>'size' ~ '^[0-9]+$') OR (v_metadata->>'size')::bigint IS DISTINCT FROM v.size_bytes
 THEN RAISE EXCEPTION 'stored object identity changed during scan'; END IF;
 UPDATE public.evidence_uploads SET content_sha256=p_content_sha256,scan_status=p_verdict,
   scan_started_at=coalesce(scan_started_at,now()),scan_completed_at=now(),scan_engine=btrim(p_scan_engine),scan_result=btrim(p_scan_result),
   status=CASE WHEN p_verdict='clean' THEN 'pending_review' ELSE 'quarantined' END
 WHERE id=v.id;
 v_action:=CASE p_verdict WHEN 'clean' THEN 'evidence_scan_clean' WHEN 'infected' THEN 'evidence_scan_rejected' ELSE 'evidence_scan_failed' END;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
 VALUES(v.organization_id,NULL,v_action,'evidence_upload',v.id::text);
END $$;

CREATE OR REPLACE FUNCTION public.current_actor_can_read_evidence_object(p_bucket text,p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.evidence_uploads e
 WHERE e.storage_bucket=p_bucket AND e.storage_path=p_path
 AND ((e.scan_status='clean' AND e.content_sha256 IS NOT NULL AND e.status IN ('pending_review','approved','rejected','superseded'))
      OR (e.integrity_legacy_accepted AND e.status IN ('approved','rejected','superseded')))
 AND (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid() AND m.organization_id=e.organization_id)
      OR (NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid())
          AND EXISTS(SELECT 1 FROM public.supplier_access_memberships a WHERE a.profile_id=auth.uid() AND a.supplier_id=e.supplier_id AND a.revoked_at IS NULL))))
$$;

CREATE OR REPLACE FUNCTION public.get_evidence_download_target(p_evidence_id uuid)
RETURNS TABLE(bucket_id text,storage_path text,original_filename text,mime_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT e.storage_bucket,e.storage_path,e.original_filename,e.mime_type FROM public.evidence_uploads e
 WHERE e.id=p_evidence_id AND public.current_actor_can_read_evidence_object(e.storage_bucket,e.storage_path)
$$;

CREATE OR REPLACE FUNCTION public.review_evidence_upload(p_evidence_id uuid,p_decision text,p_rejection_reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=auth.uid(); v record;
BEGIN
 IF p_decision NOT IN ('approved','rejected') OR (p_decision='rejected' AND (p_rejection_reason IS NULL OR length(btrim(p_rejection_reason))<3)) THEN RAISE EXCEPTION 'invalid review decision'; END IF;
 SELECT * INTO v FROM public.evidence_uploads WHERE id=p_evidence_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v.organization_id AND m.role IN ('admin','manager')) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF v.status<>'pending_review' OR v.scan_status<>'clean' OR v.content_sha256 IS NULL THEN RAISE EXCEPTION 'clean fingerprinted evidence pending review required'; END IF;
 UPDATE public.evidence_uploads SET status=p_decision,reviewed_by=v_actor,reviewed_at=now(),rejection_reason=CASE WHEN p_decision='rejected' THEN btrim(p_rejection_reason) END WHERE id=v.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'evidence_'||p_decision,'evidence_upload',v.id::text);
END $$;

-- Recreate the latest PR #14 routine with the integrity predicate added.
CREATE OR REPLACE FUNCTION public.create_certification_from_evidence(p_evidence_id uuid,p_name text,p_expiry_date date) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
DECLARE v_actor uuid:=auth.uid(); v record; v_product_id uuid; v_id uuid:=extensions.gen_random_uuid(); v_name text:=regexp_replace(btrim(p_name),'[[:space:]]+',' ','g');
BEGIN
 SELECT s.product_id INTO v_product_id FROM public.evidence_uploads e JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE e.id=p_evidence_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_product_id::text,0));
 SELECT e.*,s.product_id,s.organization_id AS stage_organization_id INTO v FROM public.evidence_uploads e JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id WHERE e.id=p_evidence_id FOR UPDATE OF e;
 IF NOT FOUND OR v.product_id IS DISTINCT FROM v_product_id OR v.stage_organization_id IS DISTINCT FROM v.organization_id OR NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=v_actor AND m.organization_id=v.organization_id AND m.role IN ('admin','manager')) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF v.status<>'approved' OR v.scan_status<>'clean' OR v.content_sha256 IS NULL OR v.document_type NOT IN ('certificate','test_report') THEN RAISE EXCEPTION 'clean fingerprinted approved certification evidence required'; END IF;
 IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'certification name must be 1 to 120 characters'; END IF;
 IF p_expiry_date IS NULL OR p_expiry_date<=current_date THEN RAISE EXCEPTION 'expiry date must be in the future'; END IF;
 INSERT INTO public.certifications(id,organization_id,supplier_id,evidence_id,name,expiry_date,verification_status,created_by) VALUES(v_id,v.organization_id,v.supplier_id,v.id,v_name,p_expiry_date,'verified',v_actor);
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(v.organization_id,v_actor,'certification_created','certification',v_id::text); RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.validate_certification_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v record;
BEGIN
 SELECT e.organization_id,e.supplier_id,e.status,e.document_type,e.scan_status,e.content_sha256 INTO v FROM public.evidence_uploads e WHERE e.id=NEW.evidence_id;
 IF NOT FOUND OR v.organization_id IS DISTINCT FROM NEW.organization_id OR v.supplier_id IS DISTINCT FROM NEW.supplier_id
   OR v.document_type NOT IN ('certificate','test_report') OR (NEW.verification_status='verified' AND (v.status<>'approved' OR v.scan_status<>'clean' OR v.content_sha256 IS NULL))
 THEN RAISE EXCEPTION 'certification scope requires matching clean fingerprinted approved evidence'; END IF;
 RETURN NEW;
END $$;

DROP FUNCTION public.get_my_organization_evidence(uuid);
CREATE FUNCTION public.get_my_organization_evidence(p_product_id uuid DEFAULT NULL)
RETURNS TABLE(evidence_id uuid,lifecycle_stage_id uuid,document_type text,original_filename text,
 evidence_status text,scan_status text,uploaded_by uuid,uploaded_at timestamptz,reviewed_by uuid,reviewed_at timestamptz,
 rejection_reason text,certification_id uuid,certification_name text,certification_status text,certification_expiry date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT e.id,e.lifecycle_stage_id,e.document_type,e.original_filename,e.status,e.scan_status,e.uploaded_by,e.uploaded_at,
   e.reviewed_by,e.reviewed_at,e.rejection_reason,c.id,c.name,c.verification_status,c.expiry_date
 FROM public.evidence_uploads e
 JOIN public.lifecycle_stages s ON s.id=e.lifecycle_stage_id AND s.organization_id=e.organization_id
 LEFT JOIN public.certifications c ON c.evidence_id=e.id
 WHERE EXISTS(SELECT 1 FROM public.organization_members m WHERE m.profile_id=auth.uid() AND m.organization_id=e.organization_id)
   AND (p_product_id IS NULL OR s.product_id=p_product_id)
 ORDER BY e.created_at DESC
$$;

DROP FUNCTION public.get_my_supplier_evidence_tasks();
CREATE FUNCTION public.get_my_supplier_evidence_tasks()
RETURNS TABLE(lifecycle_stage_id uuid,stage_name text,product_name text,document_requirement text,evidence_status text,scan_status text,evidence_id uuid,rejection_reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.supplier_access_memberships
   WHERE profile_id=auth.uid() AND revoked_at IS NULL)
 THEN RAISE EXCEPTION 'supplier portal access is not active' USING ERRCODE='42501'; END IF;
 RETURN QUERY
 SELECT s.id,s.stage_name,p.name,'Evidence document'::text,e.status,e.scan_status,e.id,e.rejection_reason
 FROM public.supplier_access_memberships a
 JOIN public.suppliers su ON su.id=a.supplier_id
 JOIN public.lifecycle_stages s ON (s.supplier_id,s.organization_id)=(su.id,su.organization_id)
 JOIN public.products p ON (p.id,p.organization_id)=(s.product_id,s.organization_id)
 LEFT JOIN LATERAL (
   SELECT x.id,x.status,x.scan_status,x.rejection_reason
   FROM public.evidence_uploads x WHERE x.lifecycle_stage_id=s.id
   ORDER BY x.created_at DESC LIMIT 1)e ON true
 WHERE a.profile_id=auth.uid() AND a.revoked_at IS NULL AND p.status<>'archived';
END $$;

REVOKE ALL ON FUNCTION public.record_evidence_scan_result(uuid,text,text,bigint,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_evidence_scan_result(uuid,text,text,bigint,text,text,text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.current_actor_can_read_evidence_object(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_actor_can_read_evidence_object(text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.finalize_evidence_upload(uuid),public.get_evidence_download_target(uuid),public.review_evidence_upload(uuid,text,text),public.create_certification_from_evidence(uuid,text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_evidence_upload(uuid),public.get_evidence_download_target(uuid),public.review_evidence_upload(uuid,text,text),public.create_certification_from_evidence(uuid,text,date) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_supplier_evidence_tasks(),public.get_my_organization_evidence(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_supplier_evidence_tasks(),public.get_my_organization_evidence(uuid) TO authenticated;
