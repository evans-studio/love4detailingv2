import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Booking, BookingFormData } from '@/types';
import type { Database } from '@/types/supabase';
import { generateBookingReference } from '@/lib/utils';
import { EmailService } from './email';
import { PaymentService, type PaymentDetails } from './payment';
import { RewardsService } from './rewards';

const BOOKING_LOCK_DURATION = 15 * 60; // 15 minutes in seconds

interface TimeSlotLock {
  slot_date: string;
  slot_time: string;
  expires_at: number;
}

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

interface BookingResult {
  success: boolean;
  booking?: Booking;
  error?: string;
  password_reset_link?: string;
  userExists?: boolean;
  hasPassword?: boolean;
}

export class BookingService {
  private supabase = createClientComponentClient();
  private emailService = new EmailService();
  private paymentService = new PaymentService();
  private rewardsService = new RewardsService();

  /**
   * Check if a time slot is available
   */
  async isTimeSlotAvailable(date: string, timeSlot: string): Promise<boolean> {
    // Check existing bookings
    const { data: existingBookings } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('slot_date', date)
      .eq('slot_time', timeSlot)
      .not('status', 'eq', 'cancelled');

    if (existingBookings && existingBookings.length > 0) {
      return false;
    }

    // Check temporary locks
    const { data: lock } = await this.supabase
      .from('booking_locks')
      .select('*')
      .eq('slot_date', date)
      .eq('slot_time', timeSlot)
      .single();

    if (lock && lock.expires_at > Date.now() / 1000) {
      return false;
    }

    return true;
  }

  /**
   * Create a temporary lock on a time slot
   */
  async lockTimeSlot(date: string, timeSlot: string): Promise<void> {
    const { error } = await this.supabase
      .from('booking_locks')
      .upsert({
        slot_date: date,
        slot_time: timeSlot,
        expires_at: Math.floor(Date.now() / 1000) + BOOKING_LOCK_DURATION,
      });

    if (error) throw error;
  }

  /**
   * Release a temporary lock on a time slot
   */
  async releaseTimeSlot(date: string, timeSlot: string): Promise<void> {
    const { error } = await this.supabase
      .from('booking_locks')
      .delete()
      .eq('slot_date', date)
      .eq('slot_time', timeSlot);

    if (error) throw error;
  }

