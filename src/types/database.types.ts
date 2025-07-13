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
          variables?: Json
          operationName?: string
          extensions?: Json
          query?: string
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
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          is_blocked: boolean | null
          request_count: number | null
          updated_at: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          is_blocked?: boolean | null
          request_count?: number | null
          updated_at?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          is_blocked?: boolean | null
          request_count?: number | null
          updated_at?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      available_slots: {
        Row: {
          block_reason: string | null
          created_at: string | null
          current_bookings: number | null
          day_of_week: number | null
          end_time: string
          id: string
          is_blocked: boolean | null
          max_bookings: number | null
          slot_date: string
          start_time: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          block_reason?: string | null
          created_at?: string | null
          current_bookings?: number | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_blocked?: boolean | null
          max_bookings?: number | null
          slot_date: string
          start_time: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          block_reason?: string | null
          created_at?: string | null
          current_bookings?: number | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_blocked?: boolean | null
          max_bookings?: number | null
          slot_date?: string
          start_time?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "available_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_locks: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          session_id: string
          slot_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          session_id: string
          slot_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          session_id?: string
          slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_locks_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "available_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_notes: {
        Row: {
          author_id: string | null
          booking_id: string | null
          content: string
          created_at: string | null
          id: string
          is_visible_to_customer: boolean | null
          note_type: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          booking_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_visible_to_customer?: boolean | null
          note_type: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          booking_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_visible_to_customer?: boolean | null
          note_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          actual_duration_minutes: number | null
          booking_reference: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_email: string
          customer_instructions: string | null
          customer_name: string
          customer_phone: string
          discount_pence: number | null
          estimated_duration_minutes: number | null
          id: string
          internal_notes: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          service_id: string | null
          service_location: string | null
          service_price_pence: number
          slot_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price_pence: number
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          booking_reference: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email: string
          customer_instructions?: string | null
          customer_name: string
          customer_phone: string
          discount_pence?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_id?: string | null
          service_location?: string | null
          service_price_pence: number
          slot_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price_pence: number
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          booking_reference?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string
          customer_instructions?: string | null
          customer_name?: string
          customer_phone?: string
          discount_pence?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_id?: string | null
          service_location?: string | null
          service_price_pence?: number
          slot_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price_pence?: number
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "available_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_rewards: {
        Row: {
          created_at: string | null
          current_tier: Database["public"]["Enums"]["reward_tier"] | null
          customer_email: string
          id: string
          points_lifetime: number | null
          points_pending: number | null
          tier_progress: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_tier?: Database["public"]["Enums"]["reward_tier"] | null
          customer_email: string
          id?: string
          points_lifetime?: number | null
          points_pending?: number | null
          tier_progress?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_tier?: Database["public"]["Enums"]["reward_tier"] | null
          customer_email?: string
          id?: string
          points_lifetime?: number | null
          points_pending?: number | null
          tier_progress?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reward_transactions: {
        Row: {
          booking_id: string | null
          created_at: string | null
          customer_reward_id: string | null
          description: string | null
          expires_at: string | null
          id: string
          points_amount: number
          transaction_type: Database["public"]["Enums"]["reward_transaction_type"]
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          customer_reward_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          points_amount: number
          transaction_type: Database["public"]["Enums"]["reward_transaction_type"]
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          customer_reward_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          points_amount?: number
          transaction_type?: Database["public"]["Enums"]["reward_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reward_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_transactions_customer_reward_id_fkey"
            columns: ["customer_reward_id"]
            isOneToOne: false
            referencedRelation: "customer_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_slots: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          max_bookings: number | null
          start_time: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          max_bookings?: number | null
          start_time: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          max_bookings?: number | null
          start_time?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          created_at: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          price_pence: number
          service_id: string | null
          updated_at: string | null
          vehicle_size: Database["public"]["Enums"]["vehicle_size"]
        }
        Insert: {
          created_at?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          price_pence: number
          service_id?: string | null
          updated_at?: string | null
          vehicle_size: Database["public"]["Enums"]["vehicle_size"]
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          price_pence?: number
          service_id?: string | null
          updated_at?: string | null
          vehicle_size?: Database["public"]["Enums"]["vehicle_size"]
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_duration_minutes: number
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_duration_minutes?: number
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_duration_minutes?: number
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          email_verified_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          marketing_opt_in: boolean | null
          phone: string | null
          preferred_communication: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          service_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_verified_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          marketing_opt_in?: boolean | null
          phone?: string | null
          preferred_communication?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          service_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_verified_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          marketing_opt_in?: boolean | null
          phone?: string | null
          preferred_communication?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          service_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicle_model_registry: {
        Row: {
          created_at: string | null
          default_size: Database["public"]["Enums"]["vehicle_size"]
          id: string
          make: string
          model: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          default_size?: Database["public"]["Enums"]["vehicle_size"]
          id?: string
          make: string
          model: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          default_size?: Database["public"]["Enums"]["vehicle_size"]
          id?: string
          make?: string
          model?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      vehicle_photos: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          photo_url: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          photo_url: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          photo_url?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          make: string
          model: string
          registration: string
          size: Database["public"]["Enums"]["vehicle_size"]
          special_requirements: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_type: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          make: string
          model: string
          registration: string
          size?: Database["public"]["Enums"]["vehicle_size"]
          special_requirements?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          make?: string
          model?: string
          registration?: string
          size?: Database["public"]["Enums"]["vehicle_size"]
          special_requirements?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      booking_summaries: {
        Row: {
          actual_duration_minutes: number | null
          booking_reference: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_instructions: string | null
          customer_name: string | null
          customer_phone: string | null
          end_time: string | null
          estimated_duration_minutes: number | null
          id: string | null
          internal_notes: string | null
          note_count: number | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          service_code: string | null
          service_location: string | null
          service_name: string | null
          slot_date: string | null
          start_time: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          template_id: string | null
          template_name: string | null
          total_price_pence: number | null
          updated_at: string | null
          user_full_name: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_registration: string | null
          vehicle_size: Database["public"]["Enums"]["vehicle_size"] | null
          vehicle_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "available_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_booking_note: {
        Args: {
          p_booking_id: string
          p_author_id: string
          p_note_type: string
          p_content: string
          p_visible_to_customer?: boolean
        }
        Returns: string
      }
      calculate_service_pricing: {
        Args: {
          p_service_id: string
          p_add_ons?: Json
          p_vehicle_size: Database["public"]["Enums"]["vehicle_size"]
        }
        Returns: {
          pricing_breakdown: Json
          duration_minutes: number
          total_price_pence: number
          add_on_price_pence: number
          base_price_pence: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_endpoint: string
          p_limit: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_booking_locks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_anonymous_booking: {
        Args: {
          p_full_name: string
          p_email: string
          p_phone: string
          p_time_slot_id: string
          p_vehicle_id: string
          p_service_type: string
          p_total_amount: number
        }
        Returns: Json
      }
      create_manual_booking: {
        Args: { p_booking_details: Json; p_admin_user_id: string }
        Returns: {
          booking_id: string
          booking_reference: string
          success: boolean
          message: string
          admin_note_id: string
        }[]
      }
      edit_existing_booking: {
        Args: {
          p_booking_id: string
          p_changes: Json
          p_admin_user_id: string
          p_reason?: string
        }
        Returns: {
          booking_id: string
          changes_applied: Json
          success: boolean
          message: string
          audit_note_id: string
        }[]
      }
      generate_booking_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_slots_from_template: {
        Args: { template_id: string; start_date: string; end_date: string }
        Returns: number
      }
      get_available_slots: {
        Args: {
          p_date_start: string
          p_date_end: string
          p_service_id?: string
        }
        Returns: {
          available_capacity: number
          slot_id: string
          slot_date: string
          start_time: string
          end_time: string
          max_capacity: number
          service_duration: number
        }[]
      }
      get_booking_analytics: {
        Args: { p_date_start: string; p_date_end: string; p_group_by?: string }
        Returns: {
          period_label: string
          total_bookings: number
          completed_bookings: number
          cancelled_bookings: number
          total_revenue_pence: number
          average_booking_value_pence: number
          capacity_utilization_percent: number
          top_service: Json
          customer_insights: Json
        }[]
      }
      get_customer_insights: {
        Args: { p_user_id?: string }
        Returns: {
          customer_id: string
          customer_email: string
          customer_name: string
          total_bookings: number
          completed_bookings: number
          total_spent_pence: number
          loyalty_tier: Database["public"]["Enums"]["reward_tier"]
          loyalty_points: number
          last_booking_date: string
          customer_lifetime_value: number
          risk_score: number
          booking_frequency_days: number
          preferred_services: Json
        }[]
      }
      get_customer_tier_benefits: {
        Args: { p_user_id: string }
        Returns: {
          points_to_next_tier: number
          current_tier: Database["public"]["Enums"]["reward_tier"]
          total_points: number
          tier_benefits: Json
          transaction_history: Json
        }[]
      }
      get_operational_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_customers: number
          active_bookings: number
          completion_rate: number
          average_service_duration: number
          capacity_utilization: Json
          customer_satisfaction: Json
          staff_efficiency: Json
        }[]
      }
      get_revenue_dashboard: {
        Args: { p_period?: string }
        Returns: {
          period_label: string
          total_revenue_pence: number
          booking_count: number
          average_booking_value_pence: number
          revenue_growth_percent: number
          top_performing_service: Json
          revenue_by_vehicle_size: Json
          monthly_trend: Json
        }[]
      }
      manage_service_catalog: {
        Args: {
          p_action: string
          p_service_data: Json
          p_admin_user_id: string
        }
        Returns: {
          service_id: string
          action_performed: string
          success: boolean
          message: string
          affected_pricing_records: number
        }[]
      }
      manage_working_hours: {
        Args: {
          p_day_of_week: number
          p_time_slots: Json
          p_template_id?: string
        }
        Returns: {
          slots_affected: number
          template_id: string
          day_configured: number
          success: boolean
          message: string
        }[]
      }
      process_booking_transaction: {
        Args: {
          p_customer_data: Json
          p_vehicle_data: Json
          p_booking_data: Json
        }
        Returns: {
          message: string
          booking_id: string
          booking_reference: string
          total_price_pence: number
          estimated_duration: number
          success: boolean
        }[]
      }
      update_customer_rewards: {
        Args: {
          p_transaction_type: Database["public"]["Enums"]["reward_transaction_type"]
          p_points_earned: number
          p_description?: string
          p_user_id: string
          p_booking_id?: string
        }
        Returns: {
          tier_upgraded: boolean
          new_tier: Database["public"]["Enums"]["reward_tier"]
          previous_tier: Database["public"]["Enums"]["reward_tier"]
          new_total_points: number
          reward_id: string
        }[]
      }
      update_pricing_matrix: {
        Args: { p_pricing_changes: Json; p_admin_user_id: string }
        Returns: {
          records_updated: number
          services_affected: number
          success: boolean
          message: string
          change_summary: Json
        }[]
      }
      update_schedule_availability: {
        Args: { p_template_id: string; p_date_overrides?: Json }
        Returns: {
          slots_created: number
          slots_updated: number
          date_range_start: string
          date_range_end: string
          success: boolean
          message: string
        }[]
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      payment_method: "cash" | "card" | "bank_transfer" | "loyalty_points"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      reward_tier: "bronze" | "silver" | "gold" | "platinum"
      reward_transaction_type: "earned" | "redeemed" | "expired" | "adjusted"
      user_role: "customer" | "admin" | "staff" | "super_admin"
      vehicle_size: "small" | "medium" | "large" | "extra_large"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      payment_method: ["cash", "card", "bank_transfer", "loyalty_points"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      reward_tier: ["bronze", "silver", "gold", "platinum"],
      reward_transaction_type: ["earned", "redeemed", "expired", "adjusted"],
      user_role: ["customer", "admin", "staff", "super_admin"],
      vehicle_size: ["small", "medium", "large", "extra_large"],
    },
  },
} as const

