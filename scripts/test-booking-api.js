const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testBookingProcedures() {
  console.log('🚀 Testing Enhanced Booking Procedures...\n')

  try {
    // Test 1: Get Enhanced Available Slots
    console.log('1. Testing get_enhanced_available_slots...')
    const { data: slots, error: slotsError } = await supabase.rpc('get_enhanced_available_slots', {
      p_date_start: '2025-07-07',
      p_date_end: '2025-07-13',
      p_service_id: 'full_valet',
      p_vehicle_size: 'medium',
      p_user_id: null
    })

    if (slotsError) {
      console.error('❌ Slots Error:', slotsError)
    } else {
      console.log('✅ Available slots:', slots?.length || 0)
      if (slots?.length > 0) {
        console.log('   First slot:', {
          slot_id: slots[0].slot_id,
          date: slots[0].slot_date,
          time: `${slots[0].start_time} - ${slots[0].end_time}`,
          price: slots[0].pricing_info?.total_price_pence,
          recommended: slots[0].recommended
        })
      }
    }

    // Test 2: Calculate Enhanced Pricing
    console.log('\n2. Testing calculate_enhanced_pricing...')
    const { data: pricing, error: pricingError } = await supabase.rpc('calculate_enhanced_pricing', {
      p_service_id: 'full_valet',
      p_vehicle_size: 'medium',
      p_slot_date: '2025-07-08',
      p_user_id: null
    })

    if (pricingError) {
      console.error('❌ Pricing Error:', pricingError)
    } else {
      console.log('✅ Pricing calculation:', pricing)
    }

    // Test 3: Test with invalid parameters
    console.log('\n3. Testing error handling...')
    const { data: invalidSlots, error: invalidError } = await supabase.rpc('get_enhanced_available_slots', {
      p_date_start: '2025-07-07',
      p_date_end: '2025-07-06', // Invalid: end before start
      p_service_id: 'full_valet',
      p_vehicle_size: 'medium',
      p_user_id: null
    })

    if (invalidError) {
      console.log('✅ Error handling works:', invalidError.message)
    } else {
      console.log('⚠️  Should have errored with invalid date range')
    }

    console.log('\n🎉 All tests completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBookingProcedures()