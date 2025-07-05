import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

// Admin API utilities for server-side operations
export const createAdminClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Admin API functions
export const adminApi = {
  // Bookings
  async getAllBookings() {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        users (
          id,
          full_name,
          email,
          phone
        ),
        vehicles (
          id,
          registration,
          make,
          model,
          year,
          color,
          vehicle_sizes (
            id,
            label,
            price_pence
          )
        ),
        time_slots (
          id,
          slot_date,
          slot_time,
          is_available
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateBooking(id: string, updates: Partial<Database['public']['Tables']['bookings']['Update']>) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteBooking(id: string) {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Time Slots
  async getAllTimeSlots() {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  async createTimeSlot(timeSlot: Database['public']['Tables']['time_slots']['Insert']) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('time_slots')
      .insert(timeSlot)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTimeSlot(id: string, updates: Partial<Database['public']['Tables']['time_slots']['Update']>) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('time_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTimeSlot(id: string) {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Vehicle Sizes
  async getAllVehicleSizes() {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('vehicle_sizes')
      .select('*')
      .order('label');

    if (error) throw error;
    return data;
  },

  async updateVehicleSize(id: string, updates: Partial<Database['public']['Tables']['vehicle_sizes']['Update']>) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('vehicle_sizes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Users
  async getAllUsers() {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        bookings (count),
        reward_transactions (
          points_earned,
          points_spent
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Partial<Database['public']['Tables']['users']['Update']>) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Admin Notes/Policies
  async getAdminNotes() {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('admin_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateAdminNote(key: string, content: string) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('admin_notes')
      .upsert({ 
        key, 
        content,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Client-side hooks
export const useAdminQuery = () => {
  const supabase = createClientComponentClient<Database>();
  
  return {
    // Bookings
    useBookings: () => {
      return supabase
        .from('bookings')
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone
          ),
          vehicles (
            id,
            registration,
            make,
            model,
            year,
            color,
            vehicle_sizes (
              id,
              label,
              price_pence
            )
          ),
          time_slots (
            id,
            slot_date,
            slot_time,
            is_available
          )
        `)
        .order('created_at', { ascending: false });
    },

    // Time Slots
    useTimeSlots: () => {
      return supabase
        .from('time_slots')
        .select('*')
        .order('slot_date', { ascending: true })
        .order('slot_time', { ascending: true });
    },

    // Vehicle Sizes
    useVehicleSizes: () => {
      return supabase
        .from('vehicle_sizes')
        .select('*')
        .order('label');
    },

    // Users
    useUsers: () => {
      return supabase
        .from('users')
        .select(`
          *,
          bookings (count),
          reward_transactions (
            points_earned,
            points_spent
          )
        `)
        .order('created_at', { ascending: false });
    }
  };
};