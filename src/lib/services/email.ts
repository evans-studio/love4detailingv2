import { Resend } from 'resend';

// Define minimal booking type for the test
interface Booking {
  id: string;
  reference: string;
  date: string;
  timeSlot: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  make: string;
  model: string;
  registration: string;
  size: 'small' | 'medium' | 'large';
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class EmailService {
  private resend: Resend;
  private fromEmail = 'notifications@love4detailing.co.uk';

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendBookingConfirmation(booking: Booking): Promise<void> {
    const { email, firstName, lastName, date, timeSlot, make, model, registration } = booking;
    
    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: `Booking Confirmation - ${registration}`,
      html: `
        <h1>Booking Confirmation</h1>
        <p>Dear ${firstName} ${lastName},</p>
        <p>Your booking has been confirmed for:</p>
        <ul>
          <li>Date: ${date}</li>
          <li>Time: ${timeSlot}</li>
          <li>Vehicle: ${make} ${model}</li>
          <li>Registration: ${registration}</li>
        </ul>
        <p>Thank you for choosing Love4Detailing!</p>
      `
    });
  }
} 