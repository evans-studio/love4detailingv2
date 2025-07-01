import { createClient } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from '../../types/supabase';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Please check your .env.local file.'
  );
}

// Regular client for authenticated and anonymous users
export const supabase = createClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey);

// Admin client with full access (for seeding, testing, and admin operations)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient<SupabaseDatabase>(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    )
  : null;

// Helper to check if we're connected to production
export async function validateConnection() {
  if (!supabaseAdmin) {
    console.warn('⚠️ Admin client not initialized - missing SUPABASE_SERVICE_ROLE_KEY');
    return false;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    if (error) throw error;

    console.log(`✅ Connected to Supabase: ${supabaseUrl}`);
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
          date: string;
          start_time: string;
          end_time: string;
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