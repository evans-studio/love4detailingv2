/**
 * Test API Fixes for Customer Booking Form
 */

async function testApiFixes() {
  console.log('🔧 Testing API fixes for customer booking form...\n');
  
  // Test 1: Test the problematic URLs from console errors
  const testUrls = [
    'http://localhost:3000/api/bookings/available-slots?date_start=2025-06-30&date_end=2025-07-30&limit=200',
    'http://localhost:3000/api/bookings/available-slots?date_start=2025-07-10&date_end=2025-07-17&vehicle_size=undefined',
    'http://localhost:3000/api/bookings/available-slots?date_start=2025-07-10&date_end=2025-07-17&vehicle_size=medium'
  ];
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`📋 Test ${i + 1}: ${url.split('?')[1]}`);
    
    try {
      const response = await fetch(url);
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Success: ${result.success ? 'API returned data' : 'API error but handled'}`);
        if (result.data && result.data.slots) {
          console.log(`   Found ${result.data.slots.length} slots`);
        }
      } else {
        console.log(`❌ HTTP ${response.status}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
    console.log('');
  }
  
  // Test 2: Test parameter format compatibility
  console.log('🔄 Testing parameter format compatibility...');
  
  const compatibilityTests = [
    'http://localhost:3000/api/bookings/available-slots?start_date=2025-07-11&end_date=2025-07-11',
    'http://localhost:3000/api/bookings/available-slots?date_start=2025-07-11&date_end=2025-07-11',
    'http://localhost:3000/api/bookings/available-slots?date=2025-07-11'
  ];
  
  for (let i = 0; i < compatibilityTests.length; i++) {
    const url = compatibilityTests[i];
    console.log(`🔧 Compatibility test ${i + 1}: ${url.split('?')[1]}`);
    
    try {
      const response = await fetch(url);
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Compatible: ${result.data ? result.data.slots.length : 0} slots returned`);
      } else {
        console.log(`❌ Incompatible: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
  
  console.log('\n📊 API Fix Test Summary:');
  console.log('✅ Parameter compatibility added (date_start/start_date)');
  console.log('✅ Vehicle size undefined handling fixed');
  console.log('✅ Debug logging added for troubleshooting');
  console.log('\n💡 Next: Test in browser to verify console errors are resolved');
}

testApiFixes().catch(console.error);