const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCompleteBookingFlow() {
  console.log('🚀 Testing Complete Booking Flow...\n')

  try {
    // Step 1: Get service
    const { data: services } = await supabase.from('services').select('*')
    if (!services || services.length === 0) {
      console.error('❌ No services found')
      return
    }
    
    const service = services[0]
    console.log('✅ Found service:', service.name, '(ID:', service.id, ')')

    // Step 2: Get available slots
    console.log('\n📅 Testing available slots...')
    const { data: slots, error: slotsError } = await supabase.rpc('get_enhanced_available_slots', {
      p_date_start: '2025-07-07',
      p_date_end: '2025-07-13',
      p_service_id: service.id,
      p_vehicle_size: 'medium',
      p_user_id: null
    })

    if (slotsError) {
      console.error('❌ Slots Error:', slotsError)
      return
    }

    console.log('✅ Available slots:', slots?.length || 0)
    if (!slots || slots.length === 0) {
      console.error('❌ No slots available')
      return
    }

    const selectedSlot = slots[0]
    console.log('Selected slot:', {
      id: selectedSlot.slot_id,
      date: selectedSlot.slot_date,
      time: `${selectedSlot.start_time} - ${selectedSlot.end_time}`,
      price: selectedSlot.pricing_info.total_price_pence
    })

    // Step 3: Test pricing calculation
    console.log('\n💰 Testing pricing calculation...')
    const { data: pricing, error: pricingError } = await supabase.rpc('calculate_enhanced_pricing', {
      p_service_id: service.id,
      p_vehicle_size: 'medium',
      p_slot_date: selectedSlot.slot_date,
      p_user_id: null
    })

    if (pricingError) {
      console.error('❌ Pricing Error:', pricingError)
      return
    }

    console.log('✅ Pricing calculation:', pricing)

    // Step 4: Create a test booking
    console.log('\n📋 Testing booking creation...')
    const bookingData = {
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      customer_phone: '07123456789',
      slot_id: selectedSlot.slot_id,
      service_id: service.id,
      vehicle_size: 'medium',
      payment_method: 'cash',
      special_requests: 'Test booking from API',
      user_id: null,
      vehicle_data: {
        registration: 'TEST123',
        make: 'Test',
        model: 'Vehicle',
        year: 2023,
        color: 'Red'
      }
    }

    const { data: booking, error: bookingError } = await supabase.rpc('create_enhanced_booking', {
      p_booking_data: bookingData
    })

    if (bookingError) {
      console.error('❌ Booking Error:', bookingError)
      return
    }

    console.log('✅ Booking created successfully!')
    console.log('Booking reference:', booking.booking_reference)
    console.log('Customer reference:', booking.customer_reference)

    // Step 5: Get booking history
    console.log('\n📜 Testing booking history...')
    const { data: history, error: historyError } = await supabase.rpc('get_user_booking_history', {
      p_user_id: null,
      p_customer_email: 'test@example.com',
      p_limit: 10,
      p_offset: 0
    })

    if (historyError) {
      console.error('❌ History Error:', historyError)
      return
    }

    console.log('✅ Booking history:', history?.length || 0, 'bookings')

    // Step 6: Cancel the booking
    console.log('\n❌ Testing booking cancellation...')
    const { data: cancelResult, error: cancelError } = await supabase.rpc('cancel_booking', {
      p_booking_id: booking.booking_id,
      p_reason: 'Test cancellation',
      p_user_id: null,
      p_refund_amount: null
    })

    if (cancelError) {
      console.error('❌ Cancellation Error:', cancelError)
      return
    }

    console.log('✅ Booking cancelled successfully')

    console.log('\n🎉 Complete booking flow test passed!')
    console.log('✅ All booking procedures are working correctly')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testCompleteBookingFlow()