export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          created_at: string
          entity_name: string
          entity_type: string
          id: string
          organization_id: string
          profile_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_name: string
          entity_type: string
          id?: string
          organization_id: string
          profile_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_name?: string
          entity_type?: string
          id?: string
          organization_id?: string
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
          created_at: string
          created_by: string | null
          evidence_id: string
          expiry_date: string | null
          id: string
          name: string
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          supplier_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence_id: string
          expiry_date?: string | null
          id?: string
          name: string
          organization_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          supplier_id: string
          verification_status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence_id?: string
          expiry_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          supplier_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "certifications_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_published: boolean
          organization_id: string
          payload_generated_at: string | null
          payload_hash: string | null
          payload_version: number
          product_id: string
          public_payload: Json | null
          public_slug: string
          published_at: string | null
          published_certification_ids: string[]
          updated_at: string
        }
        Insert: {
          id?: string
          is_published?: boolean
          organization_id: string
          payload_generated_at?: string | null
          payload_hash?: string | null
          payload_version?: number
          product_id: string
          public_payload?: Json | null
          public_slug: string
          published_at?: string | null
          published_certification_ids?: string[]
          updated_at?: string
        }
        Update: {
          id?: string
          is_published?: boolean
          organization_id?: string
          payload_generated_at?: string | null
          payload_hash?: string | null
          payload_version?: number
          product_id?: string
          public_payload?: Json | null
          public_slug?: string
          published_at?: string | null
          published_certification_ids?: string[]
          updated_at?: string
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
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_uploads: {
        Row: {
          content_sha256: string | null
          created_at: string | null
          document_type: string | null
          id: string
          integrity_legacy_accepted: boolean
          legacy_migrated: boolean
          lifecycle_stage_id: string
          mime_type: string
          organization_id: string
          original_filename: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scan_completed_at: string | null
          scan_engine: string | null
          scan_result: string | null
          scan_started_at: string | null
          scan_status: string
          size_bytes: number
          status: string | null
          storage_bucket: string
          storage_path: string
          superseded_at: string | null
          superseded_by: string | null
          supplier_id: string
          updated_at: string
          upload_expires_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_sha256?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          integrity_legacy_accepted?: boolean
          legacy_migrated?: boolean
          lifecycle_stage_id: string
          mime_type: string
          organization_id: string
          original_filename: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_completed_at?: string | null
          scan_engine?: string | null
          scan_result?: string | null
          scan_started_at?: string | null
          scan_status?: string
          size_bytes: number
          status?: string | null
          storage_bucket?: string
          storage_path: string
          superseded_at?: string | null
          superseded_by?: string | null
          supplier_id: string
          updated_at?: string
          upload_expires_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_sha256?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          integrity_legacy_accepted?: boolean
          legacy_migrated?: boolean
          lifecycle_stage_id?: string
          mime_type?: string
          organization_id?: string
          original_filename?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_completed_at?: string | null
          scan_engine?: string | null
          scan_result?: string | null
          scan_started_at?: string | null
          scan_status?: string
          size_bytes?: number
          status?: string | null
          storage_bucket?: string
          storage_path?: string
          superseded_at?: string | null
          superseded_by?: string | null
          supplier_id?: string
          updated_at?: string
          upload_expires_at?: string | null
          uploaded_at?: string | null
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
            foreignKeyName: "evidence_uploads_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploads_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "evidence_uploads"
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
          co2_impact_kg: number | null
          flagged: boolean | null
          id: string
          organization_id: string
          product_id: string
          stage_name: string
          stage_order: number | null
          subtitle: string | null
          supplier_id: string | null
          water_usage_l: number | null
        }
        Insert: {
          co2_impact_kg?: number | null
          flagged?: boolean | null
          id?: string
          organization_id: string
          product_id: string
          stage_name: string
          stage_order?: number | null
          subtitle?: string | null
          supplier_id?: string | null
          water_usage_l?: number | null
        }
        Update: {
          co2_impact_kg?: number | null
          flagged?: boolean | null
          id?: string
          organization_id?: string
          product_id?: string
          stage_name?: string
          stage_order?: number | null
          subtitle?: string | null
          supplier_id?: string | null
          water_usage_l?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_stage_product_scope_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "lifecycle_stage_supplier_scope_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
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
      organization_member_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          organization_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          token_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_invites_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_invites_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string | null
          organization_id: string
          profile_id: string
          role: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          organization_id: string
          profile_id: string
          role: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          organization_id?: string
          profile_id?: string
          role?: string
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
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          lifecycle_changed_at: string
          lifecycle_status: Database["public"]["Enums"]["organization_lifecycle_status"]
          name: string
          plan: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifecycle_changed_at?: string
          lifecycle_status?: Database["public"]["Enums"]["organization_lifecycle_status"]
          name: string
          plan?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lifecycle_changed_at?: string
          lifecycle_status?: Database["public"]["Enums"]["organization_lifecycle_status"]
          name?: string
          plan?: string | null
        }
        Relationships: []
      }
      pilot_import_batches: {
        Row: {
          committed_at: string | null
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          import_type: string
          invalid_row_count: number
          organization_id: string
          row_count: number
          status: string
          valid_row_count: number
          validated_at: string | null
        }
        Insert: {
          committed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          import_type: string
          invalid_row_count?: number
          organization_id: string
          row_count?: number
          status?: string
          valid_row_count?: number
          validated_at?: string | null
        }
        Update: {
          committed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          import_type?: string
          invalid_row_count?: number
          organization_id?: string
          row_count?: number
          status?: string
          valid_row_count?: number
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_import_rows: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          normalized_payload: Json | null
          raw_payload: Json | null
          row_number: number
          status: string
          validation_errors: Json
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          normalized_payload?: Json | null
          raw_payload?: Json | null
          row_number: number
          status?: string
          validation_errors?: Json
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          normalized_payload?: Json | null
          raw_payload?: Json | null
          row_number?: number
          status?: string
          validation_errors?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pilot_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pilot_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_erasure_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          denial_reason: string | null
          denied_at: string | null
          id: string
          organization_id: string | null
          processing_started_at: string | null
          request_type: string
          requested_at: string
          requester_profile_id: string | null
          status: Database["public"]["Enums"]["privacy_erasure_status"]
          subject_profile_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_at?: string | null
          id?: string
          organization_id?: string | null
          processing_started_at?: string | null
          request_type?: string
          requested_at?: string
          requester_profile_id?: string | null
          status?: Database["public"]["Enums"]["privacy_erasure_status"]
          subject_profile_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_at?: string | null
          id?: string
          organization_id?: string | null
          processing_started_at?: string | null
          request_type?: string
          requested_at?: string
          requester_profile_id?: string | null
          status?: Database["public"]["Enums"]["privacy_erasure_status"]
          subject_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_erasure_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_erasure_requests_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_erasure_requests_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      supplier_access_memberships: {
        Row: {
          created_at: string
          id: string
          invitation_id: string | null
          legacy_migrated: boolean
          organization_id: string
          profile_id: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          supplier_contact_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id?: string | null
          legacy_migrated?: boolean
          organization_id: string
          profile_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          supplier_contact_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string | null
          legacy_migrated?: boolean
          organization_id?: string
          profile_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          supplier_contact_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_access_contact_scope_fkey"
            columns: ["supplier_contact_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_contacts"
            referencedColumns: ["id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_access_invitation_scope_fkey"
            columns: ["invitation_id", "supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "supplier_invites"
            referencedColumns: ["id", "supplier_id", "organization_id"]
          },
          {
            foreignKeyName: "supplier_access_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_access_memberships_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_access_supplier_scope_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          email: string
          id: string
          name: string | null
          supplier_id: string
        }
        Insert: {
          email: string
          id?: string
          name?: string | null
          supplier_id: string
        }
        Update: {
          email?: string
          id?: string
          name?: string | null
          supplier_id?: string
        }
        Relationships: [
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
          created_by: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          revoked_at: string | null
          status: string | null
          supplier_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          organization_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked_at?: string | null
          status?: string | null
          supplier_id: string
          token_hash: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked_at?: string | null
          status?: string | null
          supplier_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invites_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invites_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invites_supplier_scope_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string | null
          data_completeness: number | null
          external_reference: string | null
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
          external_reference?: string | null
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
          external_reference?: string | null
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
      build_public_product_passport_payload: {
        Args: { p_product_id: string }
        Returns: Json
      }
      cancel_evidence_upload_intent: {
        Args: { p_evidence_id: string }
        Returns: undefined
      }
      cancel_pilot_import_batch: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      commit_pilot_import_batch: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      create_certification_from_evidence: {
        Args: { p_evidence_id: string; p_expiry_date: string; p_name: string }
        Returns: string
      }
      create_evidence_upload_intent: {
        Args: {
          p_document_type: string
          p_lifecycle_stage_id: string
          p_mime_type: string
          p_original_filename: string
          p_size_bytes: number
        }
        Returns: {
          bucket_id: string
          evidence_id: string
          storage_path: string
          upload_expires_at: string
        }[]
      }
      create_organization_member_invite: {
        Args: { p_email: string; p_role: string }
        Returns: {
          email: string
          expires_at: string
          invite_id: string
          raw_token: string
          role: string
        }[]
      }
      create_organization_with_admin: {
        Args: { organization_name: string }
        Returns: string
      }
      create_pilot_import_batch: {
        Args: { p_file_name: string; p_import_type: string }
        Returns: string
      }
      create_supplier_contact: {
        Args: { p_email: string; p_name: string; p_supplier_id: string }
        Returns: string
      }
      create_supplier_invite: {
        Args: { p_email: string; p_supplier_id: string }
        Returns: {
          expires_at: string
          invitation_id: string
          token: string
        }[]
      }
      current_actor_can_read_evidence_object: {
        Args: { p_bucket: string; p_path: string }
        Returns: boolean
      }
      current_actor_can_upload_evidence: {
        Args: { p_lifecycle_stage_id: string }
        Returns: boolean
      }
      current_actor_is_active_supplier_for: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      delete_supplier_contact: {
        Args: { p_supplier_contact_id: string }
        Returns: undefined
      }
      finalize_evidence_upload: {
        Args: { p_evidence_id: string }
        Returns: undefined
      }
      get_evidence_download_target: {
        Args: { p_evidence_id: string }
        Returns: {
          bucket_id: string
          mime_type: string
          original_filename: string
          storage_path: string
        }[]
      }
      get_my_organization_evidence: {
        Args: { p_product_id?: string }
        Returns: {
          certification_expiry: string
          certification_id: string
          certification_name: string
          certification_status: string
          document_type: string
          evidence_id: string
          evidence_status: string
          lifecycle_stage_id: string
          original_filename: string
          rejection_reason: string
          reviewed_at: string
          reviewed_by: string
          scan_status: string
          uploaded_at: string
          uploaded_by: string
        }[]
      }
      get_my_supplier_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          organization_name: string
          supplier_name: string
        }[]
      }
      get_my_supplier_evidence_tasks: {
        Args: Record<PropertyKey, never>
        Returns: {
          document_requirement: string
          evidence_id: string
          evidence_status: string
          lifecycle_stage_id: string
          product_name: string
          rejection_reason: string
          scan_status: string
          stage_name: string
        }[]
      }
      get_organization_access_admin_view: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_organization_action_center: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_organization_member_invite_metadata: {
        Args: { p_token: string }
        Returns: {
          expiration: string
          invitation_state: string
          masked_email: string
          organization_name: string
          role: string
        }[]
      }
      get_organization_product_readiness: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_pilot_import_batch: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      get_product_passport_publication_state: {
        Args: { p_product_id: string }
        Returns: {
          current_payload_hash: string
          has_unpublished_changes: boolean
          is_published: boolean
          payload_generated_at: string
          public_slug: string
          published_at: string
          stored_payload_hash: string
        }[]
      }
      get_public_product_passport: {
        Args: { p_public_slug: string }
        Returns: Json
      }
      get_supplier_access_admin: {
        Args: { p_supplier_id: string }
        Returns: {
          access_state: string
          active_access_membership_id: string
          contact_email: string
          contact_name: string
          invitation_expires_at: string
          invitation_state: string
          pending_invitation_id: string
          supplier_contact_id: string
        }[]
      }
      get_supplier_invite_metadata: {
        Args: { p_token: string }
        Returns: {
          expiration: string
          invitation_state: string
          masked_email: string
          organization_name: string
          supplier_name: string
        }[]
      }
      has_org_role: {
        Args: { allowed_roles: string[]; target_organization_id: string }
        Returns: boolean
      }
      is_active_supplier_for: {
        Args: { p_profile_id: string; p_supplier_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      publish_product_passport: {
        Args: { p_product_id: string }
        Returns: {
          payload_generated_at: string
          payload_hash: string
          public_slug: string
          published_at: string
        }[]
      }
      record_evidence_scan_result: {
        Args: {
          p_content_sha256: string
          p_declared_mime: string
          p_detected_mime: string
          p_evidence_id: string
          p_scan_engine: string
          p_scan_result: string
          p_size_bytes: number
          p_storage_bucket: string
          p_storage_path: string
          p_verdict: string
        }
        Returns: undefined
      }
      redeem_organization_member_invite: {
        Args: { p_token: string }
        Returns: string
      }
      redeem_supplier_invite: {
        Args: { p_token: string }
        Returns: undefined
      }
      request_organization_deletion: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      request_personal_data_erasure: {
        Args: Record<PropertyKey, never>
        Returns: {
          completed_at: string | null
          created_at: string
          denial_reason: string | null
          denied_at: string | null
          id: string
          organization_id: string | null
          processing_started_at: string | null
          request_type: string
          requested_at: string
          requester_profile_id: string | null
          status: Database["public"]["Enums"]["privacy_erasure_status"]
          subject_profile_id: string | null
        }
      }
      review_evidence_upload: {
        Args: {
          p_decision: string
          p_evidence_id: string
          p_rejection_reason?: string
        }
        Returns: undefined
      }
      revoke_certification: {
        Args: { p_certification_id: string }
        Returns: undefined
      }
      revoke_organization_member_access: {
        Args: { p_member_id: string; p_reason: string }
        Returns: undefined
      }
      revoke_organization_member_invite: {
        Args: { p_invite_id: string; p_reason?: string }
        Returns: undefined
      }
      revoke_supplier_access: {
        Args: { p_access_membership_id: string; p_reason: string }
        Returns: undefined
      }
      revoke_supplier_invite: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      rotate_product_passport_slug: {
        Args: { p_product_id: string }
        Returns: string
      }
      service_complete_personal_identity_erasure: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      service_prepare_personal_identity_erasure: {
        Args: { p_profile_id: string }
        Returns: string
      }
      service_purge_terminal_invitation_personal_data: {
        Args: { p_cutoff: string }
        Returns: number
      }
      stage_pilot_import_rows: {
        Args: { p_batch_id: string; p_rows: Json }
        Returns: Json
      }
      supplier_identity_lock: {
        Args: { p_email: string; p_supplier_id: string }
        Returns: undefined
      }
      supplier_profile_identity_lock: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      unpublish_product_passport: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      update_organization_member_role: {
        Args: { p_member_id: string; p_new_role: string; p_reason: string }
        Returns: undefined
      }
      update_supplier_contact: {
        Args: { p_email: string; p_name: string; p_supplier_contact_id: string }
        Returns: undefined
      }
      validate_pilot_import_batch: {
        Args: { p_batch_id: string }
        Returns: Json
      }
    }
    Enums: {
      organization_lifecycle_status:
        | "active"
        | "deletion_requested"
        | "suspended"
        | "tombstoned"
      privacy_erasure_status:
        | "requested"
        | "processing"
        | "completed"
        | "denied"
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
    Enums: {
      organization_lifecycle_status: [
        "active",
        "deletion_requested",
        "suspended",
        "tombstoned",
      ],
      privacy_erasure_status: [
        "requested",
        "processing",
        "completed",
        "denied",
      ],
    },
  },
} as const

