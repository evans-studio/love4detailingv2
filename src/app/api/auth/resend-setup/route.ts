import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, bookingId } = await request.json();

    if (!email || !bookingId) {
      return NextResponse.json(
        { error: 'Email and booking ID are required' },
        { status: 400 }
      );
    }

    // Using service role client defined above

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

    // Generate a new password setup link using admin invite
    const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app'}/auth/setup-password?booking=${bookingId}`,
        data: {
          booking_id: bookingId,
        }
      }
    );

    if (inviteError) {
      console.error('Failed to send invite email:', inviteError);
      return NextResponse.json(
        { error: 'Failed to send setup email', details: inviteError.message },
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

    // The invite email is sent automatically by Supabase
    return NextResponse.json({
      success: true,
      message: 'Setup email sent successfully',
      setupLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app'}/auth/setup-password?booking=${bookingId}`
    });
  } catch (error) {
    console.error('Error resending setup email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 