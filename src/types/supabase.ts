export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: 'customer' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          user_id: string
          registration: string
          make: string | null
          model: string | null
          year: string | null
          color: string | null
          size_id: string | null
          dvla_data: Json | null
          photos: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          registration: string
          make?: string | null
          model?: string | null
          year?: string | null
          color?: string | null
          size_id?: string | null
          dvla_data?: Json | null
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          registration?: string
          make?: string | null
          model?: string | null
          year?: string | null
          color?: string | null
          size_id?: string | null
          dvla_data?: Json | null
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_sizes: {
        Row: {
          id: string
          label: string
          description: string | null
          price_pence: number
        }
        Insert: {
          id?: string
          label: string
          description?: string | null
          price_pence: number
        }
        Update: {
          id?: string
          label?: string
          description?: string | null
          price_pence?: number
        }
      }
      time_slots: {
        Row: {
          id: string
          slot_date: string
          slot_time: string
          is_booked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slot_date: string
          slot_time: string
          is_booked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slot_date?: string
          slot_time?: string
          is_booked?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string | null
          vehicle_id: string | null
          time_slot_id: string
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method: string
          total_price_pence: number
          booking_reference: string | null
          email: string | null
          full_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          vehicle_id?: string | null
          time_slot_id: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method?: string
          total_price_pence: number
          booking_reference?: string | null
          email?: string | null
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          vehicle_id?: string | null
          time_slot_id?: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method?: string
          total_price_pence?: number
          booking_reference?: string | null
          email?: string | null
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      missing_vehicle_models: {
        Row: {
          id: string
          make: string | null
          model: string | null
          registration: string | null
          created_at: string
        }
        Insert: {
          id?: string
          make?: string | null
          model?: string | null
          registration?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          make?: string | null
          model?: string | null
          registration?: string | null
          created_at?: string
        }
      }
      rewards: {
        Row: {
          id: string
          user_id: string
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          created_at?: string
          updated_at?: string
        }
      }
      reward_transactions: {
        Row: {
          id: string
          user_id: string
          booking_id: string | null
          points: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          booking_id?: string | null
          points: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          booking_id?: string | null
          points?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_notes: {
        Row: {
          id: string
          booking_id: string
          note: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          note: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          note?: string
          created_at?: string
          updated_at?: string
        }
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
  }
} 