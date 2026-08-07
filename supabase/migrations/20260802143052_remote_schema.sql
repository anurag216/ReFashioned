-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.get_auth_user_orgs()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid();
$function$;

GRANT ALL ON FUNCTION public.get_auth_user_orgs() TO anon;

GRANT ALL ON FUNCTION public.get_auth_user_orgs() TO authenticated;

GRANT ALL ON FUNCTION public.get_auth_user_orgs() TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE TABLE public.audit_events (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  actor_id        uuid,
  action          text                     NOT NULL,
  entity_type     text                     NOT NULL,
  entity_id       uuid,
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_events
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);

GRANT ALL ON public.audit_events TO anon;

GRANT ALL ON public.audit_events TO authenticated;

GRANT ALL ON public.audit_events TO service_role;

CREATE TABLE public.audit_logs (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid,
  profile_id      uuid,
  action          text                     NOT NULL,
  entity_type     text                     NOT NULL,
  entity_name     text                     NOT NULL,
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_logs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

GRANT ALL ON public.audit_logs TO anon;

GRANT ALL ON public.audit_logs TO authenticated;

GRANT ALL ON public.audit_logs TO service_role;

CREATE TABLE public.brands (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  name       text                     NOT NULL,
  industry   text                     NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.brands
  ADD CONSTRAINT brands_pkey PRIMARY KEY (id);

GRANT ALL ON public.brands TO anon;

GRANT ALL ON public.brands TO authenticated;

GRANT ALL ON public.brands TO service_role;

CREATE TABLE public.certifications (
  id                  uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id     uuid,
  supplier_id         uuid,
  evidence_id         uuid,
  name                text NOT NULL,
  expiry_date         date,
  verification_status text DEFAULT 'unverified'::text
);

ALTER TABLE public.certifications
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);

GRANT ALL ON public.certifications TO anon;

GRANT ALL ON public.certifications TO authenticated;

GRANT ALL ON public.certifications TO service_role;

CREATE TABLE public.compliance_reports (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  report_type     text                     NOT NULL,
  report_year     integer,
  data_snapshot   jsonb,
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.compliance_reports
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.compliance_reports
  ADD CONSTRAINT compliance_reports_pkey PRIMARY KEY (id);

GRANT ALL ON public.compliance_reports TO anon;

GRANT ALL ON public.compliance_reports TO authenticated;

GRANT ALL ON public.compliance_reports TO service_role;

CREATE TABLE public.data_requests (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  supplier_id     uuid,
  request_type    text                     NOT NULL,
  status          text                     DEFAULT 'open'::text,
  due_date        date,
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.data_requests
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.data_requests
  ADD CONSTRAINT data_requests_pkey PRIMARY KEY (id);

GRANT ALL ON public.data_requests TO anon;

GRANT ALL ON public.data_requests TO authenticated;

GRANT ALL ON public.data_requests TO service_role;

CREATE TABLE public.digital_product_passports (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  product_id      uuid,
  public_slug     text                     NOT NULL,
  is_published    boolean                  DEFAULT false,
  published_at    timestamp with time zone
);

ALTER TABLE public.digital_product_passports
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.digital_product_passports
  ADD CONSTRAINT digital_product_passports_pkey PRIMARY KEY (id);

ALTER TABLE public.digital_product_passports
  ADD CONSTRAINT digital_product_passports_public_slug_key UNIQUE (public_slug);

GRANT ALL ON public.digital_product_passports TO anon;

GRANT ALL ON public.digital_product_passports TO authenticated;

GRANT ALL ON public.digital_product_passports TO service_role;

CREATE POLICY "Published DPPs are public" ON public.digital_product_passports
  FOR SELECT
  USING ((is_published = true));

CREATE TABLE public.evidence_uploads (
  id                 uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id    uuid,
  supplier_id        uuid,
  lifecycle_stage_id uuid,
  file_url           text                     NOT NULL,
  document_type      text,
  status             text                     DEFAULT 'pending_review'::text,
  uploaded_by        uuid,
  created_at         timestamp with time zone DEFAULT now()
);

ALTER TABLE public.evidence_uploads
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.evidence_uploads
  ADD CONSTRAINT evidence_uploads_pkey PRIMARY KEY (id);

ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence_uploads(id);

GRANT ALL ON public.evidence_uploads TO anon;

GRANT ALL ON public.evidence_uploads TO authenticated;

GRANT ALL ON public.evidence_uploads TO service_role;

CREATE TABLE public.lifecycle_stages (
  id              uuid    DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  product_id      uuid,
  supplier_id     uuid,
  stage_name      text    NOT NULL,
  subtitle        text,
  stage_order     integer,
  co2_impact_kg   numeric,
  water_usage_l   numeric,
  flagged         boolean DEFAULT false,
  certificate_url text
);

ALTER TABLE public.lifecycle_stages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lifecycle_stages
  ADD CONSTRAINT lifecycle_stages_pkey PRIMARY KEY (id);

ALTER TABLE public.evidence_uploads
  ADD CONSTRAINT evidence_uploads_lifecycle_stage_id_fkey FOREIGN KEY (lifecycle_stage_id) REFERENCES public.lifecycle_stages(id);

GRANT ALL ON public.lifecycle_stages TO anon;

GRANT ALL ON public.lifecycle_stages TO authenticated;

GRANT ALL ON public.lifecycle_stages TO service_role;

CREATE TABLE public.organization_members (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  profile_id      uuid,
  role            text                     DEFAULT 'admin'::text,
  joined_at       timestamp with time zone DEFAULT now()
);

CREATE POLICY "Users can insert audit logs for their org" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Users can view their org's audit logs" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can delete lifecycle_stages" ON public.lifecycle_stages
  FOR DELETE
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can insert lifecycle_stages" ON public.lifecycle_stages
  FOR INSERT
  WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can update lifecycle_stages" ON public.lifecycle_stages
  FOR UPDATE
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can view their lifecycle stages" ON public.lifecycle_stages
  FOR SELECT
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

ALTER TABLE public.organization_members
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_organization_id_profile_id_key UNIQUE (organization_id, profile_id);

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);

GRANT ALL ON public.organization_members TO anon;

GRANT ALL ON public.organization_members TO authenticated;

GRANT ALL ON public.organization_members TO service_role;

CREATE POLICY "Users can insert membership" ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (((profile_id = auth.uid()) OR (organization_id IN ( SELECT public.get_auth_user_orgs() AS get_auth_user_orgs))));

CREATE POLICY "Users can link themselves to an org" ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = profile_id));

