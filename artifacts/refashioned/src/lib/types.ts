// UI code imports database row shapes from this compatibility module. The only
// Database definition is the Supabase CLI-generated database.types.ts file.
import type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";

export type Organization = Tables<"organizations">;
export type OrganizationInsert = TablesInsert<"organizations">;
export type OrganizationUpdate = TablesUpdate<"organizations">;
export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;
export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;
export type Supplier = Tables<"suppliers">;
export type SupplierInsert = TablesInsert<"suppliers">;
export type SupplierUpdate = TablesUpdate<"suppliers">;
export type LifecycleStage = Tables<"lifecycle_stages">;
export type LifecycleStageInsert = TablesInsert<"lifecycle_stages">;
export type LifecycleStageUpdate = TablesUpdate<"lifecycle_stages">;
export type DigitalProductPassport = Tables<"digital_product_passports">;
export type DigitalProductPassportInsert = TablesInsert<"digital_product_passports">;
export type DigitalProductPassportUpdate = TablesUpdate<"digital_product_passports">;
export type OrganizationMember = Tables<"organization_members">;
export type OrganizationMemberInsert = TablesInsert<"organization_members">;
export type OrganizationMemberUpdate = TablesUpdate<"organization_members">;
export type SupplierInvite = Tables<"supplier_invites">;
export type AuditLog = Tables<"audit_logs">;
export type AuditLogInsert = TablesInsert<"audit_logs">;

export type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";
export type { SupabaseClient } from "@supabase/supabase-js";
export type TypedSupabaseClient = import("@supabase/supabase-js").SupabaseClient<Database>;
