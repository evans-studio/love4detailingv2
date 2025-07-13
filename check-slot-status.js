#!/usr/bin/env node

/**
 * Check actual slot_status values in database
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSlotStatus() {
  console.log('🔍 CHECKING ACTUAL SLOT_STATUS VALUES')
  console.log('=' .repeat(40))
  
  try {
    // Get all slots for this week
    const { data: slots, error } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, slot_status, current_bookings, max_bookings, is_blocked')
      .gte('slot_date', '2025-07-13')
      .lte('slot_date', '2025-07-19')
      .order('slot_date')
      .order('start_time')
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`📊 Total slots found: ${slots?.length || 0}`)
    
    // Group by slot_status
    const statusGroups = {
      available: slots?.filter(s => s.slot_status === 'available') || [],
      booked: slots?.filter(s => s.slot_status === 'booked') || [],
      blocked: slots?.filter(s => s.slot_status === 'blocked') || [],
      null: slots?.filter(s => s.slot_status === null) || [],
      other: slots?.filter(s => s.slot_status && !['available', 'booked', 'blocked'].includes(s.slot_status)) || []
    }
    
    console.log('\n📊 Slot Status Breakdown:')
    console.log(`✅ available: ${statusGroups.available.length}`)
    console.log(`🔒 booked: ${statusGroups.booked.length}`)
    console.log(`❌ blocked: ${statusGroups.blocked.length}`)
    console.log(`❓ null: ${statusGroups.null.length}`)
    console.log(`🤔 other: ${statusGroups.other.length}`)
    
    // Show problematic slots
    if (statusGroups.booked.length > 0) {
      console.log('\n🔍 Slots marked as "booked":')
      statusGroups.booked.forEach(slot => {
        console.log(`   ${slot.slot_date} ${slot.start_time}: slot_status="${slot.slot_status}", current_bookings=${slot.current_bookings}`)
      })
    }
    
    if (statusGroups.blocked.length > 0) {
      console.log('\n🔍 Slots marked as "blocked":')
      statusGroups.blocked.slice(0, 5).forEach(slot => {
        console.log(`   ${slot.slot_date} ${slot.start_time}: slot_status="${slot.slot_status}", is_blocked=${slot.is_blocked}`)
      })
    }
    
    if (statusGroups.null.length > 0) {
      console.log('\n🔍 Slots with null status:')
      statusGroups.null.slice(0, 5).forEach(slot => {
        console.log(`   ${slot.slot_date} ${slot.start_time}: slot_status=null, current_bookings=${slot.current_bookings}, is_blocked=${slot.is_blocked}`)
      })
    }
    
    // Check for inconsistencies
    console.log('\n🔍 Checking for inconsistencies:')
    const inconsistent = slots?.filter(slot => {
      const statusSaysBooked = slot.slot_status === 'booked'
      const counterSaysBooked = slot.current_bookings > 0
      const statusSaysBlocked = slot.slot_status === 'blocked'  
      const flagSaysBlocked = slot.is_blocked
      
      return (statusSaysBooked !== counterSaysBooked) || (statusSaysBlocked !== flagSaysBlocked)
    }) || []
    
    if (inconsistent.length > 0) {
      console.log(`⚠️  Found ${inconsistent.length} inconsistent slots:`)
      inconsistent.forEach(slot => {
        console.log(`   ${slot.slot_date} ${slot.start_time}: status="${slot.slot_status}", bookings=${slot.current_bookings}, blocked=${slot.is_blocked}`)
      })
    } else {
      console.log('✅ No inconsistencies found between slot_status and old fields')
    }
    
  } catch (error) {
    console.error('❌ Error checking slot status:', error.message)
  }
}

// Run check
if (require.main === module) {
  checkSlotStatus()
    .then(() => {
      console.log('\n✅ Check completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Check failed:', error)
      process.exit(1)
    })
}