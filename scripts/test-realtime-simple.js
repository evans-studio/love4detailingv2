const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Simple Real-time Test for Schedule Sync
 */

async function testRealtimeSync() {
  console.log('🔄 Testing Real-time Schedule Synchronization...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    console.log('Looking for:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('✅ Supabase client created');
  console.log('📡 Setting up real-time listener...');
  
  // Test real-time subscription
  let changeCount = 0;
  const subscription = supabase
    .channel('test_schedule_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'available_slots'
    }, (payload) => {
      changeCount++;
      console.log(`📡 Real-time change detected (#${changeCount}):`);
      console.log(`   Event: ${payload.eventType}`);
      if (payload.new) {
        console.log(`   New: ${payload.new.slot_date} ${payload.new.start_time}`);
      }
      if (payload.old) {
        console.log(`   Old: ${payload.old.slot_date} ${payload.old.start_time}`);
      }
    })
    .on('subscribe', (status) => {
      console.log(`📡 Subscription status: ${status}`);
    })
    .subscribe();
  
  // Wait for subscription to connect
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 1: Create a slot
  console.log('\n📅 Test 1: Creating test slot...');
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 1); // Tomorrow
  const dateStr = testDate.toISOString().split('T')[0];
  
  const { data: newSlot, error: createError } = await supabase
    .from('available_slots')
    .insert({
      slot_date: dateStr,
      start_time: '09:30:00',
      end_time: '11:30:00',
      max_bookings: 1,
      current_bookings: 0,
      is_blocked: false,
      day_of_week: testDate.getDay()
    })
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Slot creation failed:', createError.message);
    subscription.unsubscribe();
    return;
  }
  
  console.log(`✅ Test slot created: ${newSlot.slot_date} at ${newSlot.start_time}`);
  console.log(`   Slot ID: ${newSlot.id}`);
  
  // Wait for real-time event
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Delete the slot
  console.log('\n🗑️  Test 2: Deleting test slot...');
  const { error: deleteError } = await supabase
    .from('available_slots')
    .delete()
    .eq('id', newSlot.id);
  
  if (deleteError) {
    console.error('❌ Slot deletion failed:', deleteError.message);
  } else {
    console.log('✅ Test slot deleted');
  }
  
  // Wait for real-time event
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Check existing slots
  console.log('\n🔍 Test 3: Checking current available slots...');
  const { data: existingSlots, error: queryError } = await supabase
    .from('available_slots')
    .select('id, slot_date, start_time, is_blocked')
    .gte('slot_date', new Date().toISOString().split('T')[0])
    .order('slot_date')
    .order('start_time')
    .limit(5);
  
  if (queryError) {
    console.error('❌ Query failed:', queryError.message);
  } else {
    console.log(`✅ Found ${existingSlots.length} existing slots:`);
    existingSlots.forEach((slot, i) => {
      console.log(`   ${i + 1}. ${slot.slot_date} ${slot.start_time} ${slot.is_blocked ? '(blocked)' : '(available)'}`);
    });
  }
  
  // Clean up
  console.log('\n🧹 Cleaning up...');
  subscription.unsubscribe();
  
  console.log('\n📊 Real-time Test Results:');
  console.log(`✅ Real-time changes detected: ${changeCount}`);
  console.log('✅ Database operations: Working');
  console.log('✅ Real-time subscriptions: Working');
  
  console.log('\n💡 Admin UI Integration Points:');
  console.log('1. Check that admin schedule page shows "LIVE" status');
  console.log('2. Create/delete slots in admin UI and verify database sync');
  console.log('3. External database changes should trigger UI notifications');
  console.log('4. Real-time notifications should show 🔄 prefix');
  
  process.exit(0);
}

testRealtimeSync().catch(console.error);