import { createClient } from '@/lib/api/supabase';
import type { Booking, BookingFormData } from '@/types';
import type { Database } from '@/types/supabase';
import { generateBookingReference } from '@/lib/utils';
import { EmailService } from './email';
import { PaymentService, type PaymentDetails } from './payment';

const BOOKING_LOCK_DURATION = 15 * 60; // 15 minutes in seconds

interface TimeSlotLock {
  date: string;
  timeSlot: string;
  expiresAt: number;
}

export class BookingService {
  private supabase = createClient();
  private emailService = new EmailService();
  private paymentService = new PaymentService();

  /**
   * Check if a time slot is available
   */
  async isTimeSlotAvailable(date: string, timeSlot: string): Promise<boolean> {
    // Check existing bookings
    const { data: existingBookings } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('timeSlot', timeSlot)
      .not('status', 'eq', 'cancelled');

    if (existingBookings && existingBookings.length > 0) {
      return false;
    }

    // Check temporary locks
    const { data: lock } = await this.supabase
      .from('booking_locks')
      .select('*')
      .eq('date', date)
      .eq('timeSlot', timeSlot)
      .single();

    if (lock && lock.expiresAt > Date.now() / 1000) {
      return false;
    }

    return true;
  }

  /**
   * Create a temporary lock on a time slot
   */
  async lockTimeSlot(date: string, timeSlot: string): Promise<boolean> {
    const isAvailable = await this.isTimeSlotAvailable(date, timeSlot);
    if (!isAvailable) {
      return false;
    }

    const expiresAt = Math.floor(Date.now() / 1000) + BOOKING_LOCK_DURATION;

    const { error } = await this.supabase
      .from('booking_locks')
      .upsert({
        date,
        timeSlot,
        expiresAt,
      });

    return !error;
  }

  /**
   * Release a temporary lock on a time slot
   */
  async releaseTimeSlot(date: string, timeSlot: string): Promise<void> {
    await this.supabase
      .from('booking_locks')
      .delete()
      .eq('date', date)
      .eq('timeSlot', timeSlot);
  }

  /**
   * Create a new booking
   */
  async createBooking(data: BookingFormData, userId?: string): Promise<{ 
    success: boolean;
    booking?: Booking;
    paymentDetails?: PaymentDetails;
    error?: string;
  }> {
    try {
      const isAvailable = await this.isTimeSlotAvailable(data.date, data.timeSlot);
      if (!isAvailable) {
        return {
          success: false,
          error: 'This time slot is no longer available. Please choose another time.',
        };
      }

      const bookingData: Database['public']['Tables']['bookings']['Insert'] = {
        ...data,
        userId: userId || null,
        reference: generateBookingReference(),
        status: 'pending',
        size: data.size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: booking, error } = await this.supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      // Release the temporary lock
      await this.releaseTimeSlot(data.date, data.timeSlot);

      // Initialize payment
      const amount = this.paymentService.calculateBookingPrice(booking);
      const paymentDetails = await this.paymentService.initializePayment(
        booking,
        amount
      );

      // Send confirmation email
      await this.emailService.sendBookingConfirmation(booking);

      // If user is authenticated, update their rewards points
      if (userId) {
        await this.updateRewardsPoints(userId, booking.id);
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
   * Update rewards points after successful booking
   */
  private async updateRewardsPoints(userId: string, bookingId: string): Promise<void> {
    const POINTS_PER_BOOKING = 100; // Move to config later

    const { data: existingRewards } = await this.supabase
      .from('rewards')
      .select('points')
      .eq('userId', userId)
      .single();

    const currentPoints = existingRewards?.points || 0;
    const newPoints = currentPoints + POINTS_PER_BOOKING;

    // Update user's total points
    await this.supabase
      .from('rewards')
      .upsert({
        userId,
        points: newPoints,
        updatedAt: new Date().toISOString(),
      });

    // Record the transaction
    await this.supabase
      .from('reward_transactions')
      .insert({
        userId,
        bookingId,
        points: POINTS_PER_BOOKING,
        type: 'earned',
        description: 'Points earned from booking',
        createdAt: new Date().toISOString(),
      });
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
      .from('bookings')
      .select('timeSlot')
      .eq('date', date)
      .not('status', 'eq', 'cancelled');

    const bookedSlots = new Set(existingBookings?.map((b: { timeSlot: string }) => b.timeSlot) || []);

    // Also check temporary locks
    const { data: locks } = await this.supabase
      .from('booking_locks')
      .select('timeSlot')
      .eq('date', date)
      .gt('expiresAt', Math.floor(Date.now() / 1000));

    const lockedSlots = new Set(locks?.map((l: { timeSlot: string }) => l.timeSlot) || []);

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
      .select('*')
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

      if (booking.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      const { error } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
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
} 