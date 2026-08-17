-- Tenant-scoped, server-authorized staging and transactional commit for pilot CSV imports.
ALTER TABLE public.suppliers ADD COLUMN external_reference text;
CREATE UNIQUE INDEX suppliers_organization_external_reference_uidx
  ON public.suppliers (organization_id, lower(btrim(external_reference)))
  WHERE external_reference IS NOT NULL;

CREATE TABLE public.pilot_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  import_type text NOT NULL CHECK (import_type IN ('products','suppliers','product_materials','lifecycle_stages')),
  file_name text NOT NULL CHECK (btrim(file_name) <> '' AND char_length(file_name) <= 255),
  status text NOT NULL DEFAULT 'staging' CHECK (status IN ('staging','validated','failed_validation','committing','completed','failed','cancelled')),
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  valid_row_count integer NOT NULL DEFAULT 0 CHECK (valid_row_count >= 0),
  invalid_row_count integer NOT NULL DEFAULT 0 CHECK (invalid_row_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), validated_at timestamptz, committed_at timestamptz
);
CREATE TABLE public.pilot_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.pilot_import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL CHECK (row_number > 0),
  raw_payload jsonb CHECK (raw_payload IS NULL OR jsonb_typeof(raw_payload)='object'),
  normalized_payload jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(validation_errors)='array'),
  status text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','valid','invalid','committed')),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(batch_id,row_number)
);
ALTER TABLE public.pilot_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_import_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilot_import_batches, public.pilot_import_rows FROM PUBLIC,anon,authenticated;
CREATE POLICY pilot_batches_select ON public.pilot_import_batches FOR SELECT TO authenticated
  USING (public.has_org_role(organization_id,ARRAY['admin','manager']));
CREATE POLICY pilot_rows_select ON public.pilot_import_rows FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.pilot_import_batches b WHERE b.id=batch_id AND public.has_org_role(b.organization_id,ARRAY['admin','manager'])
));

CREATE FUNCTION private.pilot_import_context(p_batch_id uuid DEFAULT NULL)
RETURNS public.pilot_import_batches LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v public.pilot_import_batches;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
 IF p_batch_id IS NULL THEN
   SELECT b.* INTO v FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
   CROSS JOIN LATERAL (SELECT NULL::uuid id,m.organization_id,auth.uid() created_by,NULL::text import_type,NULL::text file_name,NULL::text status,0 row_count,0 valid_row_count,0 invalid_row_count,NULL::timestamptz created_at,NULL::timestamptz validated_at,NULL::timestamptz committed_at) b
   WHERE m.profile_id=auth.uid() AND m.role IN ('admin','manager') AND o.lifecycle_status='active';
 ELSE SELECT b.* INTO v FROM public.pilot_import_batches b JOIN public.organization_members m ON m.organization_id=b.organization_id JOIN public.organizations o ON o.id=b.organization_id WHERE b.id=p_batch_id AND m.profile_id=auth.uid() AND m.role IN ('admin','manager') AND o.lifecycle_status='active';
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'import not found or not authorized' USING ERRCODE='42501'; END IF;
 RETURN v;
END $$;

CREATE FUNCTION public.create_pilot_import_batch(p_import_type text,p_file_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c public.pilot_import_batches; v_id uuid;
BEGIN c:=private.pilot_import_context(NULL);
 IF p_import_type NOT IN ('products','suppliers','product_materials','lifecycle_stages') OR btrim(coalesce(p_file_name,''))='' OR char_length(p_file_name)>255 THEN RAISE EXCEPTION 'invalid import type or file name' USING ERRCODE='22023'; END IF;
 INSERT INTO public.pilot_import_batches(organization_id,created_by,import_type,file_name) VALUES(c.organization_id,auth.uid(),p_import_type,btrim(p_file_name)) RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(c.organization_id,auth.uid(),'pilot_import_created','pilot_import',v_id::text||':'||p_import_type||':0'); RETURN v_id;
END $$;

CREATE FUNCTION public.stage_pilot_import_rows(p_batch_id uuid,p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b public.pilot_import_batches; n int;
BEGIN b:=private.pilot_import_context(p_batch_id);
 IF b.status<>'staging' THEN RAISE EXCEPTION 'batch is not staging' USING ERRCODE='55000'; END IF;
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)=0 OR jsonb_array_length(p_rows)>1000 THEN RAISE EXCEPTION 'rows must be an array of 1 to 1000 objects' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) x WHERE jsonb_typeof(x)<>'object') THEN RAISE EXCEPTION 'each row must be an object' USING ERRCODE='22023'; END IF;
 DELETE FROM public.pilot_import_rows WHERE batch_id=b.id;
 INSERT INTO public.pilot_import_rows(batch_id,row_number,raw_payload) SELECT b.id,ordinality,value FROM jsonb_array_elements(p_rows) WITH ORDINALITY;
 n:=jsonb_array_length(p_rows); UPDATE public.pilot_import_batches SET row_count=n,valid_row_count=0,invalid_row_count=0 WHERE id=b.id;
 RETURN jsonb_build_object('batch_id',b.id,'row_count',n);
