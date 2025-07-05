import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/supabase';
import { config } from 'dotenv';
import { calculateVehicleSize } from '../src/lib/utils/vehicle-size';
import path from 'path';
import { supabase, supabaseAdmin } from '../src/lib/supabase';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

// Debug logging
console.log('Environment variables loaded:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '❌ Missing');

if (!supabaseAdmin) {
  throw new Error('Supabase admin client is not initialized');
}

// Since we check for null above, we can safely assert supabaseAdmin is non-null
const admin = supabaseAdmin;

// Use require for JSON file
const vehicleSizeData = require('../vehicle-size-data.json');

// Size mapping
const SIZE_LABELS: Record<string, string> = {
  'S': 'Small',
  'M': 'Medium',
  'L': 'Large',
  'XL': 'Extra Large'
};

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: any;
}

async function logTestResult(result: TestResult) {
  console.log('\n-----------------------------------');
  console.log(`Step: ${result.step}`);
  console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
  if (result.data) {
    console.log('Data:', JSON.stringify(result.data, null, 2));
  }
  if (result.error) {
    console.error('Error:', result.error);
  }
  console.log('-----------------------------------\n');
}

async function createTestUser() {
  const timestamp = Date.now();
  const email = `test${timestamp}@example.com`;
  const password = 'testPassword123!';

  // Create user with service role client
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    await logTestResult({
      step: 'Create Auth User',
      success: false,
      error: authError
    });
    return null;
  }

  // Create user profile in public schema
  const { data: publicUser, error: publicError } = await admin
    .from('users')
    .insert({
      id: authUser.user.id,
      email: email,
      full_name: 'Test User',
      phone: '+44123456789',
      role: 'customer'
    })
    .select()
    .single();

  await logTestResult({
    step: 'Create Test User',
    success: !authError && !publicError,
    data: { authUser, publicUser },
    error: publicError
  });

  return authUser.user;
}

async function createTestVehicle(userId: string) {
  const testVehicle = {
    registration: 'AB12CDE',
    make: 'BMW',
    model: 'M3',
    year: '2020',
    color: 'Black',
    user_id: userId
  };

  // Calculate vehicle size
  const vehicleSize = await calculateVehicleSize(testVehicle.make, testVehicle.model, testVehicle.registration);
  
  if (!vehicleSize) {
    throw new Error('Failed to calculate vehicle size');
  }

  const { data: vehicle, error } = await admin
    .from('vehicles')
    .insert({
      ...testVehicle,
      size_id: vehicleSize.id
    })
    .select()
    .single();

  await logTestResult({
    step: 'Create Test Vehicle',
    success: !error,
    data: { vehicle, vehicleSize },
    error
  });

  return vehicle;
}

async function getTestTimeSlot() {
  // Get a time slot for tomorrow at 10 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toISOString().split('T')[0];

  // Try to find an available time slot for tomorrow
  const { data: slots, error: getError } = await admin
    .from('time_slots')
    .select()
    .eq('slot_date', date)
    .eq('is_available', true)
    .order('slot_time')
    .limit(1);

  if (!getError && slots && slots.length > 0) {
    await logTestResult({
      step: 'Get Test Time Slot',
      success: true,
      data: slots[0]
    });
    return slots[0];
  }

  // Create new time slot if no available slots found
  const { data: newSlot, error: createError } = await admin
    .from('time_slots')
    .insert({
      slot_date: date,
      slot_time: '10:00:00',
      is_available: true
    })
    .select()
    .single();

  await logTestResult({
    step: 'Get Test Time Slot',
    success: !createError,
    data: newSlot,
    error: createError
  });

  if (createError || !newSlot) {
    throw new Error('Failed to get test time slot');
  }

  return newSlot;
}

