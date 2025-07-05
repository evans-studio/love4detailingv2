import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

interface CreateBookingParams {
  vehicle_id: string;
  time_slot_id: string;
  total_price_pence: number;
}

export async function createBooking(params: CreateBookingParams) {
  const supabase = createClientComponentClient<Database>();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('User not authenticated');

  // Start a transaction
  const { data, error } = await supabase.rpc('create_booking', {
    p_user_id: user.id,
    p_vehicle_id: params.vehicle_id,
    p_time_slot_id: params.time_slot_id,
    p_total_price_pence: params.total_price_pence
  });

  if (error) throw error;
  return data;
} 