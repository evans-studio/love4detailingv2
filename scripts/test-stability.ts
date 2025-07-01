import { config } from 'dotenv';
import path from 'path';
import { supabase, supabaseAdmin } from '../src/lib/api/supabase';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function testStability() {
  console.log('Running stability tests...');

  try {
    // Test 1: Rapid sequential queries
    console.log('\nTest 1: Rapid sequential queries');
    const promises = Array(10).fill(null).map(() => 
      supabase.from('vehicle_sizes').select('*')
    );
    
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    console.log(`✅ Completed ${results.length - errors.length} of ${results.length} queries`);
    if (errors.length) {
      console.error('❌ Errors:', errors.map(e => e.error?.message));
    }

    // Test 2: Large data fetch
    console.log('\nTest 2: Large data fetch');
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        users (id, email),
        vehicles (id, registration),
        time_slots (id, slot_date)
      `)
      .limit(100);

    if (bookingsError) {
      console.error('❌ Large data fetch failed:', bookingsError);
    } else {
      console.log(`✅ Successfully fetched ${bookings.length} bookings with relations`);
    }

    // Test 3: Write operation stability
    console.log('\nTest 3: Write operation stability');
    const testUser = {
      email: 'stability-test@love4detailing.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '+44123456789'
    };

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (userError) {
      console.error('❌ Write operation failed:', userError);
    } else {
      console.log('✅ Write operation successful');
      // Clean up test user
      await supabaseAdmin.from('users').delete().eq('id', user.id);
    }

  } catch (error) {
    console.error('❌ Stability test failed:', error);
    process.exit(1);
  }

  console.log('\n✅ All stability tests completed!\n');
}

testStability(); 