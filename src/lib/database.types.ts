export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_name: string
          entity_type: string
          id: string
          organization_id: string | null
          profile_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_name: string
          entity_type: string
          id?: string
          organization_id?: string | null
          profile_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          organization_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          industry: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string
          name?: string
        }
        Relationships: []
      }
      certifications: {
        Row: {
          evidence_id: string | null
          expiry_date: string | null
          id: string
          name: string
          organization_id: string | null
          supplier_id: string | null
          verification_status: string | null
        }
        Insert: {
          evidence_id?: string | null
          expiry_date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          supplier_id?: string | null
          verification_status?: string | null
        }
        Update: {
          evidence_id?: string | null
          expiry_date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          supplier_id?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          created_at: string | null
          data_snapshot: Json | null
          id: string
          organization_id: string | null
          report_type: string
          report_year: number | null
        }
        Insert: {
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          organization_id?: string | null
          report_type: string
          report_year?: number | null
        }
        Update: {
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          organization_id?: string | null
          report_type?: string
          report_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_requests: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          organization_id: string | null
          request_type: string
          status: string | null
          supplier_id: string | null
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          request_type: string
          status?: string | null
          supplier_id?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          request_type?: string
          status?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_passports: {
        Row: {
          id: string
          is_published: boolean | null
          organization_id: string | null
          product_id: string | null
          public_slug: string
          published_at: string | null
        }
        Insert: {
          id?: string
          is_published?: boolean | null
          organization_id?: string | null
          product_id?: string | null
          public_slug: string
          published_at?: string | null
        }
        Update: {
          id?: string
          is_published?: boolean | null
          organization_id?: string | null
          product_id?: string | null
          public_slug?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_passports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_passports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_uploads: {
        Row: {
          created_at: string | null
          document_type: string | null
          file_url: string
          id: string
          lifecycle_stage_id: string | null
          organization_id: string | null
          status: string | null
          supplier_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          file_url: string
          id?: string
          lifecycle_stage_id?: string | null
          organization_id?: string | null
          status?: string | null
          supplier_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          file_url?: string
          id?: string
          lifecycle_stage_id?: string | null
          organization_id?: string | null
          status?: string | null
          supplier_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_uploads_lifecycle_stage_id_fkey"
            columns: ["lifecycle_stage_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_stages: {
        Row: {
          certificate_url: string | null
          co2_impact_kg: number | null
          flagged: boolean | null
          id: string
          organization_id: string | null
          product_id: string | null
          stage_name: string
          stage_order: number | null
          subtitle: string | null
          supplier_id: string | null
          water_usage_l: number | null
        }
        Insert: {
          certificate_url?: string | null
          co2_impact_kg?: number | null
          flagged?: boolean | null
          id?: string
          organization_id?: string | null
          product_id?: string | null
          stage_name: string
          stage_order?: number | null
          subtitle?: string | null
          supplier_id?: string | null
          water_usage_l?: number | null
        }
        Update: {
          certificate_url?: string | null
          co2_impact_kg?: number | null
          flagged?: boolean | null
          id?: string
          organization_id?: string | null
          product_id?: string | null
          stage_name?: string
          stage_order?: number | null
          subtitle?: string | null
          supplier_id?: string | null
          water_usage_l?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_stages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_stages_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string | null
          organization_id: string | null
          profile_id: string | null
          role: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
        }
        Relationships: []
      }
      product_materials: {
        Row: {
          certification_required: boolean | null
          composition_percentage: number | null
          id: string
          material_name: string
          product_id: string | null
        }
        Insert: {
          certification_required?: boolean | null
          composition_percentage?: number | null
          id?: string
          material_name: string
          product_id?: string | null
        }
        Update: {
          certification_required?: boolean | null
          composition_percentage?: number | null
          id?: string
          material_name?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
          season: string | null
          sku: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
          season?: string | null
          sku?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          season?: string | null
          sku?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      supplier_contacts: {
        Row: {
          email: string
          id: string
          name: string | null
          profile_id: string | null
          supplier_id: string | null
        }
        Insert: {
          email: string
          id?: string
          name?: string | null
          profile_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          name?: string | null
          profile_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invites: {
        Row: {
          created_at: string | null
          email: string
          id: string
          organization_id: string | null
          status: string | null
          supplier_id: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          organization_id?: string | null
          status?: string | null
          supplier_id?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          organization_id?: string | null
          status?: string | null
          supplier_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invites_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string | null
          data_completeness: number | null
          id: string
          last_activity: string | null
          location: string | null
          name: string
          organization_id: string | null
          stage: string | null
          status: string | null
          tier: number | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          data_completeness?: number | null
          id?: string
          last_activity?: string | null
          location?: string | null
          name: string
          organization_id?: string | null
          stage?: string | null
          status?: string | null
          tier?: number | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          data_completeness?: number | null
          id?: string
          last_activity?: string | null
          location?: string | null
          name?: string
          organization_id?: string | null
          stage?: string | null
          status?: string | null
          tier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          brand_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          role: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_user_orgs: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
