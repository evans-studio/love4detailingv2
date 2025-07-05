import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'notifications@love4detailing.co.uk';

type EmailRequest = {
  type: 'booking_confirmation' | 'booking_cancellation' | 'booking_reminder' | 'tier_upgrade';
  bookingId?: string;
  userId?: string;
  oldTier?: string;
  newTier?: string;
  points?: number;
};

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const body = await request.json() as EmailRequest;

    // Verify authentication for protected routes
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    switch (body.type) {
      case 'booking_confirmation':
      case 'booking_cancellation':
      case 'booking_reminder': {
        if (!body.bookingId) {
          return NextResponse.json(
            { error: 'Booking ID is required' },
            { status: 400 }
          );
        }

        // Get booking details
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
          .eq('id', body.bookingId)
          .single();

        if (bookingError || !booking) {
          return NextResponse.json(
            { error: 'Booking not found' },
            { status: 404 }
          );
        }

        // Prepare email content based on type
        const emailContent = getEmailContent(body.type, booking);
        
        // Send email
        await resend.emails.send({
          from: fromEmail,
          to: booking.email!,
          subject: emailContent.subject,
          html: emailContent.html
        });

        return NextResponse.json({ success: true });
      }

      case 'tier_upgrade': {
        if (!body.userId || !body.oldTier || !body.newTier || !body.points) {
          return NextResponse.json(
            { error: 'Missing required fields for tier upgrade notification' },
            { status: 400 }
          );
        }

        // Get user details
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', body.userId)
          .single();

        if (userError || !user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        // Send tier upgrade email
        await resend.emails.send({
          from: fromEmail,
          to: user.email!,
          subject: `Congratulations! You've been upgraded to ${body.newTier} tier!`,
          html: `
            <h1>Tier Upgrade Notification</h1>
            <p>Dear ${user.full_name},</p>
            <p>Congratulations! You've been upgraded from ${body.oldTier} to ${body.newTier} tier!</p>
            <p>You now have ${body.points} points and access to all the amazing benefits of the ${body.newTier} tier.</p>
            <p>Thank you for your continued loyalty to Love4Detailing!</p>
          `
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

function getEmailContent(type: 'booking_confirmation' | 'booking_cancellation' | 'booking_reminder', booking: any) {
  const baseContent = `
    <ul>
      <li>Date: ${booking.time_slots?.slot_date}</li>
      <li>Time: ${booking.time_slots?.slot_time}</li>
      <li>Vehicle: ${booking.vehicles?.make} ${booking.vehicles?.model}</li>
      <li>Registration: ${booking.vehicles?.registration}</li>
    </ul>
  `;

  switch (type) {
    case 'booking_confirmation':
      return {
        subject: `Booking Confirmation - ${booking.vehicles?.registration}`,
        html: `
          <h1>Booking Confirmation</h1>
          <p>Dear ${booking.full_name},</p>
          <p>Your booking has been confirmed for:</p>
          ${baseContent}
          <p>Thank you for choosing Love4Detailing!</p>
        `
      };

    case 'booking_cancellation':
      return {
        subject: `Booking Cancelled - ${booking.vehicles?.registration}`,
        html: `
          <h1>Booking Cancelled</h1>
          <p>Dear ${booking.full_name},</p>
          <p>Your booking has been cancelled:</p>
          ${baseContent}
          <p>If you did not request this cancellation, please contact us immediately.</p>
        `
      };

    case 'booking_reminder':
      return {
        subject: `Booking Reminder - ${booking.vehicles?.registration}`,
        html: `
          <h1>Booking Reminder</h1>
          <p>Dear ${booking.full_name},</p>
          <p>This is a reminder of your upcoming booking:</p>
          ${baseContent}
          <p>We look forward to seeing you!</p>
        `
      };
  }
} 