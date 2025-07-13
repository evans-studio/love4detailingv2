const { createClient } = require('@supabase/supabase-js');

/**
 * Debug Why Booking Form Calendar Shows No Available Slots
 */

async function debugBookingSlots() {
  console.log('🔍 Debugging why booking form calendar shows no available slots...\n');
  
  const supabaseUrl = 'https://lczzvvnspsuacshfawpe.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjenp2dm5zcHN1YWNzaGZhd3BlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMxNTc0NiwiZXhwIjoyMDY2ODkxNzQ2fQ._xtRXgSFQk2wF2PkZEdNG7EP1gFxQCuVKW1RHseGsUY';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Step 1: Check what slots exist in the database
  console.log('📋 Step 1: Checking database for available slots...');
  const { data: dbSlots, error: dbError } = await supabase
    .from('available_slots')
    .select('*')
    .gte('slot_date', new Date().toISOString().split('T')[0])
    .order('slot_date')
    .order('start_time');
  
  if (dbError) {
    console.error('❌ Database query failed:', dbError.message);
    return;
  }
  
  console.log(`📊 Found ${dbSlots.length} total slots in database:`);
  dbSlots.forEach((slot, i) => {
    console.log(`   ${i + 1}. ${slot.slot_date} ${slot.start_time} - Available: ${!slot.is_blocked && (slot.current_bookings || 0) < (slot.max_bookings || 1)}`);
    console.log(`      Blocked: ${slot.is_blocked}, Bookings: ${slot.current_bookings}/${slot.max_bookings}`);
  });
  
  // Step 2: Test the customer API directly
  console.log('\n🌐 Step 2: Testing customer API endpoints...');
  
  const testDates = [
    new Date().toISOString().split('T')[0], // Today
    new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0], // Tomorrow
    new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0], // Day after tomorrow
  ];
  
  for (const testDate of testDates) {
    console.log(`\n📅 Testing date: ${testDate}`);
    
    // Test single date API
    try {
      const response = await fetch(`http://localhost:3000/api/bookings/available-slots?date=${testDate}`);
      const result = await response.json();
      
      console.log(`   Single date API (date=${testDate}):`);
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Success: ${result.success}`);
      if (result.success) {
        console.log(`   - Slots returned: ${result.data.slots.length}`);
        result.data.slots.forEach((slot, i) => {
          console.log(`     ${i + 1}. ${slot.date} ${slot.start_time} - ${slot.price_formatted}`);
        });
      } else {
        console.log(`   - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   - API call failed: ${error.message}`);
    }
    
    // Test date range API (what calendar uses)
    try {
      const response = await fetch(`http://localhost:3000/api/bookings/available-slots?date_start=${testDate}&date_end=${testDate}`);
      const result = await response.json();
      
      console.log(`   Date range API (date_start=${testDate}):`);
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Success: ${result.success}`);
      if (result.success) {
        console.log(`   - Slots returned: ${result.data.slots.length}`);
        result.data.slots.forEach((slot, i) => {
          console.log(`     ${i + 1}. ${slot.date} ${slot.start_time} - ${slot.price_formatted}`);
        });
      } else {
        console.log(`   - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   - API call failed: ${error.message}`);
    }
  }
  
  // Step 3: Create a test slot for a future date to verify the flow
  console.log('\n🧪 Step 3: Creating test slot for verification...');
  const testDate = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
  
  const { data: testSlot, error: createError } = await supabase
    .from('available_slots')
    .insert({
      slot_date: testDate,
      start_time: '15:00:00',
      end_time: '17:00:00',
      max_bookings: 1,
      current_bookings: 0,
      is_blocked: false,
      day_of_week: new Date(testDate).getDay()
    })
    .select()
    .single();
  
  if (createError) {
    console.log('⚠️  Test slot creation failed (may already exist):', createError.message);
  } else {
    console.log(`✅ Created test slot: ${testSlot.slot_date} at ${testSlot.start_time}`);
    
    // Test the API again with this slot
    console.log('\n🔄 Step 4: Testing API with new test slot...');
    try {
      const response = await fetch(`http://localhost:3000/api/bookings/available-slots?date=${testDate}`);
      const result = await response.json();
      
      console.log(`API response after creating test slot:`);
      console.log(`- Status: ${response.status}`);
      console.log(`- Success: ${result.success}`);
      if (result.success) {
        console.log(`- Slots returned: ${result.data.slots.length}`);
        const foundTestSlot = result.data.slots.find(slot => slot.slot_id === testSlot.id);
        if (foundTestSlot) {
          console.log('✅ Test slot appears in API response!');
        } else {
          console.log('❌ Test slot NOT found in API response');
        }
      }
    } catch (error) {
      console.log(`API test failed: ${error.message}`);
    }
    
    // Cleanup test slot
    await supabase.from('available_slots').delete().eq('id', testSlot.id);
    console.log('🧹 Test slot cleaned up');
  }
  
  // Step 5: Check if there's a date/timezone issue
  console.log('\n🕐 Step 5: Checking date/timezone issues...');
  const now = new Date();
  console.log(`Current time: ${now.toISOString()}`);
  console.log(`Current date (local): ${now.toLocaleDateString()}`);
  console.log(`Current date (ISO): ${now.toISOString().split('T')[0]}`);
  
  // Check if slots exist for today specifically
  const todaySlots = dbSlots.filter(slot => slot.slot_date >= now.toISOString().split('T')[0]);
  console.log(`Slots from today onwards: ${todaySlots.length}`);
  
  console.log('\n📊 Debug Summary:');
  console.log(`- Total slots in DB: ${dbSlots.length}`);
  console.log(`- Slots from today onwards: ${todaySlots.length}`);
  console.log('- API endpoints tested for multiple dates');
  console.log('- Check console output above for specific issues');
  
  if (dbSlots.length === 0) {
    console.log('\n💡 ISSUE FOUND: No slots in database!');
    console.log('   Solution: Admin needs to create slots using the admin schedule page');
  } else if (todaySlots.length === 0) {
    console.log('\n💡 ISSUE FOUND: All slots are in the past!');
    console.log('   Solution: Admin needs to create slots for future dates');
  } else {
    console.log('\n🔍 Database has slots, check API responses above for issues');
  }
}

debugBookingSlots().catch(console.error);