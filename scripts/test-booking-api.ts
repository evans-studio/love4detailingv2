import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testBookingAPI() {
  console.log('🧪 Testing booking API with anonymous user...');
  
  const testBookingData = {
    vehicle: {
      registration: 'TEST123',
      make: 'Toyota',
      model: 'Corolla',
      year: '2020',
      color: 'White',
      sizeId: '1', // Assuming this exists
    },
    personalDetails: {
      firstName: 'Test',
      lastName: 'User',
      email: `test-booking-api-${Date.now()}@example.com`,
      phone: '07123456789',
      postcode: 'SW1A 1AA',
    },
    dateTime: {
      timeSlotId: '1', // This would need to be a valid time slot ID
      date: '2025-07-10',
      time: '10:00',
    },
    vehicleSizeId: '1',
    totalPrice: 6000, // £60.00 in pence
  };
  
  try {
    console.log('📧 Testing with email:', testBookingData.personalDetails.email);
    
    const response = await fetch('https://love4detailingv2.vercel.app/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBookingData),
    });
    
    const responseText = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response text:', responseText);
    
    if (!response.ok) {
      console.error('❌ Booking API failed');
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Could not parse error response');
      }
    } else {
      console.log('✅ Booking API succeeded');
      try {
        const result = JSON.parse(responseText);
        console.log('Booking result:', {
          success: result.success,
          bookingId: result.booking?.id,
          userId: result.booking?.user_id,
          isNewUser: result.booking?.is_new_user,
        });
      } catch (e) {
        console.error('Could not parse success response');
      }
    }
    
  } catch (error) {
    console.error('💥 Request failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting booking flow test...');
  
  await testBookingAPI();
  
  console.log('✅ Test completed');
}

main().catch(console.error);