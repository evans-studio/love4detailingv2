#!/usr/bin/env node

/**
 * Force Refresh Calendar Data - Test API endpoints directly
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_BASE_URL = 'http://localhost:3000'

async function testCalendarAPIs() {
  console.log('🔍 TESTING CALENDAR API ENDPOINTS')
  console.log('=' .repeat(40))
  
  try {
    // Test 1: Direct database query
    console.log('\n📊 1. Direct Database Query:')
    const { data: directSlots, error } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, current_bookings, is_blocked')
      .gte('slot_date', '2025-07-13')
      .lte('slot_date', '2025-07-19')
      .order('slot_date')
      .order('start_time')
      .limit(10)
    
    if (error) {
      console.error('❌ Database error:', error)
    } else {
      console.log(`📅 Found ${directSlots?.length || 0} slots in database`)
      directSlots?.forEach(slot => {
        const status = slot.current_bookings > 0 ? 'BOOKED' : (slot.is_blocked ? 'BLOCKED' : 'AVAILABLE')
        console.log(`   ${slot.slot_date} ${slot.start_time}: ${status} (${slot.current_bookings} bookings)`)
      })
    }
    
    // Test 2: API Week Overview
    console.log('\n📊 2. API Week Overview:')
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/schedule?action=get_week_overview&week_start=2025-07-13`)
      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log(`📅 API returned ${result.data?.length || 0} days`)
        result.data?.forEach(day => {
          console.log(`   ${day.day_date}: ${day.available_slots}/${day.total_slots} available`)
        })
      } else {
        console.log('❌ API Error:', result.error || 'Unknown error')
      }
    } catch (apiError) {
      console.log('❌ API Request failed:', apiError.message)
    }
    
    // Test 3: API Day Slots
    console.log('\n📊 3. API Day Slots (Today):')
    try {
      const today = '2025-07-13'
      const response = await fetch(`${API_BASE_URL}/api/admin/schedule?action=get_day_slots&date=${today}`)
      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log(`📅 API returned ${result.data?.length || 0} slots for ${today}`)
        result.data?.slice(0, 5).forEach(slot => {
          const status = slot.current_bookings > 0 ? 'BOOKED' : (slot.is_blocked ? 'BLOCKED' : 'AVAILABLE')
          console.log(`   ${slot.start_time}: ${status} (${slot.current_bookings} bookings)`)
        })
      } else {
        console.log('❌ API Error:', result.error || 'Unknown error')
      }
    } catch (apiError) {
      console.log('❌ API Request failed:', apiError.message)
    }
    
    // Test 4: Check for any remaining bookings
    console.log('\n📊 4. Verify No Bookings Exist:')
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_reference, slot_id, status')
      .limit(5)
    
    if (bookingError) {
      console.error('❌ Booking check error:', bookingError)
    } else {
      console.log(`📋 Found ${bookings?.length || 0} bookings in database`)
      if (bookings && bookings.length > 0) {
        bookings.forEach(booking => {
          console.log(`   ${booking.booking_reference}: ${booking.status} (slot: ${booking.slot_id})`)
        })
      } else {
        console.log('✅ No bookings found - database is clean')
      }
    }
    
    console.log('\n🎯 DIAGNOSIS:')
    if (directSlots && directSlots.some(slot => slot.current_bookings > 0)) {
      console.log('❌ ISSUE: Slots still have current_bookings > 0 in database')
      console.log('💡 SOLUTION: Run the reset script again')
    } else {
      console.log('✅ Database slots are clean (current_bookings = 0)')
      console.log('💡 ISSUE: Calendar component may be caching old data')
      console.log('💡 SOLUTION: Hard refresh the browser or clear cache')
    }
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message)
  }
}

// Run the test
if (require.main === module) {
  testCalendarAPIs()
    .then(() => {
      console.log('\n✅ Calendar API testing completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Testing failed:', error)
      process.exit(1)
    })
}