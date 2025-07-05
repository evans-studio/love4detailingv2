import { config } from 'dotenv';
import path from 'path';
import { supabase, supabaseAdmin } from '../src/lib/api/supabase';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

if (!supabaseAdmin) {
  throw new Error('Supabase admin client is not initialized');
}

// Since we check for null above, we can safely assert supabaseAdmin is non-null
const admin = supabaseAdmin;

async function testTableAccess() {
  console.log('\n🔍 Testing table access...');

  try {
    // Test vehicle_sizes
    const { data: sizes, error: sizesError } = await supabase
      .from('vehicle_sizes')
      .select('*')
      .limit(1);
    console.log('vehicle_sizes:', sizesError ? '❌ Failed' : '✅ Success');
    if (sizesError) console.error(sizesError);

    // Test time_slots
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .limit(1);
    console.log('time_slots:', slotsError ? '❌ Failed' : '✅ Success');
    if (slotsError) console.error(slotsError);

    // Test rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .limit(1);
    console.log('rewards:', rewardsError ? '❌ Failed' : '✅ Success');
    if (rewardsError) console.error(rewardsError);

  } catch (error) {
    console.error('❌ Table access test failed:', error);
  }
}

async function testBookingFlow() {
  console.log('\n📝 Testing booking flow...');

  try {
    // Create test user
    const testEmail = `test${Date.now()}@love4detailing.com`;
    const { data: { user }, error: userError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: 'testpass123',
      email_confirm: true
    });

    if (userError) throw userError;
    console.log('✅ Created test user');

    // Create user profile
    const { data: profile, error: profileError } = await admin
      .from('users')
      .insert({
        id: user!.id,
        email: user!.email,
        full_name: 'Test User',
        phone: '+44123456789',
        role: 'customer'
      })
      .select()
      .single();

    if (profileError) throw profileError;
    console.log('✅ Created user profile');

    // Create test vehicle size
    const { data: size, error: sizeError } = await admin
      .from('vehicle_sizes')
      .insert({
        label: `Test Size ${Date.now()}`,
        description: 'Test vehicle size',
        price_pence: 9999
      })
      .select()
      .single();

    if (sizeError) throw sizeError;
    console.log('✅ Created vehicle size');

    // Create test vehicle
    const { data: vehicle, error: vehicleError } = await admin
      .from('vehicles')
      .insert({
        user_id: user!.id,
        registration: 'TEST123',
        make: 'BMW',
        model: '3 Series',
        year: '2023',
        size_id: size.id
      })
      .select()
      .single();

    if (vehicleError) throw vehicleError;
    console.log('✅ Created test vehicle');

    // Create test time slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { data: slot, error: slotError } = await admin
      .from('time_slots')
      .insert({
        slot_date: tomorrow.toISOString().split('T')[0],
        slot_time: '10:00:00'
      })
      .select()
      .single();

    if (slotError) throw slotError;
    console.log('✅ Created time slot');

    // Create test booking
    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .insert({
        user_id: user!.id,
        vehicle_id: vehicle.id,
        time_slot_id: slot.id,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash',
        total_price_pence: 9999,
        booking_reference: 'TEST-' + Date.now(),
        email: testEmail,
        full_name: 'Test User',
        phone: '+44123456789'
      })
      .select()
      .single();

    if (bookingError) throw bookingError;
    console.log('✅ Created test booking');

    // Clean up
    await admin.from('bookings').delete().eq('id', booking.id);
    await admin.from('vehicles').delete().eq('id', vehicle.id);
    await admin.from('vehicle_sizes').delete().eq('id', size.id);
    await admin.from('time_slots').delete().eq('id', slot.id);
    await admin.from('users').delete().eq('id', user!.id);
    await admin.auth.admin.deleteUser(user!.id);
    console.log('✅ Cleaned up test data');

  } catch (error) {
    console.error('❌ Booking flow test failed:', error);
  }
}

async function testMissingVehicles() {
  console.log('\n🚗 Testing missing vehicle reporting...');

  try {
    // Create missing vehicle record
    const { data: vehicle, error: vehicleError } = await admin
      .from('missing_vehicle_models')
      .insert({
        registration: 'UNKNOWN1',
        make: 'Unknown Make',
        model: 'Unknown Model'
      })
      .select()
      .single();

    if (vehicleError) throw vehicleError;
    console.log('✅ Created missing vehicle record');

    // Clean up
    await admin.from('missing_vehicle_models').delete().eq('id', vehicle.id);
    console.log('✅ Cleaned up test data');

  } catch (error) {
    console.error('❌ Missing vehicles test failed:', error);
  }
}

async function runTests() {
  try {
    console.log('🚀 Starting comprehensive Supabase tests...\n');
    
    await testTableAccess();
    await testBookingFlow();
    await testMissingVehicles();

    console.log('\n✨ All tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

runTests();