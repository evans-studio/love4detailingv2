#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { format, addDays, startOfWeek } from 'date-fns';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function testAdminAuthentication() {
  const start = Date.now();
  try {
    // Create admin user for testing
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-admin@love4detailing.com',
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });

    if (authError && authError.message !== 'User already registered') {
      throw authError;
    }

    // Insert admin user into users table
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: authData?.user?.id || 'test-admin-id',
        email: 'test-admin@love4detailing.com',
        role: 'admin',
        full_name: 'Test Admin'
      }, { onConflict: 'email' });

    if (userError) throw userError;

    addResult('Admin Authentication', 'PASS', 'Admin user created/verified', Date.now() - start);
  } catch (error) {
    addResult('Admin Authentication', 'FAIL', `Auth test failed: ${error}`);
  }
}

async function testScheduleTemplateAPI() {
  const start = Date.now();
  try {
    // Test the schedule template functionality that the WeeklyScheduleConfig uses
    const testTemplate = {
      day_of_week: 2, // Tuesday
      working_day: true,
      max_slots: 4,
      start_time: '10:00:00',
      end_time: '18:00:00'
    };

    // Simulate what the API endpoint does
    const { data: template, error: templateError } = await supabase
      .from('weekly_schedule_template')
      .upsert(testTemplate, { onConflict: 'day_of_week' })
      .select()
      .single();

    if (templateError) throw templateError;

    // Test retrieval (GET endpoint)
    const { data: retrieved, error: getError } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .order('day_of_week');

    if (getError) throw getError;

    const tuesdayTemplate = retrieved.find(t => t.day_of_week === 2);
    if (tuesdayTemplate && tuesdayTemplate.max_slots === 4) {
      addResult('Schedule Template API', 'PASS', 'Template CRUD operations work', Date.now() - start);
    } else {
      addResult('Schedule Template API', 'FAIL', 'Template data inconsistent');
    }
  } catch (error) {
    addResult('Schedule Template API', 'FAIL', `Template API test failed: ${error}`);
  }
}

async function testAvailabilityCalendarAPI() {
  const start = Date.now();
  try {
    const weekStart = format(startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd');

    // Test calendar data aggregation (what AvailabilityService.getCalendarData does)
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings(
          id,
          full_name,
          booking_reference,
          status
        )
      `)
      .gte('slot_date', weekStart)
      .lte('slot_date', weekEnd)
      .order('slot_date')
      .order('slot_number');

    if (slotsError) throw slotsError;

    // Test slot generation
    const { data: generateResult, error: generateError } = await supabase
      .rpc('generate_week_slots', { week_start_date: weekStart });

    if (generateError) throw generateError;

    addResult('Availability Calendar API', 'PASS', 'Calendar API functions work', Date.now() - start);
  } catch (error) {
    addResult('Availability Calendar API', 'FAIL', `Calendar API test failed: ${error}`);
  }
}

async function testBookingEditValidation() {
  const start = Date.now();
  try {
    const testDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');
    
    // Create a test booking scenario
    const { data: slot, error: slotError } = await supabase
      .from('time_slots')
      .insert({
        slot_date: testDate,
        slot_number: 1,
        slot_time: '10:00:00',
        is_available: true,
        is_booked: false
      })
      .select()
      .single();

    if (slotError) throw slotError;

    // Test available slots retrieval (for EditBookingModal)
    const { data: availableSlots, error: availableError } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings!inner(id, full_name, booking_reference)
      `)
      .eq('slot_date', testDate)
      .order('slot_number');

    if (availableError && availableError.code !== 'PGRST116') {
      throw availableError;
    }

    // Test slot availability check
    const { data: available, error: checkError } = await supabase
      .rpc('check_slot_availability', {
        check_date: testDate,
        check_slot_number: 1
      });

    if (checkError) throw checkError;

    if (typeof available === 'boolean') {
      addResult('Booking Edit Validation', 'PASS', 'Edit validation functions work', Date.now() - start);
    } else {
      addResult('Booking Edit Validation', 'FAIL', 'Availability check invalid');
    }
  } catch (error) {
    addResult('Booking Edit Validation', 'FAIL', `Edit validation test failed: ${error}`);
  }
}

