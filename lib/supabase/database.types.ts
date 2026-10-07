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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_operations: {
        Row: {
          created_at: string
          fingerprint: string
          http_status: number | null
          operation_key: string
          organization_id: string
          response_json: string | null
          status: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          http_status?: number | null
          operation_key: string
          organization_id: string
          response_json?: string | null
          status: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          http_status?: number | null
          operation_key?: string
          organization_id?: string
          response_json?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_api_operations_organization_id"
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
          detail: string
          id: string
          organization_id: string
          target_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail: string
          id: string
          organization_id: string
          target_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string
          id?: string
          organization_id?: string
          target_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_logs_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audit_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_sources: {
        Row: {
          business_id: string
          can_export: boolean
          checked_at: string
          external_id: string
          id: string
          license: string
          organization_id: string
          provider: string
          source_url: string | null
        }
        Insert: {
          business_id: string
          can_export: boolean
          checked_at: string
          external_id: string
          id: string
          license: string
          organization_id: string
          provider: string
          source_url?: string | null
        }
        Update: {
          business_id?: string
          can_export?: boolean
          checked_at?: string
          external_id?: string
          id?: string
          license?: string
          organization_id?: string
          provider?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_business_sources_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_business_sources_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_name: string
          category: string
          created_at: string
          data_json: Json
          id: string
          last_checked_at: string | null
          lead_score: number
          location_id: string | null
          organization_id: string
          source: string
          updated_at: string
          website_status: string
        }
        Insert: {
          business_name: string
          category: string
          created_at?: string
          data_json: Json
          id: string
          last_checked_at?: string | null
          lead_score: number
          location_id?: string | null
          organization_id: string
          source: string
          updated_at?: string
          website_status: string
        }
        Update: {
          business_name?: string
          category?: string
          created_at?: string
          data_json?: Json
          id?: string
          last_checked_at?: string | null
          lead_score?: number
          location_id?: string | null
          organization_id?: string
          source?: string
          updated_at?: string
          website_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_businesses_location_id"
            columns: ["organization_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_businesses_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      caches: {
        Row: {
          expires_at: number
          key: string
          organization_id: string | null
          value_json: Json
        }
        Insert: {
          expires_at: number
          key: string
          organization_id?: string | null
          value_json: Json
        }
        Update: {
          expires_at?: number
          key?: string
          organization_id?: string | null
          value_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fk_caches_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          action: string
          amount: number
          created_at: string
          id: string
          organization_id: string
          reference_id: string | null
        }
        Insert: {
          action: string
          amount: number
          created_at?: string
          id: string
          organization_id: string
          reference_id?: string | null
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string
          id?: string
          organization_id?: string
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_credit_transactions_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          action: string
          business_id: string
          created_at: string
          detail: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          detail: string
          id: string
          organization_id: string
          user_id: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          detail?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_crm_activities_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_crm_activities_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crm_activities_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          id: string
          name: string
          organization_id: string
          position: number
        }
        Insert: {
          id: string
          name: string
          organization_id: string
          position: number
        }
        Update: {
          id?: string
          name?: string
          organization_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_crm_stages_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_presences: {
        Row: {
          business_id: string
          checked_at: string
          evidence_json: Json
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          business_id: string
          checked_at: string
          evidence_json: Json
          id: string
          organization_id: string
          status: string
        }
        Update: {
          business_id?: string
          checked_at?: string
          evidence_json?: Json
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_digital_presences_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_digital_presences_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_websites: {
        Row: {
          business_id: string
          business_name: string
          content_json: Json
          created_at: string
          engine: string
          id: string
          organization_id: string
          slug: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          business_id: string
          business_name: string
          content_json: Json
          created_at?: string
          engine: string
          id: string
          organization_id: string
          slug: string
          status: string
          updated_at?: string
          version?: number
        }
        Update: {
          business_id?: string
          business_name?: string
          content_json?: Json
          created_at?: string
          engine?: string
          id?: string
          organization_id?: string
          slug?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_generated_websites_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_generated_websites_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          error_code: string | null
          id: string
          kind: string
          locked_until: string | null
          organization_id: string
          payload_json: Json
          result_json: Json | null
          run_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_code?: string | null
          id: string
          kind: string
          locked_until?: string | null
          organization_id: string
          payload_json: Json
          result_json?: Json | null
          run_at: string
          status: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_code?: string | null
          id?: string
          kind?: string
          locked_until?: string | null
          organization_id?: string
          payload_json?: Json
          result_json?: Json | null
          run_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_jobs_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_lists_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tag_links: {
        Row: {
          lead_id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          lead_id: string
          organization_id: string
          tag_id: string
        }
        Update: {
          lead_id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_tag_links_lead_id"
            columns: ["organization_id", "lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_lead_tag_links_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lead_tag_links_tag_id"
            columns: ["organization_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "lead_tags"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          color: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          id: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_tags_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string
          created_at: string
          id: string
          list_id: string | null
          notes: string
          organization_id: string
          stage: string
          stage_id: string
          tags_json: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id: string
          list_id?: string | null
          notes?: string
          organization_id: string
          stage: string
          stage_id: string
          tags_json?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          list_id?: string | null
          notes?: string
          organization_id?: string
          stage?: string
          stage_id?: string
          tags_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_leads_list_id"
            columns: ["organization_id", "list_id"]
            isOneToOne: false
            referencedRelation: "lead_lists"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_leads_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_leads_stage_id"
            columns: ["organization_id", "stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string
          country: string
          id: string
          latitude: number
          longitude: number
          neighborhood: string | null
          organization_id: string
          postal_code: string | null
          state: string
        }
        Insert: {
          address?: string | null
          city: string
          country: string
          id: string
          latitude: number
          longitude: number
          neighborhood?: string | null
          organization_id: string
          postal_code?: string | null
          state: string
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          id?: string
          latitude?: number
          longitude?: number
          neighborhood?: string | null
          organization_id?: string
          postal_code?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_locations_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_memberships_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_memberships_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monitors: {
        Row: {
          created_at: string
          enabled: boolean
          filters_json: Json
          id: string
          interval_hours: number
          last_run_at: string | null
          name: string
          next_run_at: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          filters_json: Json
          id: string
          interval_hours?: number
          last_run_at?: string | null
          name: string
          next_run_at: string
          organization_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          filters_json?: Json
          id?: string
          interval_hours?: number
          last_run_at?: string | null
          name?: string
          next_run_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_monitors_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          credits: number
          id: string
          initialized: boolean
          name: string
          owner_id: string
          settings_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id: string
          initialized?: boolean
          name: string
          owner_id: string
          settings_json: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          initialized?: boolean
          name?: string
          owner_id?: string
          settings_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_owner_id"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          agency_name: string
          business_id: string
          business_name: string
          created_at: string
          delivery_days: number
          evidence_json: Json
          id: string
          organization_id: string
          price: number
          scope_json: Json
          status: string
          website_id: string | null
        }
        Insert: {
          agency_name: string
          business_id: string
          business_name: string
          created_at?: string
          delivery_days: number
          evidence_json: Json
          id: string
          organization_id: string
          price: number
          scope_json: Json
          status: string
          website_id?: string | null
        }
        Update: {
          agency_name?: string
          business_id?: string
          business_name?: string
          created_at?: string
          delivery_days?: number
          evidence_json?: Json
          id?: string
          organization_id?: string
          price?: number
          scope_json?: Json
          status?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_proposals_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_proposals_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_proposals_website_id"
            columns: ["organization_id", "website_id"]
            isOneToOne: false
            referencedRelation: "generated_websites"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      provider_usage: {
        Row: {
          created_at: string
          duration_ms: number
          estimated_cost: number | null
          id: string
          operation: string
          organization_id: string
          provider: string
          status: string
          units: number
        }
        Insert: {
          created_at?: string
          duration_ms: number
          estimated_cost?: number | null
          id: string
          operation: string
          organization_id: string
          provider: string
          status: string
          units: number
        }
        Update: {
          created_at?: string
          duration_ms?: number
          estimated_cost?: number | null
          id?: string
          operation?: string
          organization_id?: string
          provider?: string
          status?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_provider_usage_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          expires_at: number
          key: string
        }
        Insert: {
          count: number
          expires_at: number
          key: string
        }
        Update: {
          count?: number
          expires_at?: number
          key?: string
        }
        Relationships: []
      }
      sales_scripts: {
        Row: {
          business_id: string
          business_name: string
          channel: string
          content: string
          created_at: string
          engine: string
          id: string
          kind: string
          organization_id: string
        }
        Insert: {
          business_id: string
          business_name: string
          channel: string
          content: string
          created_at?: string
          engine: string
          id: string
          kind: string
          organization_id: string
        }
        Update: {
          business_id?: string
          business_name?: string
          channel?: string
          content?: string
          created_at?: string
          engine?: string
          id?: string
          kind?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_scripts_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_sales_scripts_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      search_results: {
        Row: {
          business_id: string
          id: string
          organization_id: string
          position: number
          search_id: string
        }
        Insert: {
          business_id: string
          id: string
          organization_id: string
          position: number
          search_id: string
        }
        Update: {
          business_id?: string
          id?: string
          organization_id?: string
          position?: number
          search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_search_results_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_search_results_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_search_results_search_id"
            columns: ["organization_id", "search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      searches: {
        Row: {
          cached: boolean
          center_json: Json
          created_at: string
          filters_json: Json
          id: string
          name: string
          organization_id: string
          provider: string
          result_count: number
          status: string
        }
        Insert: {
          cached?: boolean
          center_json: Json
          created_at?: string
          filters_json: Json
          id: string
          name: string
          organization_id: string
          provider: string
          result_count: number
          status: string
        }
        Update: {
          cached?: boolean
          center_json?: Json
          created_at?: string
          filters_json?: Json
          id?: string
          name?: string
          organization_id?: string
          provider?: string
          result_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_searches_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          period_end: string | null
          plan: string
          provider_reference: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id: string
          organization_id: string
          period_end?: string | null
          plan: string
          provider_reference?: string | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          period_end?: string | null
          plan?: string
          provider_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscriptions_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      website_analyses: {
        Row: {
          business_id: string
          created_at: string
          data_json: Json
          id: string
          mode: string
          organization_id: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          data_json: Json
          id: string
          mode: string
          organization_id: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          data_json?: Json
          id?: string
          mode?: string
          organization_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_website_analyses_business_id"
            columns: ["organization_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_website_analyses_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_versions: {
        Row: {
          change_note: string
          content_json: Json
          created_at: string
          id: string
          organization_id: string
          version: number
          website_id: string
        }
        Insert: {
          change_note: string
          content_json: Json
          created_at?: string
          id: string
          organization_id: string
          version: number
          website_id: string
        }
        Update: {
          change_note?: string
          content_json?: Json
          created_at?: string
          id?: string
          organization_id?: string
          version?: number
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_website_versions_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_website_versions_website_id"
            columns: ["organization_id", "website_id"]
            isOneToOne: false
            referencedRelation: "generated_websites"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
