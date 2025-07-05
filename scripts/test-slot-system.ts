#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { format, addDays, startOfWeek } from 'date-fns';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

function addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, duration?: number) {
  results.push({ test, status, message, duration });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  const durationText = duration ? ` (${duration}ms)` : '';
  console.log(`${icon} ${test}: ${message}${durationText}`);
}

async function testDatabaseConnectivity() {
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('time_slots').select('count').limit(1);
    if (error) throw error;
    addResult('Database Connectivity', 'PASS', 'Successfully connected to Supabase', Date.now() - start);
  } catch (error) {
    addResult('Database Connectivity', 'FAIL', `Connection failed: ${error}`);
  }
}

async function testWeeklyScheduleTemplate() {
  const start = Date.now();
  try {
    // Test creating a weekly schedule template
    const testTemplate = {
      day_of_week: 1, // Monday
      working_day: true,
      max_slots: 5,
      start_time: '10:00:00',
      end_time: '18:00:00'
    };

    const { data: template, error: templateError } = await supabase
      .from('weekly_schedule_template')
      .upsert(testTemplate, { onConflict: 'day_of_week' })
      .select()
      .single();

    if (templateError) throw templateError;

    // Test retrieving template
    const { data: retrieved, error: retrieveError } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .eq('day_of_week', 1)
      .single();

    if (retrieveError) throw retrieveError;

    if (retrieved.max_slots === 5 && retrieved.working_day === true) {
      addResult('Weekly Schedule Template', 'PASS', 'Template CRUD operations successful', Date.now() - start);
    } else {
      addResult('Weekly Schedule Template', 'FAIL', 'Template data mismatch');
    }
  } catch (error) {
    addResult('Weekly Schedule Template', 'FAIL', `Template test failed: ${error}`);
  }
}

async function testDailyAvailability() {
  const start = Date.now();
  try {
    const testDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    
    const testAvailability = {
      date: testDate,
      working_day: true,
      max_slots: 3,
      start_time: '09:00:00',
      end_time: '15:00:00'
    };

    const { data: availability, error: availabilityError } = await supabase
      .from('daily_availability')
      .upsert(testAvailability, { onConflict: 'date' })
      .select()
      .single();

    if (availabilityError) throw availabilityError;

    addResult('Daily Availability', 'PASS', 'Daily availability override successful', Date.now() - start);
  } catch (error) {
    addResult('Daily Availability', 'FAIL', `Daily availability test failed: ${error}`);
  }
}

