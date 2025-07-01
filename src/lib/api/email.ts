import { Resend } from 'resend';

let resend: Resend;

// Only initialize Resend on the server side
if (typeof window === 'undefined') {
  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY environment variable');
  } else {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
}

interface BookingConfirmationEmailProps {
  to: string;
  bookingReference: string;
  customerName: string;
  vehicleDetails: string;
  appointmentDate: string;
  appointmentTime: string;
  price: number;
}

export async function sendBookingConfirmation({
  to,
  bookingReference,
  customerName,
  vehicleDetails,
  appointmentDate,
  appointmentTime,
  price
}: BookingConfirmationEmailProps): Promise<void> {
  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Format price as currency
  const formattedPrice = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(price / 100);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Booking Confirmation</h1>
      <p>Dear ${customerName},</p>
      <p>Thank you for booking with Love4Detailing. Your booking has been confirmed with the following details:</p>
      
      <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Booking Reference:</strong> ${bookingReference}</p>
        <p><strong>Vehicle:</strong> ${vehicleDetails}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Price:</strong> ${formattedPrice}</p>
      </div>

      <h2 style="color: #333; font-size: 18px;">Important Information</h2>
      <ul style="padding-left: 20px;">
        <li>Please arrive 5-10 minutes before your appointment time</li>
        <li>Ensure your vehicle is accessible and free from personal items</li>
        <li>If you need to cancel or reschedule, please do so at least 24 hours in advance</li>
      </ul>

      <p>You can view or manage your booking by logging into your account at <a href="https://love4detailing.com/dashboard">love4detailing.com/dashboard</a></p>

      <p style="margin-top: 30px;">Best regards,<br>Love4Detailing Team</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'Love4Detailing <bookings@love4detailing.com>',
      to: [to],
      subject: `Booking Confirmation - Ref: ${bookingReference}`,
      html,
    });
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    throw new Error('Failed to send confirmation email');
  }
}

interface BookingCancellationEmailProps {
  to: string;
  bookingReference: string;
  customerName: string;
}

export async function sendBookingCancellation({
  to,
  bookingReference,
  customerName,
}: BookingCancellationEmailProps) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Booking Cancellation</h1>
      <p>Dear ${customerName},</p>
      <p>Your booking (Reference: ${bookingReference}) has been cancelled as requested.</p>
      
      <p>If you would like to make a new booking, please visit <a href="https://love4detailing.com/book">love4detailing.com/book</a></p>

      <p style="margin-top: 30px;">Best regards,<br>Love4Detailing Team</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'Love4Detailing <bookings@love4detailing.com>',
      to: [to],
      subject: `Booking Cancellation - Ref: ${bookingReference}`,
      html,
    });
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
    throw new Error('Failed to send cancellation email');
  }
} 