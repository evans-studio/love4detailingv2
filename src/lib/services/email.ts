import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  vehicles?: {
    make: string | null;
    model: string | null;
    registration: string;
  };
  time_slots?: {
    slot_date: string;
    slot_time: string;
  };
};

export class EmailService {
  private supabase = createClientComponentClient();

  async sendBookingConfirmation(booking: Booking): Promise<void> {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'booking_confirmation',
        bookingId: booking.id
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send booking confirmation email');
    }
  }

  async sendBookingCancellation(booking: Booking): Promise<void> {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'booking_cancellation',
        bookingId: booking.id
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send booking cancellation email');
    }
  }

  async sendBookingReminder(booking: Booking): Promise<void> {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'booking_reminder',
        bookingId: booking.id
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send booking reminder email');
    }
  }

  async sendTierUpgradeNotification(
    user_id: string,
    email: string,
    oldTier: string,
    newTier: string,
    points: number
  ): Promise<void> {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'tier_upgrade',
        userId: user_id,
        oldTier,
        newTier,
        points
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send tier upgrade notification email');
    }
  }
} 