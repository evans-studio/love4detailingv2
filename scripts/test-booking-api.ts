#!/usr/bin/env node

/**
 * Test script for booking API functionality
 * Tests the critical booking creation flow that was failing
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app';

async function testBookingAPI() {
  console.log('🧪 Testing Booking API...\n');

  // Sample booking data
  const bookingData = {
    vehicle: {
      registration: 'TEST123',
      make: 'BMW',
      model: 'M3', 
      year: 2020,
      color: 'Black',
      sizeId: '11111111-1111-1111-1111-111111111111' // This will need to be a real vehicle size ID
    },
    personalDetails: {
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
      phone: '+44123456789'
    },
    dateTime: {
      timeSlotId: '22222222-2222-2222-2222-222222222222' // This will need to be a real time slot ID
    },
    vehicleSizeId: '11111111-1111-1111-1111-111111111111',
    totalPrice: 5999
  };

  try {
    console.log('📡 Making booking request...');
    console.log('URL:', `${SITE_URL}/api/bookings`);
    console.log('Data:', JSON.stringify(bookingData, null, 2));

    const response = await fetch(`${SITE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('📊 Response data:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Booking API test successful!');
      return true;
    } else {
      console.log('\n❌ Booking API test failed!');
      console.log('Error:', responseData.error);
      return false;
    }
  } catch (error) {
    console.log('\n💥 Booking API test crashed!');
    console.error('Error:', error);
    return false;
  }
}

async function testTimeSlotAPI() {
  console.log('🧪 Testing Time Slot API...\n');

  try {
    // Test getting time slots for today
    const today = new Date().toISOString().split('T')[0];
    const url = `${SITE_URL}/api/time-slots?date=${today}`;
    
    console.log('📡 Getting time slots...');
    console.log('URL:', url);

    const response = await fetch(url);
    console.log('📊 Response status:', response.status);

    const responseData = await response.json();
    console.log('📊 Time slots found:', responseData.length || 0);

    if (responseData.length > 0) {
      console.log('📊 Sample time slot:', responseData[0]);
      return responseData[0];
    }

    return null;
  } catch (error) {
    console.log('\n💥 Time Slot API test crashed!');
    console.error('Error:', error);
    return null;
  }
}

async function testVehicleSizeAPI() {
  console.log('🧪 Testing Vehicle Size API...\n');

  try {
    const url = `${SITE_URL}/api/vehicle-sizes`;
    
    console.log('📡 Getting vehicle sizes...');
    console.log('URL:', url);

    const response = await fetch(url);
    console.log('📊 Response status:', response.status);

    const responseData = await response.json();
    console.log('📊 Vehicle sizes found:', responseData.length || 0);

    if (responseData.length > 0) {
      console.log('📊 Sample vehicle size:', responseData[0]);
      return responseData[0];
    }

    return null;
  } catch (error) {
    console.log('\n💥 Vehicle Size API test crashed!');
    console.error('Error:', error);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...');
  console.log('🌐 Site URL:', SITE_URL);
  console.log('=' .repeat(50));

  // Test 1: Vehicle Sizes API
  const vehicleSize = await testVehicleSizeAPI();
  
  // Test 2: Time Slots API  
  const timeSlot = await testTimeSlotAPI();

  // Test 3: Booking API (with real data if available)
  if (vehicleSize && timeSlot) {
    console.log('\n🔧 Using real data for booking test...');
    
    const bookingData = {
      vehicle: {
        registration: 'TEST123',
        make: 'BMW',
        model: 'M3', 
        year: 2020,
        color: 'Black',
        sizeId: vehicleSize.id
      },
      personalDetails: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-${Date.now()}@example.com`,
        phone: '+44123456789'
      },
      dateTime: {
        timeSlotId: timeSlot.id
      },
      vehicleSizeId: vehicleSize.id,
      totalPrice: vehicleSize.price_pence
    };

    try {
      console.log('📡 Making booking request with real data...');
      console.log('Data:', JSON.stringify(bookingData, null, 2));

      const response = await fetch(`${SITE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      console.log('📊 Response status:', response.status);
      const responseData = await response.json();
      console.log('📊 Response data:', JSON.stringify(responseData, null, 2));

      if (response.ok) {
        console.log('\n✅ End-to-end booking test successful!');
        console.log('🎉 Booking created:', responseData.booking?.booking_reference);
      } else {
        console.log('\n❌ End-to-end booking test failed!');
        console.log('Error:', responseData.error);
      }
    } catch (error) {
      console.log('\n💥 End-to-end booking test crashed!');
      console.error('Error:', error);
    }
  } else {
    console.log('\n⚠️  Skipping booking test - missing required data');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);