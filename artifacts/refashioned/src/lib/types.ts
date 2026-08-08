// ─── Row types (match Supabase table columns exactly) ─────────────────────────

export interface Organization {
  [key: string]: unknown;
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "growth" | "enterprise";
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  hq_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  [key: string]: unknown;
  id: string;               // references auth.users.id
  organization_id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "manager" | "viewer";
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  [key: string]: unknown;
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  season: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export interface SupplierInvite {
  [key: string]: unknown;
  id: string;
  organization_id: string;
  supplier_name: string;
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
}

export interface OrganizationMember {
  [key: string]: unknown;
  id: string;
  organization_id: string;
  profile_id: string;           // references auth.users.id
  role: "admin" | "manager" | "viewer";
  joined_at: string;
  created_at: string;
}

export type OrganizationMemberInsert = Omit<OrganizationMember, "id" | "created_at" | "joined_at"> & {
  joined_at?: string;
};
export type OrganizationMemberUpdate = Partial<OrganizationMemberInsert>;

export interface Supplier {
  [key: string]: unknown;
  id: string;
  organization_id: string;
  name: string;
  tier: 1 | 2 | 3;
  country: string | null;
  city: string | null;
  status: "active" | "inactive" | "under_review";
  data_completeness: number | null;   // 0–100
  certifications: string[];
  contact_name: string | null;
  contact_email: string | null;
  audit_date: string | null;
  next_audit_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LifecycleStage {
  [key: string]: unknown;
  id: string;
  product_id: string;
  organization_id: string;
  supplier_id: string | null;
  stage_name: string;          // e.g. "sourcing" | "spinning" | "logistics" | "use" | "end_of_life"
  stage_order: number;
  subtitle: string | null;
  location: string | null;
  description: string | null;
  co2_impact_kg: number | null;
  water_usage_l: number | null;
  certification: string | null;
  certification_status: "verified" | "pending" | "expired" | null;
  certificate_url: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DigitalProductPassport {
  [key: string]: unknown;
  id: string;
  product_id: string;
  organization_id: string;
  status: "draft" | "published" | "archived";
  compliance_status: "compliant" | "non_compliant" | "pending";
  qr_code_url: string | null;
  public_url: string | null;
  total_co2_kg: number | null;
  total_water_l: number | null;
  circularity_score: number | null;  // 0–100
  recycled_content_pct: number | null;
  certifications: string[];
  espr_regulation_ref: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Insert types (omit server-generated fields) ───────────────────────────────

export type OrganizationInsert = Omit<Organization, "id" | "created_at" | "updated_at">;
export type ProfileInsert      = Omit<Profile,       "created_at" | "updated_at">;
export type ProductInsert      = Omit<Product,       "id" | "created_at" | "updated_at">;
export type SupplierInsert     = Omit<Supplier,      "id" | "created_at" | "updated_at">;
export type LifecycleStageInsert        = Omit<LifecycleStage,        "id" | "created_at" | "updated_at">;
export type DigitalProductPassportInsert = Omit<DigitalProductPassport, "id" | "created_at" | "updated_at">;

// ─── Update types (all fields optional except the PK) ─────────────────────────

export type OrganizationUpdate = Partial<OrganizationInsert>;
export type ProfileUpdate      = Partial<Omit<ProfileInsert, "id">>;
export type ProductUpdate      = Partial<ProductInsert>;
export type SupplierUpdate     = Partial<SupplierInsert>;
export type LifecycleStageUpdate         = Partial<LifecycleStageInsert>;
export type DigitalProductPassportUpdate = Partial<DigitalProductPassportInsert>;

// ─── Supabase Database generic ────────────────────────────────────────────────
// Pass this to createClient<Database>() in supabaseClient.ts so that
// supabase.from("products") is fully typed without manual casts.

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row:           Organization;
        Insert:        OrganizationInsert;
        Update:        OrganizationUpdate;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Relationships: any[];
      };
      profiles: {
        Row:           Profile;
        Insert:        ProfileInsert;
        Update:        ProfileUpdate;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Relationships: any[];
      };
      products: {
        Row:           Product;
        Insert:        ProductInsert;
        Update:        ProductUpdate;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Relationships: any[];
      };
      suppliers: {
        Row:           Supplier;
        Insert:        SupplierInsert;
        Update:        SupplierUpdate;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Relationships: any[];
      };
      lifecycle_stages: {
        Row:           LifecycleStage;
        Insert:        LifecycleStageInsert;
        Update:        LifecycleStageUpdate;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Relationships: any[];
      };
      digital_product_passports: {
        Row:           DigitalProductPassport;
        Insert:        DigitalProductPassportInsert;
        Update:        DigitalProductPassportUpdate;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Relationships: any[];
      };
      organization_members: {
        Row:           OrganizationMember;
        Insert:        OrganizationMemberInsert;
        Update:        OrganizationMemberUpdate;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Relationships: any[];
      };
    };
    Views:     Record<string, never>;
    Functions: {
      create_organization_with_admin: {
        Args: { organization_name: string };
        Returns: string;
      };
      has_org_role: {
        Args: { target_organization_id: string; allowed_roles: string[] };
        Returns: boolean;
      };
      is_org_member: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      product_status:   "draft" | "in_review" | "published" | "archived";
      supplier_status:  "active" | "inactive" | "under_review";
      dpp_status:       "draft" | "published" | "archived";
      compliance_status: "compliant" | "non_compliant" | "pending";
      user_role:        "admin" | "manager" | "viewer";
      org_plan:         "starter" | "growth" | "enterprise";
    };
  };
};

export interface AuditLog {
  id: string;
  organization_id: string;
  profile_id: string;
  action: string;
  entity_type: string;
  entity_name: string;
  created_at: string;
}

export type AuditLogInsert = Omit<AuditLog, "id" | "created_at">;

// ─── Convenience re-exports ───────────────────────────────────────────────────
// Import from here rather than from @supabase/supabase-js directly.

export type { SupabaseClient } from "@supabase/supabase-js";
export type TypedSupabaseClient = import("@supabase/supabase-js").SupabaseClient<Database>;
