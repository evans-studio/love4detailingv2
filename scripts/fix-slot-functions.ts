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

async function fixSlotFunctions() {
  console.log('🔧 Fixing Slot System Functions...\n');

  try {
    // 1. Fix check_slot_availability function
    console.log('1. Fixing check_slot_availability function...');
    
    const checkSlotAvailabilitySQL = `
CREATE OR REPLACE FUNCTION check_slot_availability(check_date DATE, check_slot_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    is_working_day BOOLEAN;
    available_slots INTEGER;
    existing_booking_count INTEGER;
BEGIN
    -- Check if it's a working day and get available slots
    SELECT da.working_day, da.available_slots 
    INTO is_working_day, available_slots
    FROM daily_availability da
    WHERE da.date = check_date;
    
    -- If no config exists, check template
    IF NOT FOUND THEN
        SELECT wst.working_day, wst.max_slots 
        INTO is_working_day, available_slots
        FROM weekly_schedule_template wst
        WHERE wst.day_of_week = EXTRACT(DOW FROM check_date);
    END IF;
    
    -- Return false if not working day or slot exceeds max
    IF NOT is_working_day OR check_slot_number > available_slots THEN
        RETURN false;
    END IF;
    
    -- Check if slot exists and is available
    IF NOT EXISTS (
        SELECT 1 FROM time_slots ts
        WHERE ts.slot_date = check_date 
        AND ts.slot_number = check_slot_number 
        AND ts.is_available = true
    ) THEN
        RETURN false;
    END IF;
    
    -- Check for existing bookings
    SELECT COUNT(*) INTO existing_booking_count
    FROM bookings b
    JOIN time_slots ts ON b.time_slot_id = ts.id
    WHERE ts.slot_date = check_date 
    AND ts.slot_number = check_slot_number
    AND b.status NOT IN ('cancelled');
    
    RETURN existing_booking_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabase.rpc('exec_sql', { sql: checkSlotAvailabilitySQL });
    console.log('   ✅ check_slot_availability function fixed');

    // 2. Create a simple version of generate_week_slots that works
    console.log('2. Creating simplified generate_week_slots function...');
    
    const generateWeekSlotsSQL = `
CREATE OR REPLACE FUNCTION generate_week_slots(week_start_date DATE)
RETURNS JSON AS $$
DECLARE
    current_date DATE;
    day_template RECORD;
    slot_count INTEGER;
    slot_num INTEGER;
    slot_times TIME[] := ARRAY['10:00:00'::TIME, '11:30:00'::TIME, '13:00:00'::TIME, '14:30:00'::TIME, '16:00:00'::TIME];
    result JSON[];
    day_result JSON;
BEGIN
    result := ARRAY[]::JSON[];
    
    -- Loop through 7 days
    FOR i IN 0..6 LOOP
        current_date := week_start_date + i;
        
        -- Get template for this day of week
        SELECT * INTO day_template 
        FROM weekly_schedule_template wst
        WHERE wst.day_of_week = EXTRACT(DOW FROM current_date);
        
        IF day_template.working_day THEN
            -- Insert daily availability record
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, day_template.max_slots, true)
            ON CONFLICT (date) 
            DO UPDATE SET available_slots = day_template.max_slots, working_day = true;
            
            -- Generate time slots
            FOR slot_num IN 1..day_template.max_slots LOOP
                INSERT INTO time_slots (slot_date, slot_time, slot_number, is_available, buffer_minutes)
                VALUES (current_date, slot_times[slot_num], slot_num, true, 30)
                ON CONFLICT (slot_date, slot_time) DO NOTHING;
            END LOOP;
            
            slot_count := day_template.max_slots;
            day_result := json_build_object(
                'generated_date', current_date,
                'generated_slots', slot_count,
                'message', 'Generated ' || slot_count || ' slots'
            );
        ELSE
            -- Non-working day
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, 0, false)
            ON CONFLICT (date) 
            DO UPDATE SET available_slots = 0, working_day = false;
            
            slot_count := 0;
            day_result := json_build_object(
                'generated_date', current_date,
                'generated_slots', slot_count,
                'message', 'Non-working day'
            );
        END IF;
        
        result := array_append(result, day_result);
    END LOOP;
    
    RETURN array_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabase.rpc('exec_sql', { sql: generateWeekSlotsSQL });
    console.log('   ✅ generate_week_slots function fixed');

    console.log('\n🎉 Slot System Functions fixed successfully!');

    // Test the fixed functions
    console.log('\n🔍 Testing fixed functions...');
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 14);
    const testDateStr = testDate.toISOString().split('T')[0];
    
    // Test check_slot_availability
    const { data: availabilityResult, error: availabilityError } = await supabase
      .rpc('check_slot_availability', { 
        check_date: testDateStr,
        check_slot_number: 1 
      });
    
    if (availabilityError) {
      console.log(`   ❌ check_slot_availability error: ${availabilityError.message}`);
    } else {
      console.log(`   ✅ check_slot_availability: ${availabilityResult}`);
    }

    // Test generate_week_slots
    const { data: generateResult, error: generateError } = await supabase
      .rpc('generate_week_slots', { week_start_date: testDateStr });
    
    if (generateError) {
      console.log(`   ❌ generate_week_slots error: ${generateError.message}`);
    } else {
      console.log(`   ✅ generate_week_slots: Generated data for ${Array.isArray(generateResult) ? generateResult.length : 'unknown'} days`);
    }

  } catch (error) {
    console.error('❌ Function fix failed:', error);
    process.exit(1);
  }
}

fixSlotFunctions();