  /**
   * Create a new booking
   */
  async createBooking(data: BookingFormData, user_id?: string): Promise<{ 
    success: boolean;
    booking?: Booking;
    paymentDetails?: PaymentDetails;
    error?: string;
  }> {
    try {
      // Verify user authentication status
      if (!user_id && data.isAuthenticated) {
        return {
          success: false,
          error: 'User must be logged in to create a booking.',
        };
      }

      const isAvailable = await this.isTimeSlotAvailable(data.date, data.timeSlot);
      if (!isAvailable) {
        return {
          success: false,
          error: 'This time slot is no longer available. Please choose another time.',
        };
      }

      // For authenticated users, verify vehicle ownership
      if (user_id) {
        const { data: vehicle } = await this.supabase
          .from('vehicles')
          .select('id, user_id')
          .eq('id', data.vehicle_id)
          .single();

        if (!vehicle || vehicle.user_id !== user_id) {
          return {
            success: false,
            error: 'Invalid vehicle selection.',
          };
        }
      }

      const bookingData: Database['public']['Tables']['bookings']['Insert'] = {
        user_id: user_id || null,
        vehicle_id: data.vehicle_id,
        time_slot_id: data.time_slot_id,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash',
        total_price_pence: data.price_snapshot_pence,
        booking_reference: generateBookingReference(),
        email: data.email,
        full_name: data.firstName + ' ' + data.lastName,
        phone: data.phone,
      };

      const { data: booking, error } = await this.supabase
        .from('bookings')
        .insert(bookingData)
        .select(`
          *,
          vehicles (
            make,
            model,
            registration,
            vehicle_sizes (
              label,
              description,
              price_pence
            )
          ),
          time_slots (
            slot_date,
            slot_time
          )
        `)
        .single();

      if (error) throw error;

      // Release the temporary lock
      await this.releaseTimeSlot(data.date, data.timeSlot);

      // Initialize payment
      const paymentDetails = await this.paymentService.initializePayment(
        booking,
        booking.total_price_pence
      );

      // Send confirmation email
      await this.emailService.sendBookingConfirmation({
        ...booking,
        vehicles: booking.vehicles,
        time_slots: booking.time_slots,
      });

      // If user is authenticated, update their rewards points
      if (user_id) {
        try {
          await this.rewardsService.addBookingPoints(user_id, booking.id);
        } catch (rewardsError) {
          console.error('Error adding rewards points:', rewardsError);
          // Don't fail the booking if rewards fail
        }
      }

      return {
        success: true,
        booking,
        paymentDetails,
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        error: 'Failed to create booking. Please try again.',
      };
    }
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableTimeSlots(date: string): Promise<string[]> {
    // This would come from config in a real app
    const ALL_TIME_SLOTS = [
      '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00'
    ];

    const { data: existingBookings } = await this.supabase
      .from('time_slots')
      .select('slot_time')
      .eq('slot_date', date)
      .eq('is_booked', true);

    const bookedSlots = new Set(existingBookings?.map((b: { slot_time: string }) => b.slot_time) || []);

    // Also check temporary locks
    const { data: locks } = await this.supabase
      .from('booking_locks')
      .select('slot_time')
      .eq('slot_date', date)
      .gt('expires_at', Math.floor(Date.now() / 1000));

    const lockedSlots = new Set(locks?.map((l: { slot_time: string }) => l.slot_time) || []);

    return ALL_TIME_SLOTS.filter(slot => 
      !bookedSlots.has(slot) && !lockedSlots.has(slot)
    );
  }

  /**
   * Get a booking by ID
   */
  async getBookingById(id: string): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        vehicles (
          make,
          model,
          registration,
          vehicle_sizes (
            label,
            price_pence
          )
        ),
        time_slots (
          slot_date,
          slot_time
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Booking;
  }

  /**
   * Get bookings for a user
   */
  async getUserBookings(userId: string): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('userId', userId)
      .order('date', { ascending: false });

    if (error || !data) return [];
    return data as Booking[];
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, userId: string): Promise<{ 
    success: boolean;
    error?: string;
  }> {
    try {
      const booking = await this.getBookingById(id);
      
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      if (booking.user_id !== userId) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      const { error } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Send cancellation email
      await this.emailService.sendBookingCancellation(booking);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        error: 'Failed to cancel booking',
      };
    }
  }

  /**
   * Schedule booking reminders
   * This would typically be called by a cron job
   */
  async scheduleReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('date', tomorrowStr)
      .eq('status', 'confirmed');

    if (!bookings) return;

    for (const booking of bookings) {
      try {
        await this.emailService.sendBookingReminder(booking);
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error);
      }
    }
  }

  private async createAuthUser(email: string, fullName: string): Promise<{
    user_id: string;
    reset_link?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, fullName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user account');
      }

      const data = await response.json();
      return {
        user_id: data.user_id,
        reset_link: data.reset_link
      };
    } catch (error) {
      console.error('Error creating auth user:', error);
      return {
        user_id: '',
        error: error instanceof Error ? error.message : 'Failed to create user account'
      };
    }
  }

  private async createPublicUser(id: string, email: string, fullName: string, phone: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await this.supabase
        .from('users')
        .insert({
          id,
          email,
          full_name: fullName,
          phone,
          role: 'customer'
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error creating public user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user profile'
      };
    }
  }

  private async linkAnonymousData(bookingId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await this.supabase
        .rpc('link_anonymous_booking_to_user', {
          p_booking_id: bookingId,
          p_user_id: userId
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error linking anonymous data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link booking data'
      };
    }
  }

  async createAnonymousBooking(data: AnonymousBookingData): Promise<BookingResult> {
    try {
      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id, has_password')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in to continue.',
          userExists: true,
          hasPassword: existingUser.has_password,
        };
      }

      // Create new auth user
      const { user_id, reset_link, error: authError } = await this.createAuthUser(
        data.email,
        data.full_name
      );

      if (authError || !user_id) {
        return {
          success: false,
          error: authError || 'Failed to create user account.',
        };
      }

      // Create public user profile
      const { error: profileError } = await this.createPublicUser(
        user_id,
        data.email,
        data.full_name,
        data.phone
      );

      if (profileError) {
        return {
          success: false,
          error: 'Failed to create user profile.',
        };
      }

      // Create vehicle record
      const { data: vehicle, error: vehicleError } = await this.supabase
        .from('vehicles')
        .insert({
          user_id,
          registration: data.vehicle_registration,
          make: data.vehicle_make,
          model: data.vehicle_model,
          year: data.vehicle_year,
          color: data.vehicle_color,
          vehicle_size_id: data.vehicle_size_id,
        })
        .select()
        .single();

      if (vehicleError || !vehicle) {
        return {
          success: false,
          error: 'Failed to create vehicle record.',
        };
      }

      // Get time slot details for the booking
      const { data: timeSlotData, error: timeSlotError } = await this.supabase
        .from('time_slots')
        .select('slot_date, slot_time')
        .eq('id', data.time_slot_id)
        .single();

      if (timeSlotError || !timeSlotData) {
        return {
          success: false,
          error: 'Failed to fetch time slot details.',
        };
      }

      // Get vehicle size details for pricing
      const { data: vehicleSizeData, error: vehicleSizeError } = await this.supabase
        .from('vehicle_sizes')
        .select('price_pence')
        .eq('id', data.vehicle_size_id)
        .single();

      if (vehicleSizeError || !vehicleSizeData) {
        return {
          success: false,
          error: 'Failed to fetch vehicle size details.',
        };
      }

      // Create booking with proper BookingFormData structure
      const bookingResult = await this.createBooking(
        {
          vehicle_id: vehicle.id,
          time_slot_id: data.time_slot_id,
          vehicle_size_id: data.vehicle_size_id,
          date: timeSlotData.slot_date,
          timeSlot: timeSlotData.slot_time,
          price_snapshot_pence: vehicleSizeData.price_pence,
          email: data.email,
          firstName: data.full_name.split(' ')[0],
          lastName: data.full_name.split(' ').slice(1).join(' '),
          phone: data.phone,
          isAuthenticated: false,
        },
        user_id
      );

      if (!bookingResult.success) {
        return {
          success: false,
          error: bookingResult.error || 'Failed to create booking.',
        };
      }

      return {
        success: true,
        booking: bookingResult.booking,
        password_reset_link: reset_link,
      };
    } catch (error) {
      console.error('Error in anonymous booking:', error);
      return {
        success: false,
        error: 'Failed to process booking. Please try again.',
      };
    }
  }
}

export async function createBooking(bookingData: AnonymousBookingData): Promise<BookingResult> {
  const bookingService = new BookingService();
  return bookingService.createAnonymousBooking(bookingData);
} 