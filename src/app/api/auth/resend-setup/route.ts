import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const { email, bookingId } = await request.json();

    if (!email || !bookingId) {
      return NextResponse.json(
        { error: 'Email and booking ID are required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const emailService = new EmailService();

    // Get user by email from public profiles
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a new password reset link
    const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?booking=${bookingId}`
      }
    );

    if (resetError) {
      return NextResponse.json(
        { error: 'Failed to generate setup link' },
        { status: 500 }
      );
    }

    // Get the booking details for the email
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        vehicles (
          make,
          model,
          registration
        ),
        time_slots (
          slot_date,
          slot_time
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Send the email with the new link
    await emailService.sendBookingConfirmation({
      ...booking,
      vehicles: booking.vehicles,
      time_slots: booking.time_slots
    });

    return NextResponse.json({
      success: true,
      setupLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?booking=${bookingId}`
    });
  } catch (error) {
    console.error('Error resending setup email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 