END $$;

CREATE FUNCTION public.validate_pilot_import_batch(p_batch_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b public.pilot_import_batches; r record; n jsonb; e jsonb; v numeric; good int; bad int;
BEGIN b:=private.pilot_import_context(p_batch_id);
 IF b.status NOT IN ('staging','validated') OR b.row_count=0 THEN RAISE EXCEPTION 'batch cannot be validated' USING ERRCODE='55000'; END IF;
 FOR r IN SELECT * FROM public.pilot_import_rows WHERE batch_id=b.id ORDER BY row_number LOOP
  e:='[]'::jsonb;
  IF b.import_type='products' THEN
   n:=jsonb_build_object('name',btrim(coalesce(r.raw_payload->>'name','')),'sku',btrim(coalesce(r.raw_payload->>'sku','')),'season',nullif(btrim(coalesce(r.raw_payload->>'season','')),''),'status',coalesce(nullif(lower(btrim(r.raw_payload->>'status')),''),'draft'));
   IF n->>'name'='' THEN e:=e||'"Required name"'::jsonb; END IF; IF n->>'sku'='' THEN e:=e||'"Required SKU"'::jsonb; ELSIF char_length(n->>'sku')>100 THEN e:=e||'"SKU exceeds 100 characters"'::jsonb; END IF;
   IF n->>'status' NOT IN ('draft','in_review') THEN e:=e||'"Status must be draft or in_review"'::jsonb; END IF;
   IF (SELECT count(*) FROM public.pilot_import_rows x WHERE x.batch_id=b.id AND lower(btrim(x.raw_payload->>'sku'))=lower(n->>'sku'))>1 THEN e:=e||'"Duplicate SKU in file"'::jsonb; END IF;
   n:=n||jsonb_build_object('match',EXISTS(SELECT 1 FROM public.products p WHERE p.organization_id=b.organization_id AND lower(btrim(p.sku))=lower(n->>'sku')));
  ELSIF b.import_type='suppliers' THEN
   n:=jsonb_build_object('supplier_reference',btrim(coalesce(r.raw_payload->>'supplier_reference','')),'name',btrim(coalesce(r.raw_payload->>'name','')),'location',nullif(btrim(coalesce(r.raw_payload->>'location','')),''),'tier',nullif(btrim(coalesce(r.raw_payload->>'tier','')),''),'contact_name',nullif(btrim(coalesce(r.raw_payload->>'contact_name','')),''),'contact_email',nullif(lower(btrim(coalesce(r.raw_payload->>'contact_email',''))),''));
   IF n->>'supplier_reference'='' THEN e:=e||'"Required supplier_reference"'::jsonb; END IF; IF n->>'name'='' THEN e:=e||'"Required name"'::jsonb; END IF;
   IF n->>'contact_email' IS NOT NULL AND (n->>'contact_name' IS NULL OR char_length(n->>'contact_name')>120) THEN e:=e||'"contact_name is required with contact_email and must be at most 120 characters"'::jsonb; END IF;
   IF n->>'contact_email' IS NOT NULL AND (char_length(n->>'contact_email')>254 OR n->>'contact_email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') THEN e:=e||'"Invalid contact_email"'::jsonb; END IF;
   IF n->>'tier' IS NOT NULL AND (n->>'tier' !~ '^[1-3]$') THEN e:=e||'"Tier must be 1, 2, or 3"'::jsonb; END IF;
   IF (SELECT count(*) FROM public.pilot_import_rows x WHERE x.batch_id=b.id AND lower(btrim(x.raw_payload->>'supplier_reference'))=lower(n->>'supplier_reference'))>1 THEN e:=e||'"Duplicate supplier_reference in file"'::jsonb; END IF;
   n:=n||jsonb_build_object('match',EXISTS(SELECT 1 FROM public.suppliers s WHERE s.organization_id=b.organization_id AND lower(btrim(s.external_reference))=lower(n->>'supplier_reference')));
  ELSIF b.import_type='product_materials' THEN
   n:=jsonb_build_object('product_sku',btrim(coalesce(r.raw_payload->>'product_sku','')),'material_name',btrim(coalesce(r.raw_payload->>'material_name','')),'composition_percentage',nullif(btrim(coalesce(r.raw_payload->>'composition_percentage','')),''),'certification_required',coalesce(nullif(lower(btrim(coalesce(r.raw_payload->>'certification_required',''))),''),'false') IN ('true','yes','1'),'certification_required_token',coalesce(nullif(lower(btrim(coalesce(r.raw_payload->>'certification_required',''))),''),'false'));
   IF n->>'product_sku'='' THEN e:=e||'"Required product_sku"'::jsonb; ELSIF NOT EXISTS(SELECT 1 FROM public.products p WHERE p.organization_id=b.organization_id AND lower(btrim(p.sku))=lower(n->>'product_sku')) THEN e:=e||to_jsonb('Unknown product_sku: '||(n->>'product_sku')); END IF;
   IF n->>'material_name'='' THEN e:=e||'"Required material_name"'::jsonb; END IF;
   IF n->>'certification_required_token' NOT IN ('true','false','yes','no','1','0') THEN e:=e||'"certification_required must be true or false"'::jsonb; END IF;
   IF n->>'composition_percentage' IS NULL THEN e:=e||'"Required composition_percentage"'::jsonb; v:=NULL; ELSE BEGIN v:=(n->>'composition_percentage')::numeric; IF v<=0 OR v>100 THEN e:=e||'"composition_percentage must be greater than 0 and at most 100"'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN e:=e||'"Invalid composition_percentage"'::jsonb; v:=NULL; END; END IF;
   IF (SELECT count(*) FROM public.pilot_import_rows x WHERE x.batch_id=b.id AND lower(btrim(x.raw_payload->>'product_sku'))=lower(n->>'product_sku') AND lower(btrim(x.raw_payload->>'material_name'))=lower(n->>'material_name'))>1 THEN e:=e||'"Duplicate material row in file"'::jsonb; END IF;
   IF EXISTS(SELECT 1 FROM public.product_materials pm JOIN public.products p ON p.id=pm.product_id WHERE p.organization_id=b.organization_id AND lower(btrim(p.sku))=lower(n->>'product_sku') AND lower(btrim(pm.material_name))=lower(n->>'material_name')) THEN e:=e||'"Material already exists for product"'::jsonb; END IF;
   IF v IS NOT NULL AND ((SELECT coalesce(sum(pm.composition_percentage),0) FROM public.product_materials pm JOIN public.products p ON p.id=pm.product_id WHERE p.organization_id=b.organization_id AND lower(btrim(p.sku))=lower(n->>'product_sku')) + (SELECT coalesce(sum(CASE WHEN (x.raw_payload->>'composition_percentage') ~ '^[0-9]+([.][0-9]+)?$' THEN (x.raw_payload->>'composition_percentage')::numeric ELSE 0 END),0) FROM public.pilot_import_rows x WHERE x.batch_id=b.id AND lower(btrim(x.raw_payload->>'product_sku'))=lower(n->>'product_sku'))) > 100 THEN e:=e||to_jsonb('Composition total for SKU '||(n->>'product_sku')||' exceeds 100%'); END IF;
  ELSE
   n:=jsonb_build_object('product_sku',btrim(coalesce(r.raw_payload->>'product_sku','')),'supplier_reference',btrim(coalesce(r.raw_payload->>'supplier_reference','')),'stage_name',btrim(coalesce(r.raw_payload->>'stage_name','')),'stage_order',nullif(btrim(coalesce(r.raw_payload->>'stage_order','')),''),'co2_impact_kg',nullif(btrim(coalesce(r.raw_payload->>'co2_impact_kg','')),''),'water_usage_l',nullif(btrim(coalesce(r.raw_payload->>'water_usage_l','')),''));
   IF NOT EXISTS(SELECT 1 FROM public.products p WHERE p.organization_id=b.organization_id AND lower(btrim(p.sku))=lower(n->>'product_sku')) THEN e:=e||to_jsonb('Unknown product_sku: '||(n->>'product_sku')); END IF;
   IF NOT EXISTS(SELECT 1 FROM public.suppliers s WHERE s.organization_id=b.organization_id AND lower(btrim(s.external_reference))=lower(n->>'supplier_reference')) THEN e:=e||to_jsonb('Unknown supplier_reference: '||(n->>'supplier_reference')); END IF;
   IF n->>'stage_name'='' THEN e:=e||'"Required stage_name"'::jsonb; END IF;
   IF n->>'stage_order' IS NULL THEN e:=e||'"Required stage_order"'::jsonb; ELSE BEGIN IF (n->>'stage_order')::int<=0 THEN e:=e||'"stage_order must be positive"'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN e:=e||'"Invalid stage_order"'::jsonb; END; END IF;
   IF (SELECT count(*) FROM public.pilot_import_rows x WHERE x.batch_id=b.id AND lower(btrim(x.raw_payload->>'product_sku'))=lower(n->>'product_sku') AND btrim(x.raw_payload->>'stage_order')=n->>'stage_order')>1 THEN e:=e||'"Duplicate lifecycle stage key in file"'::jsonb; END IF;
   IF EXISTS(SELECT 1 FROM public.lifecycle_stages ls JOIN public.products p ON p.id=ls.product_id WHERE ls.organization_id=b.organization_id AND p.organization_id=b.organization_id AND lower(btrim(p.sku))=lower(n->>'product_sku') AND ls.stage_order=CASE WHEN n->>'stage_order' ~ '^[0-9]+$' THEN (n->>'stage_order')::int END) THEN e:=e||'"Lifecycle stage already exists for product and stage_order"'::jsonb; END IF;
   BEGIN IF n->>'co2_impact_kg' IS NOT NULL AND (n->>'co2_impact_kg')::numeric<0 THEN e:=e||'"CO2 impact cannot be negative"'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN e:=e||'"Invalid CO2 impact"'::jsonb; END;
   BEGIN IF n->>'water_usage_l' IS NOT NULL AND (n->>'water_usage_l')::numeric<0 THEN e:=e||'"Water usage cannot be negative"'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN e:=e||'"Invalid water usage"'::jsonb; END;
  END IF;
  UPDATE public.pilot_import_rows SET normalized_payload=n,validation_errors=e,status=CASE WHEN jsonb_array_length(e)=0 THEN 'valid' ELSE 'invalid' END WHERE id=r.id;
 END LOOP;
 SELECT count(*) FILTER(WHERE status='valid'),count(*) FILTER(WHERE status='invalid') INTO good,bad FROM public.pilot_import_rows WHERE batch_id=b.id;
 UPDATE public.pilot_import_batches SET status=CASE WHEN bad=0 THEN 'validated' ELSE 'failed_validation' END,valid_row_count=good,invalid_row_count=bad,validated_at=now() WHERE id=b.id;
 IF bad>0 THEN UPDATE public.pilot_import_rows SET raw_payload=NULL,normalized_payload=NULL WHERE batch_id=b.id; END IF;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(b.organization_id,auth.uid(),'pilot_import_validated','pilot_import',b.id::text||':'||b.import_type||':'||good||':'||bad);
 RETURN jsonb_build_object('batch_id',b.id,'status',CASE WHEN bad=0 THEN 'validated' ELSE 'failed_validation' END,'row_count',good+bad,'valid_row_count',good,'invalid_row_count',bad);
END $$;

CREATE FUNCTION public.commit_pilot_import_batch(p_batch_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b public.pilot_import_batches; r record; created int:=0; matched int:=0; pid uuid; sid uuid;
BEGIN PERFORM pg_advisory_xact_lock(hashtextextended(p_batch_id::text,0)); b:=private.pilot_import_context(p_batch_id); SELECT * INTO b FROM public.pilot_import_batches WHERE id=b.id FOR UPDATE;
 PERFORM pg_advisory_xact_lock(hashtextextended('pilot-import-org:'||b.organization_id::text,0));
 PERFORM 1 FROM public.organizations o WHERE o.id=b.organization_id AND o.lifecycle_status='active' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'import not found or not authorized' USING ERRCODE='42501'; END IF;
 IF b.status='validated' THEN PERFORM public.validate_pilot_import_batch(b.id); SELECT * INTO b FROM public.pilot_import_batches WHERE id=b.id; END IF;
 IF b.status<>'validated' OR b.invalid_row_count<>0 THEN RAISE EXCEPTION 'batch is not valid for commit' USING ERRCODE='55000'; END IF;
 UPDATE public.pilot_import_batches SET status='committing' WHERE id=b.id;
 FOR r IN SELECT normalized_payload n,id FROM public.pilot_import_rows WHERE batch_id=b.id ORDER BY row_number LOOP
  IF b.import_type='products' THEN SELECT id INTO pid FROM public.products WHERE organization_id=b.organization_id AND lower(btrim(sku))=lower(r.n->>'sku'); IF FOUND THEN matched:=matched+1; ELSE INSERT INTO public.products(organization_id,name,sku,season,status) VALUES(b.organization_id,r.n->>'name',r.n->>'sku',r.n->>'season',r.n->>'status'); created:=created+1; END IF;
  ELSIF b.import_type='suppliers' THEN SELECT id INTO sid FROM public.suppliers WHERE organization_id=b.organization_id AND lower(btrim(external_reference))=lower(r.n->>'supplier_reference'); IF FOUND THEN matched:=matched+1; ELSE INSERT INTO public.suppliers(organization_id,external_reference,name,location,tier,contact_name) VALUES(b.organization_id,r.n->>'supplier_reference',r.n->>'name',r.n->>'location',(r.n->>'tier')::int,r.n->>'contact_name') RETURNING id INTO sid; IF r.n->>'contact_email' IS NOT NULL THEN PERFORM public.create_supplier_contact(sid,coalesce(r.n->>'contact_name',r.n->>'name'),r.n->>'contact_email'); END IF; created:=created+1; END IF;
  ELSIF b.import_type='product_materials' THEN SELECT id INTO pid FROM public.products WHERE organization_id=b.organization_id AND lower(btrim(sku))=lower(r.n->>'product_sku'); INSERT INTO public.product_materials(product_id,material_name,composition_percentage,certification_required) VALUES(pid,r.n->>'material_name',(r.n->>'composition_percentage')::numeric,(r.n->>'certification_required')::boolean); created:=created+1;
  ELSE SELECT id INTO pid FROM public.products WHERE organization_id=b.organization_id AND lower(btrim(sku))=lower(r.n->>'product_sku'); SELECT id INTO sid FROM public.suppliers WHERE organization_id=b.organization_id AND lower(btrim(external_reference))=lower(r.n->>'supplier_reference'); INSERT INTO public.lifecycle_stages(organization_id,product_id,supplier_id,stage_name,stage_order,co2_impact_kg,water_usage_l) VALUES(b.organization_id,pid,sid,r.n->>'stage_name',(r.n->>'stage_order')::int,(r.n->>'co2_impact_kg')::numeric,(r.n->>'water_usage_l')::numeric); created:=created+1;
  END IF; UPDATE public.pilot_import_rows SET status='committed' WHERE id=r.id;
 END LOOP;
 UPDATE public.pilot_import_batches SET status='completed',committed_at=now() WHERE id=b.id; UPDATE public.pilot_import_rows SET raw_payload=NULL,normalized_payload=NULL WHERE batch_id=b.id;
 INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(b.organization_id,auth.uid(),'pilot_import_completed','pilot_import',b.id::text||':'||b.import_type||':'||b.row_count);
 RETURN jsonb_build_object('batch_id',b.id,'status','completed','created_count',created,'matched_count',matched);
END $$;

CREATE FUNCTION public.cancel_pilot_import_batch(p_batch_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE b public.pilot_import_batches; BEGIN b:=private.pilot_import_context(p_batch_id); IF b.status IN ('completed','committing','cancelled') THEN RAISE EXCEPTION 'batch cannot be cancelled' USING ERRCODE='55000'; END IF; UPDATE public.pilot_import_batches SET status='cancelled' WHERE id=b.id; UPDATE public.pilot_import_rows SET raw_payload=NULL,normalized_payload=NULL WHERE batch_id=b.id; INSERT INTO public.audit_logs(organization_id,profile_id,action,entity_type,entity_name) VALUES(b.organization_id,auth.uid(),'pilot_import_cancelled','pilot_import',b.id::text||':'||b.import_type||':'||b.row_count); END $$;
CREATE FUNCTION public.get_pilot_import_batch(p_batch_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE b public.pilot_import_batches; BEGIN b:=private.pilot_import_context(p_batch_id); RETURN jsonb_build_object('batch_id',b.id,'import_type',b.import_type,'file_name',b.file_name,'status',b.status,'row_count',b.row_count,'valid_row_count',b.valid_row_count,'invalid_row_count',b.invalid_row_count,'rows',(SELECT coalesce(jsonb_agg(jsonb_build_object('row_number',r.row_number,'validation_errors',r.validation_errors,'status',r.status) ORDER BY r.row_number),'[]'::jsonb) FROM public.pilot_import_rows r WHERE r.batch_id=b.id)); END $$;

REVOKE ALL ON FUNCTION private.pilot_import_context(uuid),public.create_pilot_import_batch(text,text),public.stage_pilot_import_rows(uuid,jsonb),public.validate_pilot_import_batch(uuid),public.commit_pilot_import_batch(uuid),public.cancel_pilot_import_batch(uuid),public.get_pilot_import_batch(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_pilot_import_batch(text,text),public.stage_pilot_import_rows(uuid,jsonb),public.validate_pilot_import_batch(uuid),public.commit_pilot_import_batch(uuid),public.cancel_pilot_import_batch(uuid),public.get_pilot_import_batch(uuid) TO authenticated;
