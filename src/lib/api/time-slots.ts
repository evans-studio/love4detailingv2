'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { startOfDay, format } from 'date-fns';
import type { Database } from '@/types/supabase';
import type { DbAvailableSlot } from '@/types';

export async function getAvailableTimeSlots(date: string): Promise<DbAvailableSlot[]> {
  const supabase = createClientComponentClient<Database>();

  // Format date to match database format (YYYY-MM-DD)
  const formattedDate = format(new Date(date), 'yyyy-MM-dd');

  // First, ensure slots exist for this date
  await generateTimeSlotsIfNeeded(formattedDate);

  const { data, error } = await supabase
    .from('available_slots')
    .select('*')
    .eq('slot_date', formattedDate)
    .eq('is_blocked', false)
    .order('start_time');

  if (error) {
    console.error('Error fetching time slots:', error);
    throw error;
  }

  return data?.map(slot => ({
    id: slot.id,
    slot_date: slot.slot_date,
    start_time: slot.start_time,
    end_time: slot.end_time,
    max_bookings: slot.max_bookings,
    current_bookings: slot.current_bookings,
    is_blocked: slot.is_blocked,
    block_reason: slot.block_reason,
    created_at: slot.created_at,
    updated_at: slot.updated_at
  })) || [];
}

export async function getAvailableDates(): Promise<string[]> {
  const supabase = createClientComponentClient<Database>();
  const today = startOfDay(new Date());
  const formattedToday = format(today, 'yyyy-MM-dd');

  // First, ensure slots exist for the next 14 days
  await generateTimeSlotsIfNeeded(formattedToday);

  const { data, error } = await supabase
    .from('available_slots')
    .select('slot_date')
    .eq('is_blocked', false)
    .gte('slot_date', formattedToday)
    .order('slot_date');

  if (error) {
    console.error('Error fetching available dates:', error);
    throw error;
  }

  // Return unique dates
  return Array.from(new Set(data?.map(slot => slot.slot_date) || []));
}

async function generateTimeSlotsIfNeeded(date: string): Promise<void> {
  try {
    const response = await fetch('/api/time-slots/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error generating time slots:', error);
    }
  } catch (err) {
    console.error('Failed to generate time slots:', err);
  }
}

export async function createBooking(params: {
  userId: string;
  vehicleId: string;
  timeSlotId: string;
  totalPricePence: number;
}) {
  const supabase = createClientComponentClient<Database>();

  // Get user details first
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not authenticated');

  // Get user profile data
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('email, full_name, phone')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  if (!profile) throw new Error('User profile not found');

  // Create booking with user details
  const { data: booking, error: bookingError } = await supabase
    .rpc('create_booking', {
      p_user_id: user.id,
      p_vehicle_id: params.vehicleId,
      p_slot_id: params.timeSlotId,
      p_total_price_pence: params.totalPricePence,
      p_email: profile.email,
      p_full_name: profile.full_name,
      p_phone: profile.phone
    });

  if (bookingError) throw bookingError;
  return booking;
} 