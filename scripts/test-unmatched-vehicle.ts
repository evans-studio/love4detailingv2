import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Check which environment we're using
const isLocal = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') || 
                process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1');

console.log(`🔧 Using ${isLocal ? 'LOCAL' : 'PRODUCTION'} Supabase environment`);
console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testUnmatchedVehicle() {
  console.log('\n🚗 Testing unmatched vehicle functionality...');

  try {
    // 1. Check existing records
    console.log('\n1. Checking existing unmatched vehicles...');
    const { data: existing, error: existingError } = await supabase
      .from('missing_vehicle_models')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (existingError) {
      console.error('Error fetching existing records:', existingError);
      throw existingError;
    }
    console.log('✅ Recent unmatched vehicles:', existing);

    // Only insert test data if we're in local environment
    if (isLocal) {
      // 2. Insert test vehicle
      console.log('\n2. Creating test unmatched vehicle record...');
      const { data: inserted, error: insertError } = await supabase
        .from('missing_vehicle_models')
        .insert({
          make: 'UnknownMake',
          model: 'UnknownModel',
          registration: 'TEST123'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      console.log('✅ Test record created:', inserted);

      // 3. Verify the record exists
      console.log('\n3. Verifying record in database...');
      const { data: unmatched, error: fetchError } = await supabase
        .from('missing_vehicle_models')
        .select('*')
        .eq('registration', 'TEST123')
        .single();

      if (fetchError) throw fetchError;
      console.log('✅ Record verified:', unmatched);
    } else {
      console.log('\n⚠️ Skipping test data creation in production environment');
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUnmatchedVehicle(); 