async function createTestBooking(
  userId: string,
  vehicleId: string,
  timeSlotId: string,
  vehicleSizeId: string
) {
  // Get vehicle size price
  const { data: vehicleSize } = await admin
    .from('vehicle_sizes')
    .select('price_pence')
    .eq('id', vehicleSizeId)
    .single();

  const booking = {
    user_id: userId,
    vehicle_id: vehicleId,
    time_slot_id: timeSlotId,
    total_price_pence: vehicleSize?.price_pence || 5999, // Default to medium price if not found
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'cash',
    booking_reference: `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6)}`
  };

  // First check if time slot is available
  const { data: timeSlot } = await admin
    .from('time_slots')
    .select('is_available')
    .eq('id', timeSlotId)
    .single();

  if (!timeSlot?.is_available) {
    throw new Error('Time slot is not available');
  }

  // Create booking
  const { data: createdBooking, error } = await admin
    .from('bookings')
    .insert(booking)
    .select(`
      *,
      vehicle:vehicles(
        registration,
        make,
        model,
        year,
        color,
        vehicle_size:vehicle_sizes(label, price_pence)
      ),
      time_slot:time_slots(slot_date, slot_time)
    `)
    .single();

  await logTestResult({
    step: 'Create Test Booking',
    success: !error,
    data: createdBooking,
    error
  });

  if (error || !createdBooking) {
    throw new Error('Failed to create test booking');
  }

  return createdBooking;
}

async function processRewards(userId: string, bookingId: string) {
  // Calculate points (e.g., 10 points per £1)
  const { data: booking } = await admin
    .from('bookings')
    .select('total_price_pence')
    .eq('id', bookingId)
    .single();

  const pointsEarned = Math.floor((booking?.total_price_pence || 0) / 100) * 10;

  // Add points to user's rewards
  const { data: existingRewards } = await admin
    .from('rewards')
    .select('points')
    .eq('user_id', userId)
    .single();

  const newPoints = (existingRewards?.points || 0) + pointsEarned;

  const { data: rewards, error: rewardsError } = await admin
    .from('rewards')
    .upsert({
      user_id: userId,
      points: newPoints
    })
    .select()
    .single();

  // Record the transaction
  const { error: transactionError } = await admin
    .from('reward_transactions')
    .insert({
      user_id: userId,
      booking_id: bookingId,
      points: pointsEarned,
      type: 'earned',
      description: `Points earned for booking ${bookingId}`
    });

  await logTestResult({
    step: 'Process Rewards',
    success: !rewardsError && !transactionError,
    data: { rewards, pointsEarned },
    error: rewardsError || transactionError
  });

  return { rewards, pointsEarned };
}

async function createOrUseTestUser() {
  // Try to sign in with test user if credentials are provided
  if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
    const { data: user, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD
    });

    if (!error && user?.user) {
      await logTestResult({
        step: 'Use Existing Test User',
        success: true,
        data: { id: user.user.id, email: user.user.email }
      });
      return user.user;
    }
  }

  // If no test user credentials or login failed, create new user
  return createTestUser();
}

async function runEndToEndTest() {
  console.log('Starting End-to-End Booking Flow Test...\n');

  try {
    // Create test user
    const user = await createTestUser();
    if (!user) {
      throw new Error('Failed to create/use test user');
    }

    // Create test vehicle
    const vehicle = await createTestVehicle(user.id);
    if (!vehicle) {
      throw new Error('Failed to create test vehicle');
    }

    // Get test time slot
    const timeSlot = await getTestTimeSlot();
    if (!timeSlot) {
      throw new Error('Failed to get test time slot');
    }

    // Create test booking
    const booking = await createTestBooking(
      user.id,
      vehicle.id,
      timeSlot.id,
      vehicle.size_id
    );
    if (!booking) {
      throw new Error('Failed to create test booking');
    }

    // Process rewards
    const rewards = await processRewards(user.id, booking.id);

    console.log('\n✅ End-to-End Test Completed Successfully!\n');
    console.log('Final Test Summary:');
    console.log('------------------');
    console.log(`User ID: ${booking.user_id}`);
    console.log(`Vehicle: ${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.registration})`);
    console.log(`Size: ${booking.vehicle.vehicle_size.label} (£${booking.vehicle.vehicle_size.price_pence / 100})`);
    console.log(`Booking: ${booking.booking_reference}`);
    console.log(`Date: ${booking.time_slot.slot_date} at ${booking.time_slot.slot_time}`);
    console.log(`Status: ${booking.status} (Payment: ${booking.payment_status})`);
    console.log(`Rewards: ${rewards.pointsEarned} points earned (Total: ${rewards.rewards.points} points)`);
    console.log('------------------\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
  }
}

// Run the test
runEndToEndTest(); 