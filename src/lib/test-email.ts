import { config } from 'dotenv';
import { resolve } from 'path';
import { EmailService } from './services/email';
import { formatPrice } from './utils';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const testBooking = {
  id: 'test-booking-id',
  reference: 'TEST-123',
  date: '2024-03-25',
  timeSlot: '10:00',
  firstName: 'Test',
  lastName: 'User',
  email: 'paul@evans-studio.co.uk', // Replace with your email
  phone: '+44123456789',
  make: 'BMW',
  model: 'M3',
  registration: 'TEST123',
  size: 'medium' as const,
  notes: 'Test booking',
  status: 'pending' as const,
  userId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function testEmailService() {
  console.log('Testing email service...');
  
  const emailService = new EmailService();
  
  try {
    console.log('Sending test booking confirmation email...');
    await emailService.sendBookingConfirmation(testBooking);
    console.log('✅ Test booking confirmation email sent successfully!');
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
}

testEmailService(); 