CREATE POLICY "Users can read own membership" ON public.organization_members
  FOR SELECT
  USING ((auth.uid() = profile_id));

CREATE POLICY "Users can view org members" ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (((profile_id = auth.uid()) OR (organization_id IN ( SELECT public.get_auth_user_orgs() AS get_auth_user_orgs))));

CREATE TABLE public.organizations (
  id         uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  name       text                     NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  plan       text                     DEFAULT 'starter'::text
);

ALTER TABLE public.organizations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.compliance_reports
  ADD CONSTRAINT compliance_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.data_requests
  ADD CONSTRAINT data_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.digital_product_passports
  ADD CONSTRAINT digital_product_passports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.evidence_uploads
  ADD CONSTRAINT evidence_uploads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.lifecycle_stages
  ADD CONSTRAINT lifecycle_stages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

GRANT ALL ON public.organizations TO anon;

GRANT ALL ON public.organizations TO authenticated;

GRANT ALL ON public.organizations TO service_role;

CREATE POLICY "Admins can update their organization" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING ((id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.profile_id = auth.uid()) AND (organization_members.role = 'admin'::text)))));

CREATE POLICY "Authenticated users can insert organizations" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Brand members can view their organization" ON public.organizations
  FOR SELECT
  USING ((id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Users can create an organization" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (((id IN ( SELECT public.get_auth_user_orgs() AS get_auth_user_orgs)) OR (NOT (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE (organization_members.organization_id = organizations.id))))));

CREATE TABLE public.product_materials (
  id                     uuid    DEFAULT extensions.uuid_generate_v4() NOT NULL,
  product_id             uuid,
  material_name          text    NOT NULL,
  composition_percentage numeric,
  certification_required boolean DEFAULT false
);

ALTER TABLE public.product_materials
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_materials
  ADD CONSTRAINT product_materials_pkey PRIMARY KEY (id);

GRANT ALL ON public.product_materials TO anon;

GRANT ALL ON public.product_materials TO authenticated;

GRANT ALL ON public.product_materials TO service_role;

CREATE TABLE public.products (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  name            text                     NOT NULL,
  sku             text,
  season          text,
  status          text                     DEFAULT 'draft'::text,
  created_at      timestamp with time zone DEFAULT now()
);

CREATE POLICY "Public can view published stages" ON public.lifecycle_stages
  FOR SELECT
  USING ((product_id IN ( SELECT products.id
   FROM public.products
  WHERE (products.status = 'published'::text))));

ALTER TABLE public.products
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products
  ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.products
  ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE public.digital_product_passports
  ADD CONSTRAINT digital_product_passports_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.lifecycle_stages
  ADD CONSTRAINT lifecycle_stages_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.product_materials
  ADD CONSTRAINT product_materials_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

GRANT ALL ON public.products TO anon;

GRANT ALL ON public.products TO authenticated;

GRANT ALL ON public.products TO service_role;

CREATE POLICY "Brand members can delete products" ON public.products
  FOR DELETE
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can insert products" ON public.products
  FOR INSERT
  WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can update products" ON public.products
  FOR UPDATE
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can view their products" ON public.products
  FOR SELECT
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Public can view published products" ON public.products
  FOR SELECT
  USING ((status = 'published'::text));

CREATE TABLE public.profiles (
  id         uuid                     NOT NULL,
  email      text                     NOT NULL,
  full_name  text,
  role       text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id);

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.evidence_uploads
  ADD CONSTRAINT evidence_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['brand_admin'::text, 'sustainability_manager'::text, 'supplier_user'::text, 'auditor'::text]));

