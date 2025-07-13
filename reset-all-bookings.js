#!/usr/bin/env node

/**
 * Reset All Bookings - Clear bookings and make slots available
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetAllBookings() {
  console.log('🗑️  RESETTING ALL BOOKINGS AND SLOTS')
  console.log('=' .repeat(40))
  
  try {
    // Step 1: Get current booking count
    const { count: currentBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Current bookings in database: ${currentBookings || 0}`)
    
    // Step 2: Get current booked slots
    const { data: bookedSlots } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, current_bookings')
      .gt('current_bookings', 0)
    
    console.log(`📅 Currently booked slots: ${bookedSlots?.length || 0}`)
    if (bookedSlots && bookedSlots.length > 0) {
      bookedSlots.forEach(slot => {
        console.log(`   - ${slot.slot_date} ${slot.start_time}: ${slot.current_bookings} booking(s)`)
      })
    }
    
    if (currentBookings === 0) {
      console.log('✅ No bookings to delete')
      return
    }
    
    // Step 3: Delete all bookings
    console.log('\n🗑️  Deleting all bookings...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using dummy condition)
    
    if (deleteError) {
      throw new Error(`Failed to delete bookings: ${deleteError.message}`)
    }
    
    console.log('✅ All bookings deleted successfully')
    
    // Step 4: Reset slot booking counters
    console.log('\n📅 Resetting slot booking counters...')
    const { data: resetSlots, error: resetError } = await supabase
      .from('available_slots')
      .update({ current_bookings: 0 })
      .gt('current_bookings', 0)
      .select('id, slot_date, start_time')
    
    if (resetError) {
      throw new Error(`Failed to reset slot counters: ${resetError.message}`)
    }
    
    console.log(`✅ Reset ${resetSlots?.length || 0} slot counters to 0`)
    if (resetSlots && resetSlots.length > 0) {
      resetSlots.forEach(slot => {
        console.log(`   - ${slot.slot_date} ${slot.start_time}: Now available`)
      })
    }
    
    // Step 5: Verify reset
    console.log('\n🔍 Verifying reset...')
    
    const { count: remainingBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
    
    const { data: stillBookedSlots } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, current_bookings')
      .gt('current_bookings', 0)
    
    console.log(`📊 Remaining bookings: ${remainingBookings || 0}`)
    console.log(`📅 Remaining booked slots: ${stillBookedSlots?.length || 0}`)
    
    if (remainingBookings === 0 && (stillBookedSlots?.length || 0) === 0) {
      console.log('\n🎉 SUCCESS: All bookings cleared and slots are now available!')
    } else {
      console.log('\n⚠️  WARNING: Some data may not have been cleared properly')
    }
    
  } catch (error) {
    console.error('\n❌ Error resetting bookings:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the reset
if (require.main === module) {
  resetAllBookings()
    .then(() => {
      console.log('\n✅ Booking reset completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Reset failed:', error)
      process.exit(1)
    })
}

module.exports = { resetAllBookings }