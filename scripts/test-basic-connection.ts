import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testConnection() {
  try {
    // Test a simple query
    const { data, error } = await supabase
      .from('vehicle_sizes')
      .select('*')
      .limit(1);

    if (error) throw error;

    console.log('✅ Successfully connected to Supabase!');
    console.log('Data:', data);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }
}

testConnection(); 