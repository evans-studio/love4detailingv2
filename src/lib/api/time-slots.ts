'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { TimeSlot } from '@/lib/validation/booking';

const supabase = createClientComponentClient();

export async function getAvailableTimeSlots(date: string): Promise<TimeSlot[]> {
  const { data: slots, error } = await supabase
    .from('time_slots')
    .select(`
      id,
      slot_time,
      is_booked,
      bookings!inner(id)
    `)
    .eq('slot_date', date)
    .is('bookings.id', null)
    .eq('is_booked', false)
    .order('slot_time');

  if (error) throw error;

  return slots.map(slot => ({
    date,
    time: slot.slot_time,
    isAvailable: !slot.is_booked
  }));
}

export async function generateTimeSlots(): Promise<void> {
  // Generate time slots for the next 14 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);

  const timeSlots = [
    '10:00:00',
    '11:30:00',
    '13:00:00',
    '14:30:00',
    '16:00:00',
  ];

  const slots = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Skip Sundays
    if (currentDate.getDay() !== 0) {
      for (const time of timeSlots) {
        slots.push({
          slot_date: currentDate.toISOString().split('T')[0],
          slot_time: time,
          is_booked: false,
        });
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const { error } = await supabase
    .from('time_slots')
    .insert(slots);

  if (error) throw error;
}

// These functions are no longer needed as they're handled by the stored procedure
export async function isTimeSlotAvailable(timeSlotId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('time_slots')
    .select('is_booked')
    .eq('id', timeSlotId)
    .single();

  if (error) throw error;
  return !data.is_booked;
}

export async function reserveTimeSlot(timeSlotId: string): Promise<void> {
  const { error } = await supabase
    .from('time_slots')
    .update({ is_booked: true })
    .eq('id', timeSlotId);

  if (error) throw error;
}

export async function releaseTimeSlot(timeSlotId: string): Promise<void> {
  const { error } = await supabase
    .from('time_slots')
    .update({ is_booked: false })
    .eq('id', timeSlotId);

  if (error) throw error;
} 