GRANT ALL ON public.profiles TO anon;

GRANT ALL ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Users can manage their own profile" ON public.profiles
  TO authenticated
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

CREATE TABLE public.supplier_contacts (
  id          uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  supplier_id uuid,
  name        text,
  email       text NOT NULL,
  profile_id  uuid
);

ALTER TABLE public.supplier_contacts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.supplier_contacts
  ADD CONSTRAINT supplier_contacts_pkey PRIMARY KEY (id);

ALTER TABLE public.supplier_contacts
  ADD CONSTRAINT supplier_contacts_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);

GRANT ALL ON public.supplier_contacts TO anon;

GRANT ALL ON public.supplier_contacts TO authenticated;

GRANT ALL ON public.supplier_contacts TO service_role;

CREATE TABLE public.supplier_invites (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id uuid,
  supplier_id     uuid,
  email           text                     NOT NULL,
  token           text                     NOT NULL,
  status          text                     DEFAULT 'sent'::text,
  created_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.supplier_invites
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.supplier_invites
  ADD CONSTRAINT supplier_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_invites
  ADD CONSTRAINT supplier_invites_pkey PRIMARY KEY (id);

ALTER TABLE public.supplier_invites
  ADD CONSTRAINT supplier_invites_token_key UNIQUE (token);

GRANT ALL ON public.supplier_invites TO anon;

GRANT ALL ON public.supplier_invites TO authenticated;

GRANT ALL ON public.supplier_invites TO service_role;

CREATE POLICY "Brand members can manage invites" ON public.supplier_invites
  TO authenticated
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Public can read invite by token" ON public.supplier_invites
  FOR SELECT
  USING (true);

CREATE TABLE public.suppliers (
  id                uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  organization_id   uuid,
  name              text                     NOT NULL,
  location          text,
  tier              integer,
  status            text                     DEFAULT 'pending'::text,
  data_completeness integer                  DEFAULT 0,
  created_at        timestamp with time zone DEFAULT now(),
  contact_name      text,
  stage             text                     DEFAULT 'Onboarding'::text,
  last_activity     timestamp with time zone DEFAULT now()
);

ALTER TABLE public.suppliers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);

ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE public.data_requests
  ADD CONSTRAINT data_requests_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE public.evidence_uploads
  ADD CONSTRAINT evidence_uploads_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE public.lifecycle_stages
  ADD CONSTRAINT lifecycle_stages_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE public.supplier_contacts
  ADD CONSTRAINT supplier_contacts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_invites
  ADD CONSTRAINT supplier_invites_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

GRANT ALL ON public.suppliers TO anon;

GRANT ALL ON public.suppliers TO authenticated;

GRANT ALL ON public.suppliers TO service_role;

CREATE POLICY "Brand members can delete suppliers" ON public.suppliers
  FOR DELETE
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can insert suppliers" ON public.suppliers
  FOR INSERT
  WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can update suppliers" ON public.suppliers
  FOR UPDATE
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Brand members can view their suppliers" ON public.suppliers
  FOR SELECT
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.profile_id = auth.uid()))));

CREATE POLICY "Public can view suppliers for published products" ON public.suppliers
  FOR SELECT
  USING ((id IN ( SELECT lifecycle_stages.supplier_id
   FROM public.lifecycle_stages
  WHERE (lifecycle_stages.product_id IN ( SELECT products.id
           FROM public.products
          WHERE (products.status = 'published'::text))))));

CREATE TABLE public.users (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  brand_id   uuid,
  first_name text                     NOT NULL,
  last_name  text                     NOT NULL,
  role       text                     NOT NULL,
  email      text                     NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users
  ADD CONSTRAINT users_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

GRANT ALL ON public.users TO anon;

GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.users TO service_role;

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
