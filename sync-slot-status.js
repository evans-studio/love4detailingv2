#!/usr/bin/env node

/**
 * Sync slot_status with actual booking state
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function syncSlotStatus() {
  console.log('🔄 SYNCING SLOT_STATUS WITH ACTUAL BOOKING STATE')
  console.log('=' .repeat(50))
  
  try {
    // Step 1: Check current inconsistencies
    console.log('\n🔍 Finding inconsistent slots...')
    const { data: allSlots, error: queryError } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, slot_status, current_bookings, is_blocked')
      .order('slot_date')
      .order('start_time')
    
    if (queryError) {
      throw new Error(`Failed to query slots: ${queryError.message}`)
    }
    
    // Find slots where slot_status doesn't match the actual state
    const inconsistentSlots = allSlots?.filter(slot => {
      // Calculate what the status SHOULD be based on actual data
      const shouldBeBlocked = slot.is_blocked
      const shouldBeBooked = !slot.is_blocked && slot.current_bookings > 0
      const shouldBeAvailable = !slot.is_blocked && slot.current_bookings === 0
      
      let correctStatus = 'available'
      if (shouldBeBlocked) correctStatus = 'blocked'
      else if (shouldBeBooked) correctStatus = 'booked'
      
      return slot.slot_status !== correctStatus
    }) || []
    
    console.log(`📊 Found ${inconsistentSlots.length} inconsistent slots`)
    
    if (inconsistentSlots.length === 0) {
      console.log('✅ All slot_status values are already correct!')
      return
    }
    
    // Show what will be changed
    console.log('\n📋 Slots to be updated:')
    inconsistentSlots.forEach(slot => {
      const shouldBeBlocked = slot.is_blocked
      const shouldBeBooked = !slot.is_blocked && slot.current_bookings > 0
      let correctStatus = 'available'
      if (shouldBeBlocked) correctStatus = 'blocked'
      else if (shouldBeBooked) correctStatus = 'booked'
      
      console.log(`   ${slot.slot_date} ${slot.start_time}: "${slot.slot_status}" → "${correctStatus}" (bookings=${slot.current_bookings}, blocked=${slot.is_blocked})`)
    })
    
    // Step 2: Update slot_status to match actual state
    console.log('\n🔄 Updating slot_status values...')
    
    let updateCount = 0
    
    // Update each slot individually to ensure correctness
    for (const slot of inconsistentSlots) {
      const shouldBeBlocked = slot.is_blocked
      const shouldBeBooked = !slot.is_blocked && slot.current_bookings > 0
      let correctStatus = 'available'
      if (shouldBeBlocked) correctStatus = 'blocked'
      else if (shouldBeBooked) correctStatus = 'booked'
      
      const { error: updateError } = await supabase
        .from('available_slots')
        .update({ 
          slot_status: correctStatus,
          last_modified: new Date().toISOString()
        })
        .eq('id', slot.id)
      
      if (updateError) {
        console.error(`❌ Failed to update slot ${slot.id}:`, updateError.message)
      } else {
        updateCount++
        console.log(`✅ Updated ${slot.slot_date} ${slot.start_time}: "${slot.slot_status}" → "${correctStatus}"`)
      }
    }
    
    console.log(`\n📊 Successfully updated ${updateCount} out of ${inconsistentSlots.length} slots`)
    
    // Step 3: Verify the fix
    console.log('\n🔍 Verifying fix...')
    const { data: verifySlots, error: verifyError } = await supabase
      .from('available_slots')
      .select('slot_status')
      .gte('slot_date', '2025-07-13')
      .lte('slot_date', '2025-07-19')
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError)
    } else {
      const statusCounts = {
        available: verifySlots?.filter(s => s.slot_status === 'available').length || 0,
        booked: verifySlots?.filter(s => s.slot_status === 'booked').length || 0,
        blocked: verifySlots?.filter(s => s.slot_status === 'blocked').length || 0
      }
      
      console.log('📊 Final status counts:')
      console.log(`   ✅ available: ${statusCounts.available}`)
      console.log(`   🔒 booked: ${statusCounts.booked}`)
      console.log(`   ❌ blocked: ${statusCounts.blocked}`)
      
      if (statusCounts.booked === 0) {
        console.log('\n🎉 SUCCESS: All slots are now properly marked as available or blocked!')
        console.log('✅ No slots incorrectly marked as "booked"')
      } else {
        console.log('\n⚠️  Warning: Some slots are still marked as booked')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error syncing slot status:', error.message)
  }
}

// Run sync
if (require.main === module) {
  syncSlotStatus()
    .then(() => {
      console.log('\n✅ Slot status sync completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Sync failed:', error)
      process.exit(1)
    })
}