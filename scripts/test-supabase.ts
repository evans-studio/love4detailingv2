import { config } from 'dotenv';
import path from 'path';
import { supabase, supabaseAdmin, validateConnection } from '../src/lib/api/supabase';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  const isConnected = await validateConnection();
  if (!isConnected) {
    process.exit(1);
  }
}

async function testQueries() {
  console.log('\nTesting basic queries...');

  try {
    // Test users query
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    console.log('Users query:', usersError ? '❌ Failed' : '✅ Success');
    if (usersError) console.error(usersError);

    // Test vehicle sizes query
    const { data: sizes, error: sizesError } = await supabase
      .from('vehicle_sizes')
      .select('*')
      .limit(1);

    console.log('Vehicle sizes query:', sizesError ? '❌ Failed' : '✅ Success');
    if (sizesError) console.error(sizesError);

    // Test time slots query
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .limit(1);

    console.log('Time slots query:', slotsError ? '❌ Failed' : '✅ Success');
    if (slotsError) console.error(slotsError);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

async function testRLS() {
  console.log('\nTesting Row Level Security...');

  try {
    // Try to access protected data with anon client
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);

    console.log('RLS test (should be blocked):', bookingsError ? '✅ Success' : '❌ Failed');

    // Try to access with admin client
    const { data: adminBookings, error: adminError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .limit(1);

    console.log('Admin access test:', adminError ? '❌ Failed' : '✅ Success');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

async function runTests() {
  try {
    await testConnection();
    await testQueries();
    await testRLS();
    console.log('\n✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

runTests(); 