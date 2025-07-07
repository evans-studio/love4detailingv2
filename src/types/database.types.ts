// Auto-generated database types for Love4Detailing v2.0
// This file defines the complete database schema structure

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: 'customer' | 'admin' | 'staff' | 'super_admin'
          is_active: boolean
          email_verified_at: string | null
          last_login_at: string | null
          preferred_communication: string
          marketing_opt_in: boolean
          service_preferences: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role?: 'customer' | 'admin' | 'staff' | 'super_admin'
          is_active?: boolean
          email_verified_at?: string | null
          last_login_at?: string | null
          preferred_communication?: string
          marketing_opt_in?: boolean
          service_preferences?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'customer' | 'admin' | 'staff' | 'super_admin'
          is_active?: boolean
          email_verified_at?: string | null
          last_login_at?: string | null
          preferred_communication?: string
          marketing_opt_in?: boolean
          service_preferences?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          base_duration_minutes: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          base_duration_minutes?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          base_duration_minutes?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      service_pricing: {
        Row: {
          id: string
          service_id: string
          vehicle_size: 'small' | 'medium' | 'large' | 'extra_large'
          price_pence: number
          duration_minutes: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          vehicle_size: 'small' | 'medium' | 'large' | 'extra_large'
          price_pence: number
          duration_minutes: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          vehicle_size?: 'small' | 'medium' | 'large' | 'extra_large'
          price_pence?: number
          duration_minutes?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          user_id: string | null
          registration: string
          make: string
          model: string
          year: number | null
          color: string | null
          size: 'small' | 'medium' | 'large' | 'extra_large'
          vehicle_type: string | null
          special_requirements: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          registration: string
          make: string
          model: string
          year?: number | null
          color?: string | null
          size?: 'small' | 'medium' | 'large' | 'extra_large'
          vehicle_type?: string | null
          special_requirements?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          registration?: string
          make?: string
          model?: string
          year?: number | null
          color?: string | null
          size?: 'small' | 'medium' | 'large' | 'extra_large'
          vehicle_type?: string | null
          special_requirements?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_photos: {
        Row: {
          id: string
          vehicle_id: string
          photo_url: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          photo_url: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          photo_url?: string
          is_primary?: boolean
          created_at?: string
        }
      }
      vehicle_model_registry: {
        Row: {
          id: string
          make: string
          model: string
          default_size: 'small' | 'medium' | 'large' | 'extra_large'
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          make: string
          model: string
          default_size?: 'small' | 'medium' | 'large' | 'extra_large'
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          make?: string
          model?: string
          default_size?: 'small' | 'medium' | 'large' | 'extra_large'
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      available_slots: {
        Row: {
          id: string
          slot_date: string
          start_time: string
          end_time: string
          max_bookings: number
          current_bookings: number
          is_blocked: boolean
          block_reason: string | null
          template_id: string | null
          day_of_week: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slot_date: string
          start_time: string
          end_time: string
          max_bookings?: number
          current_bookings?: number
          is_blocked?: boolean
          block_reason?: string | null
          template_id?: string | null
          day_of_week?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slot_date?: string
          start_time?: string
          end_time?: string
          max_bookings?: number
          current_bookings?: number
          is_blocked?: boolean
          block_reason?: string | null
          template_id?: string | null
          day_of_week?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          booking_reference: string
          user_id: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          vehicle_id: string | null
          service_id: string
          slot_id: string
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
          payment_method: 'cash' | 'card' | 'bank_transfer' | 'loyalty_points' | null
          service_price_pence: number
          discount_pence: number
          total_price_pence: number
          confirmed_at: string | null
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          notes: string | null
          internal_notes: string | null
          customer_instructions: string | null
          estimated_duration_minutes: number | null
          actual_duration_minutes: number | null
          service_location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_reference: string
          user_id?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          vehicle_id?: string | null
          service_id: string
          slot_id: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          payment_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
          payment_method?: 'cash' | 'card' | 'bank_transfer' | 'loyalty_points' | null
          service_price_pence: number
          discount_pence?: number
          total_price_pence: number
          confirmed_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          notes?: string | null
          internal_notes?: string | null
          customer_instructions?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          service_location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_reference?: string
          user_id?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          vehicle_id?: string | null
          service_id?: string
          slot_id?: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          payment_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
          payment_method?: 'cash' | 'card' | 'bank_transfer' | 'loyalty_points' | null
          service_price_pence?: number
          discount_pence?: number
          total_price_pence?: number
          confirmed_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          notes?: string | null
          internal_notes?: string | null
          customer_instructions?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          service_location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customer_rewards: {
        Row: {
          id: string
          user_id: string | null
          customer_email: string
          total_points: number
          points_pending: number
          points_lifetime: number
          current_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_progress: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          customer_email: string
          total_points?: number
          points_pending?: number
          points_lifetime?: number
          current_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          customer_email?: string
          total_points?: number
          points_pending?: number
          points_lifetime?: number
          current_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_progress?: number
          created_at?: string
          updated_at?: string
        }
      }
      reward_transactions: {
        Row: {
          id: string
          customer_reward_id: string
          booking_id: string | null
          transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted'
          points_amount: number
          description: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_reward_id: string
          booking_id?: string | null
          transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted'
          points_amount: number
          description?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_reward_id?: string
          booking_id?: string | null
          transaction_type?: 'earned' | 'redeemed' | 'expired' | 'adjusted'
          points_amount?: number
          description?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      booking_locks: {
        Row: {
          id: string
          slot_id: string
          session_id: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          slot_id: string
          session_id: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          slot_id?: string
          session_id?: string
          expires_at?: string
          created_at?: string
        }
      }
      system_config: {
        Row: {
          id: string
          key: string
          value: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      schedule_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedule_slots: {
        Row: {
          id: string
          template_id: string
          day_of_week: number
          start_time: string
          end_time: string
          max_bookings: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          day_of_week: number
          start_time: string
          end_time: string
          max_bookings?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          max_bookings?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      booking_notes: {
        Row: {
          id: string
          booking_id: string
          author_id: string | null
          note_type: 'internal' | 'customer' | 'system'
          content: string
          is_visible_to_customer: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          author_id?: string | null
          note_type: 'internal' | 'customer' | 'system'
          content: string
          is_visible_to_customer?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          author_id?: string | null
          note_type?: 'internal' | 'customer' | 'system'
          content?: string
          is_visible_to_customer?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      api_rate_limits: {
        Row: {
          id: string
          identifier: string
          endpoint: string
          request_count: number
          window_start: string
          window_end: string
          is_blocked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          identifier: string
          endpoint: string
          request_count?: number
          window_start: string
          window_end: string
          is_blocked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          identifier?: string
          endpoint?: string
          request_count?: number
          window_start?: string
          window_end?: string
          is_blocked?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      booking_summaries: {
        Row: {
          id: string
          booking_reference: string
          customer_email: string
          customer_name: string
          customer_phone: string
          status: string
          payment_status: string
          payment_method: string | null
          total_price_pence: number
          confirmed_at: string | null
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          notes: string | null
          internal_notes: string | null
          customer_instructions: string | null
          estimated_duration_minutes: number | null
          actual_duration_minutes: number | null
          service_location: string | null
          created_at: string
          updated_at: string
          service_name: string
          service_code: string
          vehicle_registration: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_size: string | null
          vehicle_type: string | null
          slot_date: string
          start_time: string
          end_time: string
          template_id: string | null
          template_name: string | null
          user_full_name: string | null
          user_role: string | null
          note_count: number
        }
      }
      user_statistics: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: string
          is_active: boolean
          created_at: string
          last_login_at: string | null
          total_points: number
          current_tier: string
          total_bookings: number
          completed_bookings: number
          cancelled_bookings: number
          total_spent_pence: number
          last_service_date: string | null
          total_vehicles: number
        }
      }
    }
    Functions: {
      create_booking_transaction: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_service_id: string
          p_slot_id: string
          p_vehicle_id?: string
          p_user_id?: string
          p_payment_method?: string
        }
        Returns: {
          booking_id: string
          booking_reference: string
          total_price: number
        }[]
      }
      get_available_slots_for_date: {
        Args: {
          p_date: string
          p_service_id?: string
        }
        Returns: {
          slot_id: string
          slot_date: string
          start_time: string
          end_time: string
          available: boolean
          current_bookings: number
          max_bookings: number
        }[]
      }
      update_booking_status: {
        Args: {
          p_booking_id: string
          p_new_status: string
          p_reason?: string
        }
        Returns: {
          booking_id: string
          old_status: string
          new_status: string
          updated_at: string
        }[]
      }
      get_user_booking_history: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          booking_id: string
          booking_reference: string
          service_name: string
          vehicle_info: string
          slot_datetime: string
          status: string
          total_price_pence: number
          created_at: string
        }[]
      }
      cleanup_expired_locks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      calculate_reward_tier: {
        Args: {
          p_points: number
        }
        Returns: string
      }
      generate_slots_from_template: {
        Args: {
          template_id: string
          start_date: string
          end_date: string
        }
        Returns: number
      }
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
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_endpoint: string
          p_limit: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      booking_status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
      payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
      payment_method: 'cash' | 'card' | 'bank_transfer' | 'loyalty_points'
      user_role: 'customer' | 'admin' | 'staff' | 'super_admin'
      vehicle_size: 'small' | 'medium' | 'large' | 'extra_large'
      reward_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
      reward_transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted'
    }
  }
}

// Helper types for common database operations
export type BookingRow = Database['public']['Tables']['bookings']['Row']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export type ServiceRow = Database['public']['Tables']['services']['Row']
export type ServicePricingRow = Database['public']['Tables']['service_pricing']['Row']

export type VehicleRow = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']

export type UserRow = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type CustomerRewardRow = Database['public']['Tables']['customer_rewards']['Row']
export type RewardTransactionRow = Database['public']['Tables']['reward_transactions']['Row']

export type AvailableSlotRow = Database['public']['Tables']['available_slots']['Row']
export type BookingSummaryRow = Database['public']['Views']['booking_summaries']['Row']
export type UserStatisticsRow = Database['public']['Views']['user_statistics']['Row']

// New table types
export type ScheduleTemplateRow = Database['public']['Tables']['schedule_templates']['Row']
export type ScheduleTemplateInsert = Database['public']['Tables']['schedule_templates']['Insert']
export type ScheduleTemplateUpdate = Database['public']['Tables']['schedule_templates']['Update']

export type ScheduleSlotRow = Database['public']['Tables']['schedule_slots']['Row']
export type ScheduleSlotInsert = Database['public']['Tables']['schedule_slots']['Insert']
export type ScheduleSlotUpdate = Database['public']['Tables']['schedule_slots']['Update']

export type BookingNoteRow = Database['public']['Tables']['booking_notes']['Row']
export type BookingNoteInsert = Database['public']['Tables']['booking_notes']['Insert']
export type BookingNoteUpdate = Database['public']['Tables']['booking_notes']['Update']

export type ApiRateLimitRow = Database['public']['Tables']['api_rate_limits']['Row']
export type ApiRateLimitInsert = Database['public']['Tables']['api_rate_limits']['Insert']
export type ApiRateLimitUpdate = Database['public']['Tables']['api_rate_limits']['Update']

// Enum types for type safety
export type BookingStatus = Database['public']['Enums']['booking_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type UserRole = Database['public']['Enums']['user_role']
export type VehicleSize = Database['public']['Enums']['vehicle_size']
export type RewardTier = Database['public']['Enums']['reward_tier']
export type RewardTransactionType = Database['public']['Enums']['reward_transaction_type']
export type BookingNoteType = 'internal' | 'customer' | 'system'

// Enhanced business types for the guest-to-customer flow
export interface BookingDraft {
  serviceId?: string
  vehicleData?: {
    registration?: string
    make?: string
    model?: string
    year?: number
    color?: string
    size?: VehicleSize
    photos?: File[]
    specialNotes?: string
  }
  slotId?: string
  customerDetails?: {
    fullName?: string
    email?: string
    phone?: string
    serviceAddress?: string
  }
  pricing?: {
    basePrice: number
    addOns: number
    total: number
  }
  step: BookingStep
}

export type BookingStep = 
  | 'services'
  | 'pricing'
  | 'vehicle' 
  | 'schedule'
  | 'payment'
  | 'confirmation'

export interface BookingConfirmation {
  bookingId: string
  bookingReference: string
  serviceDetails: {
    name: string
    duration: number
    price: number
  }
  scheduledDateTime: string
  customerInstructions: string
}

export interface ServiceSummary {
  id: string
  name: string
  code: string
  description?: string
  duration: number
  basePrice: number
  vehicleSizePrice: number
}

export interface ScheduleTemplate {
  id: string
  name: string
  description?: string
  isActive: boolean
  slots: ScheduleSlotRow[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}