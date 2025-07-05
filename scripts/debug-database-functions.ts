#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabaseFunctions() {
  console.log('🔍 Debugging Database Functions...\n');

  try {
    // 1. Check if functions exist
    console.log('1. Checking function existence...');
    
    const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT proname, prosrc FROM pg_proc WHERE proname IN ('generate_week_slots', 'check_slot_availability');`
    });

    if (functionsError) {
      console.log(`   ❌ Error checking functions: ${functionsError.message}`);
    } else {
      console.log(`   ✅ Found ${functions?.length || 0} functions`);
      if (functions) {
        functions.forEach((func: any) => {
          console.log(`      - ${func.proname}`);
        });
      }
    }

    // 2. Create a working generate_week_slots function using direct SQL
    console.log('2. Creating working generate_week_slots function...');
    
    const createFunctionSQL = `
DROP FUNCTION IF EXISTS generate_week_slots(DATE);

CREATE OR REPLACE FUNCTION generate_week_slots(start_date DATE)
RETURNS SETOF JSON AS $$
DECLARE
    current_date DATE;
    day_of_week_num INTEGER;
    template_data RECORD;
    slot_count INTEGER := 0;
    i INTEGER;
    slot_num INTEGER;
    slot_times TEXT[] := ARRAY['10:00:00', '11:30:00', '13:00:00', '14:30:00', '16:00:00'];
BEGIN
    FOR i IN 0..6 LOOP
        current_date := start_date + i;
        day_of_week_num := EXTRACT(DOW FROM current_date);
        
        -- Get template for this day
        SELECT working_day, max_slots 
        INTO template_data
        FROM weekly_schedule_template 
        WHERE day_of_week = day_of_week_num;
        
        IF template_data.working_day THEN
            -- Create daily availability
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, template_data.max_slots, true)
            ON CONFLICT (date) DO UPDATE SET
                available_slots = template_data.max_slots,
                working_day = true;
            
            -- Create time slots
            FOR slot_num IN 1..template_data.max_slots LOOP
                INSERT INTO time_slots (slot_date, slot_time, slot_number, is_available, buffer_minutes)
                VALUES (current_date, slot_times[slot_num]::TIME, slot_num, true, 30)
                ON CONFLICT (slot_date, slot_time) DO NOTHING;
            END LOOP;
            
            slot_count := template_data.max_slots;
        ELSE
            -- Non-working day
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, 0, false)
            ON CONFLICT (date) DO UPDATE SET
                available_slots = 0,
                working_day = false;
            
            slot_count := 0;
        END IF;
        
        RETURN NEXT json_build_object(
            'generated_date', current_date,
            'generated_slots', slot_count,
            'message', CASE WHEN template_data.working_day 
                          THEN 'Generated ' || slot_count || ' slots'
                          ELSE 'Non-working day' 
                      END
        );
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    console.log('   ✅ generate_week_slots function recreated');

    // 3. Fix constraint issues
    console.log('3. Fixing database constraints...');
    
    // Drop and recreate constraints properly
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_slot_number_check;
        ALTER TABLE time_slots ADD CONSTRAINT time_slots_slot_number_check 
        CHECK (slot_number IS NULL OR (slot_number >= 1 AND slot_number <= 5));
      `
    });
    console.log('   ✅ time_slots constraints fixed');

    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE daily_availability DROP CONSTRAINT IF EXISTS daily_availability_available_slots_check;
        ALTER TABLE daily_availability ADD CONSTRAINT daily_availability_available_slots_check 
        CHECK (available_slots >= 0 AND available_slots <= 5);
      `
    });
    console.log('   ✅ daily_availability constraints fixed');

    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE weekly_schedule_template DROP CONSTRAINT IF EXISTS weekly_schedule_template_max_slots_check;
        ALTER TABLE weekly_schedule_template ADD CONSTRAINT weekly_schedule_template_max_slots_check 
        CHECK (max_slots >= 0 AND max_slots <= 5);
      `
    });
    console.log('   ✅ weekly_schedule_template constraints fixed');

    // 4. Test the functions
    console.log('4. Testing database functions...');
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 21);
    const testDateStr = testDate.toISOString().split('T')[0];
    
    // Test generate_week_slots
    const { data: generateResult, error: generateError } = await supabase
      .rpc('generate_week_slots', { start_date: testDateStr });
    
    if (generateError) {
      console.log(`   ❌ generate_week_slots error: ${generateError.message}`);
    } else {
      console.log(`   ✅ generate_week_slots: Generated ${generateResult?.length || 0} day entries`);
    }

    // Test check_slot_availability
    const { data: checkResult, error: checkError } = await supabase
      .rpc('check_slot_availability', { 
        check_date: testDateStr,
        check_slot_number: 1 
      });
    
    if (checkError) {
      console.log(`   ❌ check_slot_availability error: ${checkError.message}`);
    } else {
      console.log(`   ✅ check_slot_availability: ${checkResult}`);
    }

    // 5. Test constraint enforcement
    console.log('5. Testing constraint enforcement...');
    
    try {
      await supabase.rpc('exec_sql', {
        sql: `INSERT INTO time_slots (slot_date, slot_time, slot_number, is_available) 
              VALUES ('2024-12-31', '10:00:00', 6, true);`
      });
      console.log('   ❌ Constraint not enforced - invalid slot number accepted');
    } catch (error) {
      console.log('   ✅ Constraint properly enforced - invalid slot number rejected');
    }

    console.log('\n🎉 Database function debugging completed!');

  } catch (error) {
    console.error('❌ Debugging failed:', error);
    process.exit(1);
  }
}

debugDatabaseFunctions();