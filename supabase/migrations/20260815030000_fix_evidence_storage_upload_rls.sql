-- Storage API v1.26.4 checks INSERT permission before object metadata exists.
-- Authorize that probe from the trusted upload intent; validate actual object
-- metadata only when the upload is finalized.
DROP POLICY IF EXISTS compliance_docs_insert ON storage.objects;
CREATE POLICY compliance_docs_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  storage.objects.bucket_id = 'compliance_docs'
  AND storage.objects.owner_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.evidence_uploads AS evidence
    WHERE evidence.storage_bucket = storage.objects.bucket_id
      AND evidence.storage_path = storage.objects.name
      AND evidence.status = 'upload_pending'
      AND evidence.upload_expires_at > pg_catalog.now()
      AND evidence.uploaded_by = auth.uid()
      AND evidence.mime_type IN ('application/pdf', 'image/png', 'image/jpeg')
      AND evidence.size_bytes BETWEEN 1 AND 10485760
      AND public.current_actor_can_upload_evidence(evidence.lifecycle_stage_id)
  )
);

CREATE OR REPLACE FUNCTION public.finalize_evidence_upload(p_evidence_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v record;
  v_owner text;
  v_metadata jsonb;
  v_count integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.evidence_uploads WHERE id = p_evidence_id FOR UPDATE;
  IF NOT FOUND OR v.uploaded_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'upload intent not found' USING ERRCODE = '42501';
  END IF;
  IF v.status <> 'upload_pending' THEN RAISE EXCEPTION 'upload intent is not pending'; END IF;
  IF v.upload_expires_at <= pg_catalog.now() THEN RAISE EXCEPTION 'upload intent expired'; END IF;
  IF NOT public.current_actor_can_upload_evidence(v.lifecycle_stage_id) THEN
    RAISE EXCEPTION 'authorization is no longer valid' USING ERRCODE = '42501';
  END IF;

  SELECT count(*), min(object.owner_id), min(object.metadata::text)::jsonb
  INTO v_count, v_owner, v_metadata
  FROM storage.objects AS object
  WHERE object.bucket_id = v.storage_bucket AND object.name = v.storage_path;
  IF v_count <> 1 THEN RAISE EXCEPTION 'exactly one uploaded object is required'; END IF;
  IF v_owner IS DISTINCT FROM v_actor::text THEN RAISE EXCEPTION 'storage object owner mismatch'; END IF;
  IF v_metadata->>'mimetype' IS DISTINCT FROM v.mime_type
    OR NOT (v_metadata->>'size' ~ '^[0-9]+$')
    OR (v_metadata->>'size')::bigint IS DISTINCT FROM v.size_bytes
    OR v.size_bytes > 10485760
  THEN
    RAISE EXCEPTION 'storage object metadata mismatch';
  END IF;

  UPDATE public.evidence_uploads
  SET status = 'pending_review', uploaded_at = pg_catalog.now(), upload_expires_at = NULL
  WHERE id = v.id;
  INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name)
  VALUES(v.organization_id,v_actor,'evidence_upload_finalized','evidence_upload',v.id::text);
END
$function$;