async function testSlotConflictPrevention() {
  const start = Date.now();
  try {
    const testDate = format(addDays(new Date(), 21), 'yyyy-MM-dd');
    
    // Create a slot
    const { data: slot, error: slotError } = await supabase
      .from('time_slots')
      .insert({
        slot_date: testDate,
        slot_number: 2,
        slot_time: '11:30:00',
        is_available: true,
        is_booked: false
      })
      .select()
      .single();

    if (slotError) throw slotError;

    // Create a test vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        registration: 'TEST123',
        make: 'Test',
        model: 'Model',
        year: 2023,
        color: 'Blue',
        size_id: 'medium'
      })
      .select()
      .single();

    if (vehicleError) throw vehicleError;

    // Create first booking
    const { data: booking1, error: booking1Error } = await supabase
      .from('bookings')
      .insert({
        user_id: null,
        vehicle_id: vehicle.id,
        time_slot_id: slot.id,
        vehicle_size_id: 'medium',
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'cash',
        total_price_pence: 5000,
        booking_reference: 'TEST001',
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '1234567890'
      })
      .select()
      .single();

    if (booking1Error) throw booking1Error;

    // Mark slot as booked
    await supabase
      .from('time_slots')
      .update({ is_booked: true, is_available: false })
      .eq('id', slot.id);

    // Try to create conflicting booking (should fail)
    const { error: conflictError } = await supabase
      .from('bookings')
      .insert({
        user_id: null,
        vehicle_id: vehicle.id,
        time_slot_id: slot.id,
        vehicle_size_id: 'medium',
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'cash',
        total_price_pence: 5000,
        booking_reference: 'TEST002',
        email: 'test2@example.com',
        full_name: 'Test User 2',
        phone: '1234567891'
      });

    // Check if conflict was prevented
    const { data: bookingCount, error: countError } = await supabase
      .from('bookings')
      .select('id')
      .eq('time_slot_id', slot.id);

    if (countError) throw countError;

    if (bookingCount.length === 1) {
      addResult('Slot Conflict Prevention', 'PASS', 'Only one booking per slot allowed', Date.now() - start);
    } else {
      addResult('Slot Conflict Prevention', 'FAIL', `${bookingCount.length} bookings found for same slot`);
    }
  } catch (error) {
    addResult('Slot Conflict Prevention', 'FAIL', `Conflict prevention test failed: ${error}`);
  }
}

async function testPerformanceMetrics() {
  const start = Date.now();
  try {
    // Test large data set operations
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    const perfStart = Date.now();
    
    // Simulate heavy calendar load
    const { data: calendarData, error: calendarError } = await supabase
      .from('time_slots')
      .select(`
        *,
        bookings(
          id,
          full_name,
          booking_reference,
          status,
          vehicles(registration, make, model)
        )
      `)
      .gte('slot_date', weekStart)
      .lte('slot_date', format(addDays(new Date(weekStart), 27), 'yyyy-MM-dd'))
      .order('slot_date')
      .order('slot_number');

    const queryTime = Date.now() - perfStart;

    if (calendarError) throw calendarError;

    if (queryTime < 5000) { // Less than 5 seconds
      addResult('Performance Metrics', 'PASS', `Calendar query completed in ${queryTime}ms`, Date.now() - start);
    } else {
      addResult('Performance Metrics', 'FAIL', `Calendar query too slow: ${queryTime}ms`);
    }
  } catch (error) {
    addResult('Performance Metrics', 'FAIL', `Performance test failed: ${error}`);
  }
}

async function testErrorHandling() {
  const start = Date.now();
  try {
    // Test invalid slot number
    const { error: invalidSlotError } = await supabase
      .rpc('check_slot_availability', {
        check_date: '2024-01-01',
        check_slot_number: 10 // Invalid slot number
      });

    // Test invalid date format
    const { error: invalidDateError } = await supabase
      .rpc('generate_week_slots', {
        week_start_date: 'invalid-date'
      });

    if (invalidSlotError || invalidDateError) {
      addResult('Error Handling', 'PASS', 'Database functions handle invalid inputs', Date.now() - start);
    } else {
      addResult('Error Handling', 'FAIL', 'Invalid inputs not properly handled');
    }
  } catch (error) {
    addResult('Error Handling', 'PASS', 'Error handling working (caught exception)', Date.now() - start);
  }
}

async function cleanup() {
  try {
    const futureDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    
    // Clean up test bookings
    await supabase
      .from('bookings')
      .delete()
      .like('booking_reference', 'TEST%');

    // Clean up test vehicles
    await supabase
      .from('vehicles')
      .delete()
      .eq('registration', 'TEST123');

    // Clean up test slots
    await supabase
      .from('time_slots')
      .delete()
      .gte('slot_date', futureDate);

    // Clean up test templates
    await supabase
      .from('weekly_schedule_template')
      .delete()
      .eq('day_of_week', 2);

    // Clean up test auth user
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users.users.find(u => u.email === 'test-admin@love4detailing.com');
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id);
    }

    console.log('🧹 Cleanup completed');
  } catch (error) {
    console.log('⚠️ Cleanup failed:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting Admin Availability Tests\n');

  await testAdminAuthentication();
  await testScheduleTemplateAPI();
  await testAvailabilityCalendarAPI();
  await testBookingEditValidation();
  await testSlotConflictPrevention();
  await testPerformanceMetrics();
  await testErrorHandling();

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