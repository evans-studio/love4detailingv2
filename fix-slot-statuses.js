#!/usr/bin/env node

/**
 * Fix Slot Statuses - Reset all slots to available state
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixSlotStatuses() {
  console.log('🔧 FIXING SLOT STATUSES IN AVAILABLE_SLOTS TABLE')
  console.log('=' .repeat(50))
  
  try {
    // Step 1: Check current slot statuses
    console.log('\n📊 1. Current Slot Status Analysis:')
    const { data: allSlots, error: queryError } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, current_bookings, max_bookings, is_blocked')
      .order('slot_date')
      .order('start_time')
    
    if (queryError) {
      throw new Error(`Failed to query slots: ${queryError.message}`)
    }
    
    console.log(`📅 Total slots in database: ${allSlots?.length || 0}`)
    
    if (!allSlots || allSlots.length === 0) {
      console.log('⚠️  No slots found in available_slots table')
      return
    }
    
    // Analyze current statuses
    const statusAnalysis = {
      available: allSlots.filter(s => !s.is_blocked && s.current_bookings < s.max_bookings).length,
      booked: allSlots.filter(s => s.current_bookings >= s.max_bookings).length,
      blocked: allSlots.filter(s => s.is_blocked).length,
      withBookings: allSlots.filter(s => s.current_bookings > 0).length,
      zeroMaxBookings: allSlots.filter(s => s.max_bookings === 0).length
    }
    
    console.log('📊 Current Status Breakdown:')
    console.log(`   ✅ Available slots: ${statusAnalysis.available}`)
    console.log(`   🔒 Booked slots: ${statusAnalysis.booked}`)
    console.log(`   ❌ Blocked slots: ${statusAnalysis.blocked}`)
    console.log(`   📋 Slots with bookings: ${statusAnalysis.withBookings}`)
    console.log(`   🚫 Slots with max_bookings=0: ${statusAnalysis.zeroMaxBookings}`)
    
    // Show problematic slots
    const problematicSlots = allSlots.filter(s => 
      s.current_bookings > 0 || s.is_blocked || s.max_bookings === 0
    )
    
    if (problematicSlots.length > 0) {
      console.log('\n🔍 Problematic Slots Found:')
      problematicSlots.slice(0, 10).forEach(slot => {
        const issues = []
        if (slot.current_bookings > 0) issues.push(`${slot.current_bookings} bookings`)
        if (slot.is_blocked) issues.push('blocked')
        if (slot.max_bookings === 0) issues.push('max_bookings=0')
        
        console.log(`   ${slot.slot_date} ${slot.start_time}: ${issues.join(', ')}`)
      })
      if (problematicSlots.length > 10) {
        console.log(`   ... and ${problematicSlots.length - 10} more`)
      }
    }
    
    // Step 2: Fix current_bookings (should be 0 since we cleared all bookings)
    console.log('\n🔧 2. Resetting Current Bookings to 0:')
    const { data: resetBookingsResult, error: resetBookingsError } = await supabase
      .from('available_slots')
      .update({ current_bookings: 0 })
      .gt('current_bookings', 0)
      .select('id, slot_date, start_time')
    
    if (resetBookingsError) {
      console.error('❌ Error resetting current_bookings:', resetBookingsError)
    } else {
      console.log(`✅ Reset current_bookings to 0 for ${resetBookingsResult?.length || 0} slots`)
      if (resetBookingsResult && resetBookingsResult.length > 0) {
        resetBookingsResult.slice(0, 5).forEach(slot => {
          console.log(`   ${slot.slot_date} ${slot.start_time}`)
        })
      }
    }
    
    // Step 3: Fix max_bookings (should be at least 1 for available slots)
    console.log('\n🔧 3. Fixing Max Bookings (set to 1 for slots with 0):')
    const { data: fixMaxBookingsResult, error: fixMaxBookingsError } = await supabase
      .from('available_slots')
      .update({ max_bookings: 1 })
      .eq('max_bookings', 0)
      .select('id, slot_date, start_time')
    
    if (fixMaxBookingsError) {
      console.error('❌ Error fixing max_bookings:', fixMaxBookingsError)
    } else {
      console.log(`✅ Set max_bookings to 1 for ${fixMaxBookingsResult?.length || 0} slots`)
      if (fixMaxBookingsResult && fixMaxBookingsResult.length > 0) {
        fixMaxBookingsResult.slice(0, 5).forEach(slot => {
          console.log(`   ${slot.slot_date} ${slot.start_time}`)
        })
      }
    }
    
    // Step 4: Option to unblock all slots (be careful with this)
    console.log('\n🔧 4. Checking Blocked Slots:')
    const { data: blockedSlots } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time')
      .eq('is_blocked', true)
    
    if (blockedSlots && blockedSlots.length > 0) {
      console.log(`⚠️  Found ${blockedSlots.length} blocked slots:`)
      blockedSlots.slice(0, 5).forEach(slot => {
        console.log(`   ${slot.slot_date} ${slot.start_time}`)
      })
      
      console.log('\n💡 To unblock ALL slots (making them available), run:')
      console.log('   node fix-slot-statuses.js --unblock-all')
      console.log('\n⚠️  WARNING: This will make ALL slots available, including intentionally blocked ones!')
    } else {
      console.log('✅ No blocked slots found')
    }
    
    // Step 5: Verify final status
    console.log('\n📊 5. Final Status Verification:')
    const { data: finalSlots, error: finalError } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, current_bookings, max_bookings, is_blocked')
      .order('slot_date')
      .order('start_time')
    
    if (finalError) {
      console.error('❌ Error in final verification:', finalError)
    } else {
      const finalAnalysis = {
        total: finalSlots?.length || 0,
        available: finalSlots?.filter(s => !s.is_blocked && s.current_bookings < s.max_bookings).length || 0,
        booked: finalSlots?.filter(s => s.current_bookings >= s.max_bookings).length || 0,
        blocked: finalSlots?.filter(s => s.is_blocked).length || 0,
        withBookings: finalSlots?.filter(s => s.current_bookings > 0).length || 0
      }
      
      console.log('📊 After Fix Status:')
      console.log(`   📅 Total slots: ${finalAnalysis.total}`)
      console.log(`   ✅ Available slots: ${finalAnalysis.available}`)
      console.log(`   🔒 Booked slots: ${finalAnalysis.booked}`)
      console.log(`   ❌ Blocked slots: ${finalAnalysis.blocked}`)
      console.log(`   📋 Slots with bookings: ${finalAnalysis.withBookings}`)
      
      if (finalAnalysis.withBookings === 0 && finalAnalysis.booked === 0) {
        console.log('\n🎉 SUCCESS: All slot booking counters are clean!')
      } else {
        console.log('\n⚠️  WARNING: Some issues remain - check the analysis above')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error fixing slot statuses:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

async function unblockAllSlots() {
  console.log('\n🚨 UNBLOCKING ALL SLOTS (DANGER ZONE)')
  console.log('=' .repeat(40))
  
  try {
    const { data: unblockResult, error: unblockError } = await supabase
      .from('available_slots')
      .update({ is_blocked: false })
      .eq('is_blocked', true)
      .select('id, slot_date, start_time')
    
    if (unblockError) {
      console.error('❌ Error unblocking slots:', unblockError)
    } else {
      console.log(`✅ Unblocked ${unblockResult?.length || 0} slots`)
      if (unblockResult && unblockResult.length > 0) {
        unblockResult.forEach(slot => {
          console.log(`   ${slot.slot_date} ${slot.start_time}: Now available`)
        })
      }
    }
  } catch (error) {
    console.error('❌ Error during unblock operation:', error.message)
  }
}

// Main execution
if (require.main === module) {
  const shouldUnblockAll = process.argv.includes('--unblock-all')
  
  fixSlotStatuses()
    .then(async () => {
      if (shouldUnblockAll) {
        await unblockAllSlots()
      }
      console.log('\n✅ Slot status fix completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Fix failed:', error)
      process.exit(1)
    })
}

module.exports = { fixSlotStatuses, unblockAllSlots }