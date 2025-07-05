import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { Booking } from '@/types';

export class BookingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BookingError';
  }
}

interface AnonymousBookingData {
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_color: string;
  vehicle_size_id: string;
  time_slot_id: string;
  email: string;
  full_name: string;
  phone: string;
}

export class BookingService {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient<Database>();
  }

  async createAnonymousBooking(data: AnonymousBookingData): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
  }> {
    try {
      // Check if time slot is available first
      const { data: timeSlot, error: timeSlotError } = await this.supabase
        .from('time_slots')
        .select('is_available')
        .eq('id', data.time_slot_id)
        .single();

      if (timeSlotError) throw new BookingError('Failed to check time slot availability', 'TIME_SLOT_CHECK_FAILED');
      if (!timeSlot) throw new BookingError('Time slot not found', 'TIME_SLOT_NOT_FOUND');
      if (!timeSlot.is_available) throw new BookingError('Time slot is no longer available', 'TIME_SLOT_UNAVAILABLE');

      // Get the vehicle size price
      const { data: sizeData, error: sizeError } = await this.supabase
        .from('vehicle_sizes')
        .select('price_pence')
        .eq('id', data.vehicle_size_id)
        .single();

      if (sizeError) throw new BookingError('Failed to get vehicle size price', 'VEHICLE_SIZE_CHECK_FAILED');
      if (!sizeData) throw new BookingError('Vehicle size not found', 'VEHICLE_SIZE_NOT_FOUND');

      // Create the booking using the stored procedure
      const { data: bookingId, error: bookingError } = await this.supabase
        .rpc('create_anonymous_booking', {
          p_vehicle_registration: data.vehicle_registration,
          p_vehicle_make: data.vehicle_make,
          p_vehicle_model: data.vehicle_model,
          p_vehicle_year: data.vehicle_year,
          p_vehicle_color: data.vehicle_color,
          p_vehicle_size_id: data.vehicle_size_id,
          p_time_slot_id: data.time_slot_id,
          p_total_price_pence: sizeData.price_pence,
          p_email: data.email,
          p_full_name: data.full_name,
          p_phone: data.phone
        });

      if (bookingError) {
        if (bookingError.message.includes('Time slot is not available')) {
          throw new BookingError('Time slot is no longer available', 'TIME_SLOT_UNAVAILABLE');
        }
        throw new BookingError('Failed to create booking', 'BOOKING_CREATION_FAILED');
      }

      if (!bookingId) throw new BookingError('No booking ID returned', 'BOOKING_ID_MISSING');

      // Get the created booking
      const { data: booking, error: getBookingError } = await this.supabase
        .from('bookings')
        .select(`
          *,
          vehicle:vehicles(
            registration,
            make,
            model,
            year,
            color,
            vehicle_size:vehicle_sizes(label, price_pence)
          ),
          time_slot:time_slots(slot_date, slot_time)
        `)
        .eq('id', bookingId)
        .single();

      if (getBookingError) throw new BookingError('Failed to get booking details', 'BOOKING_DETAILS_FAILED');
      if (!booking) throw new BookingError('Booking not found after creation', 'BOOKING_NOT_FOUND');

      return {
        success: true,
        booking
      };
    } catch (error) {
      console.error('Error in createAnonymousBooking:', error);
      return {
        success: false,
        error: error instanceof BookingError ? error.message : 'Failed to create booking'
      };
    }
  }
}

export async function createBooking(bookingData: AnonymousBookingData): Promise<{
  success: boolean;
  booking?: Booking;
  error?: string;
}> {
  const bookingService = new BookingService();
  return bookingService.createAnonymousBooking(bookingData);
} 