async function testSlotGeneration() {
  const start = Date.now();
  try {
    const weekStart = format(startOfWeek(addDays(new Date(), 14), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    // Call the generate_week_slots function
    const { data: result, error: generateError } = await supabase
      .rpc('generate_week_slots', { week_start_date: weekStart });

    if (generateError) throw generateError;

    // Check if slots were generated
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .gte('slot_date', weekStart)
      .lte('slot_date', format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd'))
      .order('slot_date')
      .order('slot_number');

    if (slotsError) throw slotsError;

    if (slots && slots.length > 0) {
      const validSlots = slots.filter(slot => 
        slot.slot_number >= 1 && 
        slot.slot_number <= 5 &&
        slot.slot_time
      );

      if (validSlots.length === slots.length) {
        addResult('Slot Generation', 'PASS', `Generated ${slots.length} valid slots`, Date.now() - start);
      } else {
        addResult('Slot Generation', 'FAIL', `Invalid slots found: ${slots.length - validSlots.length}`);
      }
    } else {
      addResult('Slot Generation', 'FAIL', 'No slots were generated');
    }
  } catch (error) {
    addResult('Slot Generation', 'FAIL', `Slot generation test failed: ${error}`);
  }
}

async function testSlotAvailabilityCheck() {
  const start = Date.now();
  try {
    const testDate = format(addDays(new Date(), 21), 'yyyy-MM-dd');
    const slotNumber = 1;

    // Call the check_slot_availability function
    const { data: available, error: checkError } = await supabase
      .rpc('check_slot_availability', { 
        check_date: testDate,
        check_slot_number: slotNumber 
      });

    if (checkError) throw checkError;

    if (typeof available === 'boolean') {
      addResult('Slot Availability Check', 'PASS', `Availability check returned: ${available}`, Date.now() - start);
    } else {
      addResult('Slot Availability Check', 'FAIL', 'Availability check returned invalid type');
    }
  } catch (error) {
    addResult('Slot Availability Check', 'FAIL', `Availability check failed: ${error}`);
  }
}

async function testTimeSlotConstraints() {
  const start = Date.now();
  try {
    const testDate = format(addDays(new Date(), 28), 'yyyy-MM-dd');
    
    // Try to create a slot with invalid slot_number
    const { error: invalidSlotError } = await supabase
      .from('time_slots')
      .insert({
        slot_date: testDate,
        slot_number: 6, // Invalid - should be 1-5
        slot_time: '10:00:00',
        is_available: true,
        is_booked: false
      });

    if (invalidSlotError && invalidSlotError.code === '23514') {
      addResult('Time Slot Constraints', 'PASS', 'Slot number constraint enforced', Date.now() - start);
    } else {
      addResult('Time Slot Constraints', 'FAIL', 'Slot number constraint not enforced');
    }
  } catch (error) {
    addResult('Time Slot Constraints', 'FAIL', `Constraint test failed: ${error}`);
  }
}

async function testRLSPolicies() {
  const start = Date.now();
  try {
    // Create a client with anon key to test RLS
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    
    // Try to access admin-only tables
    const { error: templateError } = await anonClient
      .from('weekly_schedule_template')
      .select('*');

    const { error: availabilityError } = await anonClient
      .from('daily_availability')
      .select('*');

    if (templateError && availabilityError) {
      addResult('RLS Policies', 'PASS', 'Admin tables properly protected', Date.now() - start);
    } else {
      addResult('RLS Policies', 'FAIL', 'RLS policies not properly configured');
    }
  } catch (error) {
    addResult('RLS Policies', 'FAIL', `RLS test failed: ${error}`);
  }
}

async function testDataIntegrity() {
  const start = Date.now();
  try {
    // Test that slot_number and SLOT_TIMES are consistent
    const { data: slots, error } = await supabase
      .from('time_slots')
      .select('slot_number, slot_time')
      .limit(10);

    if (error) throw error;

    const SLOT_TIMES = {
      1: '10:00:00',
      2: '11:30:00', 
      3: '13:00:00',
      4: '14:30:00',
      5: '16:00:00'
    };

    let validSlots = 0;
    for (const slot of slots || []) {
      const expectedTime = SLOT_TIMES[slot.slot_number as keyof typeof SLOT_TIMES];
      if (slot.slot_time === expectedTime) {
        validSlots++;
      }
    }

    if (validSlots === (slots?.length || 0)) {
      addResult('Data Integrity', 'PASS', 'Slot times match slot numbers', Date.now() - start);
    } else {
      addResult('Data Integrity', 'FAIL', `${(slots?.length || 0) - validSlots} slots have incorrect times`);
    }
  } catch (error) {
    addResult('Data Integrity', 'FAIL', `Data integrity test failed: ${error}`);
  }
}

async function cleanup() {
  try {
    // Clean up test data
    const futureDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    
    await supabase
      .from('daily_availability')
      .delete()
      .gte('date', futureDate);

    console.log('🧹 Cleanup completed');
  } catch (error) {
    console.log('⚠️ Cleanup failed:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting Slot System Tests\n');

  await testDatabaseConnectivity();
  await testWeeklyScheduleTemplate();
  await testDailyAvailability();
  await testSlotGeneration();
  await testSlotAvailabilityCheck();
  await testTimeSlotConstraints();
  await testRLSPolicies();
  await testDataIntegrity();

  await cleanup();

  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`  • ${result.test}: ${result.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});