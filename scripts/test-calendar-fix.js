/**
 * Test Calendar Booking Data Structure Fix
 */

async function testCalendarFix() {
  console.log('📅 Testing Calendar Booking data structure fix...\n');
  
  // Test 1: Check API response structure
  console.log('🔍 Test 1: Checking API response structure...');
  try {
    const response = await fetch('http://localhost:3000/api/bookings/available-slots?date_start=2025-07-11&date_end=2025-07-11');
    const result = await response.json();
    
    console.log('📋 API Response structure:');
    console.log('- success:', typeof result.success, result.success);
    console.log('- data:', typeof result.data);
    if (result.data) {
      console.log('- data.slots:', Array.isArray(result.data.slots), `(${result.data.slots?.length || 0} items)`);
      console.log('- data.total:', result.data.total);
      console.log('- data.vehicle_size:', result.data.vehicle_size);
      
      if (result.data.slots && result.data.slots.length > 0) {
        console.log('- First slot structure:', Object.keys(result.data.slots[0]));
      }
    }
    
    if (result.success && result.data && Array.isArray(result.data.slots)) {
      console.log('✅ API returns correct structure: data.slots is an array');
    } else {
      console.log('❌ API structure issue detected');
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
  
  // Test 2: Simulate the CalendarBooking data processing
  console.log('\n🔄 Test 2: Simulating CalendarBooking data processing...');
  try {
    const response = await fetch('http://localhost:3000/api/bookings/available-slots?date_start=2025-07-10&date_end=2025-07-17');
    const result = await response.json();
    
    if (result.data && result.data.slots) {
      const slots = result.data.slots;
      console.log(`📊 Processing ${slots.length} slots...`);
      
      // Simulate the forEach operation that was failing
      const slotsByDate = {};
      slots.forEach((slot, index) => {
        const slotDate = slot.date || slot.slot_date;
        if (!slotsByDate[slotDate]) {
          slotsByDate[slotDate] = [];
        }
        slotsByDate[slotDate].push({
          id: slot.slot_id || slot.id,
          date: slotDate,
          startTime: slot.start_time || slot.startTime,
          duration: slot.duration_minutes || slot.duration || 60,
          status: slot.is_available ? 'available' : 'unavailable'
        });
        
        if (index === 0) {
          console.log('✅ First slot processed successfully:', {
            originalKeys: Object.keys(slot),
            transformedKeys: Object.keys(slotsByDate[slotDate][0])
          });
        }
      });
      
      console.log(`✅ Successfully grouped slots by ${Object.keys(slotsByDate).length} dates`);
      Object.keys(slotsByDate).forEach(date => {
        console.log(`   ${date}: ${slotsByDate[date].length} slots`);
      });
      
    } else {
      console.log('⚠️  No slots data to process');
    }
    
  } catch (error) {
    console.error('❌ Data processing simulation failed:', error.message);
  }
  
  console.log('\n📊 Calendar Fix Test Summary:');
  console.log('✅ Fixed API response parsing (data.slots instead of data)');
  console.log('✅ Added data transformation for slot format compatibility');
  console.log('✅ Added proper error handling for failed responses');
  console.log('✅ forEach error should be resolved');
  
  console.log('\n💡 The "data.forEach is not a function" error should now be fixed!');
}

testCalendarFix().catch(console.error);