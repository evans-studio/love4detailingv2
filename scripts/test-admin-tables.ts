import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAdminTables() {
  console.log('Testing admin table access...');
  
  try {
    // Test weekly_schedule_template table
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .limit(1);
    
    if (scheduleError) {
      console.error('Weekly schedule template error:', scheduleError);
    } else {
      console.log('✓ weekly_schedule_template table accessible');
      console.log('Sample data:', scheduleData);
    }

    // Test daily_availability table
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_availability')
      .select('*')
      .limit(1);
    
    if (dailyError) {
      console.error('Daily availability error:', dailyError);
    } else {
      console.log('✓ daily_availability table accessible');
      console.log('Sample data:', dailyData);
    }

    // Test time_slots table
    const { data: slotsData, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .limit(1);
    
    if (slotsError) {
      console.error('Time slots error:', slotsError);
    } else {
      console.log('✓ time_slots table accessible');
      console.log('Sample data:', slotsData);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAdminTables();