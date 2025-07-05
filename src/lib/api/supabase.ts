import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from '@/types/supabase';

// For client-side operations
export const supabase = createClientComponentClient<SupabaseDatabase>();

// For server-side operations with admin privileges
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient<SupabaseDatabase>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// For server-side operations (non-admin)
export const createServerClient = () =>
  createClient<SupabaseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Helper to check if we're connected to production
export async function validateConnection() {
  try {
  if (!supabaseAdmin) {
      throw new Error('Supabase admin client is not initialized');
  }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    if (error) throw error;

    console.log(`✅ Connected to Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`Total users in DB: ${data?.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }
}

// Type definitions for Supabase tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      vehicles: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          registration: string;
          make: string;
          model: string;
          year: number;
          size: 'small' | 'medium' | 'large' | 'xl';
          color?: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      time_slots: {
        Row: {
          id: string;
          created_at: string;
          slot_date: string;
          slot_time: string;
          is_available: boolean;
        };
        Insert: Omit<Database['public']['Tables']['time_slots']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['time_slots']['Insert']>;
      };
      bookings: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          vehicle_id: string;
          time_slot_id: string;
          total_price: number;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          payment_status: 'pending' | 'paid' | 'refunded';
          notes?: string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
      rewards: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rewards']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['rewards']['Insert']>;
      };
      reward_transactions: {
        Row: {
          id: string;
          user_id: string;
          booking_id: string;
          points: number;
          type: 'earned' | 'redeemed';
          description: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reward_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['reward_transactions']['Insert']>;
      };
    };
  };
}; 