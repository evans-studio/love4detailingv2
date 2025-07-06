import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);

async function getValidIds() {
  console.log('🔍 Getting valid IDs for testing...');
  
  try {
    // Get vehicle sizes
    const { data: vehicleSizes, error: sizeError } = await supabaseServiceRole
      .from('vehicle_sizes')
      .select('id, label, price_pence')
      .limit(5);
    
    console.log('🚗 Vehicle sizes:', vehicleSizes);
    if (sizeError) console.error('Size error:', sizeError);
    
    // Get available time slots
    const { data: timeSlots, error: timeError } = await supabaseServiceRole
      .from('time_slots')
      .select('id, slot_date, slot_time, is_available')
      .eq('is_available', true)
      .gte('slot_date', new Date().toISOString().split('T')[0])
      .limit(5);
    
    console.log('⏰ Available time slots:', timeSlots);
    if (timeError) console.error('Time slot error:', timeError);
    
    return {
      vehicleSizes,
      timeSlots
    };
    
  } catch (error) {
    console.error('💥 Error getting IDs:', error);
    return null;
  }
}

async function main() {
  await getValidIds();
}

main().catch(console.error);