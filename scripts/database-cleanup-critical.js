#!/usr/bin/env node

/**
 * Critical Database Cleanup Script
 * Addresses testing issues by providing clean slate for validation
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables manually
const fs = require('fs')
const path = require('path')

// Try to load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function documentCurrentState() {
  console.log('📋 DOCUMENTING CURRENT STATE BEFORE CLEANUP')
  console.log('=' .repeat(50))
  
  try {
    // Count existing slots
    const { data: slots, error: slotsError } = await supabase
      .from('available_slots')
      .select('*')
      .order('slot_date', { ascending: true })
    
    if (slotsError) {
      console.error('Error fetching slots:', slotsError)
      return
    }
    
    console.log(`\n🗓️  CURRENT SLOTS: ${slots?.length || 0} total`)
    
    if (slots && slots.length > 0) {
      // Group by date
      const slotsByDate = {}
      slots.forEach(slot => {
        const date = slot.slot_date
        if (!slotsByDate[date]) {
          slotsByDate[date] = []
        }
        slotsByDate[date].push(slot)
      })
      
      console.log('\n📅 SLOTS BY DATE:')
      Object.keys(slotsByDate).sort().forEach(date => {
        const daySlots = slotsByDate[date]
        console.log(`   ${date}: ${daySlots.length} slots`)
        daySlots.forEach(slot => {
          console.log(`      ${slot.start_time} - ${slot.end_time} (${slot.is_blocked ? 'BLOCKED' : 'AVAILABLE'})`)
        })
      })
    }
    
    // Count bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return
    }
    
    console.log(`\n📋 CURRENT BOOKINGS: ${bookings?.length || 0} total`)
    
    if (bookings && bookings.length > 0) {
      const bookingsByStatus = {}
      bookings.forEach(booking => {
        const status = booking.status
        if (!bookingsByStatus[status]) {
          bookingsByStatus[status] = 0
        }
        bookingsByStatus[status]++
      })
      
      console.log('\n📊 BOOKINGS BY STATUS:')
      Object.keys(bookingsByStatus).forEach(status => {
        console.log(`   ${status}: ${bookingsByStatus[status]}`)
      })
    }
    
    // Count users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    console.log(`\n👥 CURRENT USERS: ${users?.length || 0} total`)
    
    // Count vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
    
    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError)
      return
    }
    
    console.log(`\n🚗 CURRENT VEHICLES: ${vehicles?.length || 0} total`)
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ Current state documentation complete')
    
  } catch (error) {
    console.error('Error documenting current state:', error)
  }
}

async function clearAllSlots() {
  console.log('\n🗑️  CLEARING ALL AVAILABLE SLOTS')
  console.log('=' .repeat(50))
  
  try {
    // First, let's see what we're about to delete
    const { data: slotsToDelete, error: selectError } = await supabase
      .from('available_slots')
      .select('*')
    
    if (selectError) {
      console.error('Error selecting slots for deletion:', selectError)
      return false
    }
    
    console.log(`🔍 Found ${slotsToDelete?.length || 0} slots to delete`)
    
    if (slotsToDelete && slotsToDelete.length > 0) {
      // Delete all slots
      const { error: deleteError } = await supabase
        .from('available_slots')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      
      if (deleteError) {
        console.error('Error deleting slots:', deleteError)
        return false
      }
      
      console.log(`✅ Successfully deleted ${slotsToDelete.length} slots`)
    } else {
      console.log('ℹ️  No slots found to delete')
    }
    
    // Verify deletion
    const { data: remainingSlots, error: verifyError } = await supabase
      .from('available_slots')
      .select('*')
    
    if (verifyError) {
      console.error('Error verifying deletion:', verifyError)
      return false
    }
    
    console.log(`🔍 Verification: ${remainingSlots?.length || 0} slots remaining`)
    
    return true
    
  } catch (error) {
    console.error('Error clearing slots:', error)
    return false
  }
}

async function clearTestBookings() {
  console.log('\n🗑️  CLEARING TEST BOOKINGS')
  console.log('=' .repeat(50))
  
  try {
    // Get all bookings first
    const { data: bookings, error: selectError } = await supabase
      .from('bookings')
      .select('*')
    
    if (selectError) {
      console.error('Error selecting bookings:', selectError)
      return false
    }
    
    console.log(`🔍 Found ${bookings?.length || 0} bookings to evaluate`)
    
    if (bookings && bookings.length > 0) {
      // Delete all bookings (since we're doing a clean slate)
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      
      if (deleteError) {
        console.error('Error deleting bookings:', deleteError)
        return false
      }
      
      console.log(`✅ Successfully deleted ${bookings.length} bookings`)
    } else {
      console.log('ℹ️  No bookings found to delete')
    }
    
    return true
    
  } catch (error) {
    console.error('Error clearing test bookings:', error)
    return false
  }
}

async function clearWorkingDays() {
  console.log('\n🗑️  CLEARING WORKING DAYS CONFIGURATION')
  console.log('=' .repeat(50))
  
  try {
    // Clear working days configuration
    const { data: workingDays, error: selectError } = await supabase
      .from('working_days')
      .select('*')
    
    if (selectError) {
      // If table doesn't exist, that's fine - just skip
      if (selectError.code === '42P01') {
        console.log('ℹ️  Working days table does not exist - skipping')
        return true
      }
      console.error('Error selecting working days:', selectError)
      return false
    }
    
    console.log(`🔍 Found ${workingDays?.length || 0} working day configurations`)
    
    if (workingDays && workingDays.length > 0) {
      const { error: deleteError } = await supabase
        .from('working_days')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      
      if (deleteError) {
        console.error('Error deleting working days:', deleteError)
        return false
      }
      
      console.log(`✅ Successfully deleted ${workingDays.length} working day configurations`)
    } else {
      console.log('ℹ️  No working day configurations found')
    }
    
    return true
    
  } catch (error) {
    console.error('Error clearing working days:', error)
    return false
  }
}

async function verifyCleanState() {
  console.log('\n🔍 VERIFYING CLEAN STATE')
  console.log('=' .repeat(50))
  
  try {
    // Check slots
    const { data: slots, error: slotsError } = await supabase
      .from('available_slots')
      .select('*')
    
    if (slotsError) {
      console.error('Error checking slots:', slotsError)
      return false
    }
    
    console.log(`📅 Available slots: ${slots?.length || 0}`)
    
    // Check bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
    
    if (bookingsError) {
      console.error('Error checking bookings:', bookingsError)
      return false
    }
    
    console.log(`📋 Bookings: ${bookings?.length || 0}`)
    
    // Check working days
    const { data: workingDays, error: workingDaysError } = await supabase
      .from('working_days')
      .select('*')
    
    if (workingDaysError) {
      console.error('Error checking working days:', workingDaysError)
      return false
    }
    
    console.log(`🗓️  Working days: ${workingDays?.length || 0}`)
    
    // Check users (should remain)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('Error checking users:', usersError)
      return false
    }
    
    console.log(`👥 Users: ${users?.length || 0} (preserved)`)
    
    // Check vehicles (should remain)
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
    
    if (vehiclesError) {
      console.error('Error checking vehicles:', vehiclesError)
      return false
    }
    
    console.log(`🚗 Vehicles: ${vehicles?.length || 0} (preserved)`)
    
    const isClean = (slots?.length || 0) === 0 && (bookings?.length || 0) === 0 && (workingDays?.length || 0) === 0
    
    if (isClean) {
      console.log('\n✅ CLEAN STATE VERIFIED - Ready for fresh schedule setup')
      return true
    } else {
      console.log('\n❌ CLEAN STATE NOT ACHIEVED - Manual intervention may be required')
      return false
    }
    
  } catch (error) {
    console.error('Error verifying clean state:', error)
    return false
  }
}

async function main() {
  console.log('🚨 CRITICAL DATABASE CLEANUP SCRIPT')
  console.log('This script will clear ALL slots and bookings for a clean start')
  console.log('User accounts and vehicles will be preserved')
  console.log('=' .repeat(70))
  
  // Step 1: Document current state
  await documentCurrentState()
  
  // Step 2: Clear test bookings FIRST (due to foreign key constraints)
  console.log('\n🎯 STARTING CLEANUP PROCESS')
  const bookingsCleared = await clearTestBookings()
  
  if (!bookingsCleared) {
    console.error('❌ Failed to clear bookings. Aborting.')
    process.exit(1)
  }
  
  // Step 3: Clear all slots (after bookings are cleared)
  const slotsCleared = await clearAllSlots()
  
  if (!slotsCleared) {
    console.error('❌ Failed to clear slots. Aborting.')
    process.exit(1)
  }
  
  // Step 4: Clear working days
  const workingDaysCleared = await clearWorkingDays()
  
  if (!workingDaysCleared) {
    console.error('❌ Failed to clear working days. Aborting.')
    process.exit(1)
  }
  
  // Step 5: Verify clean state
  const isClean = await verifyCleanState()
  
  if (isClean) {
    console.log('\n🎉 DATABASE CLEANUP COMPLETE')
    console.log('=' .repeat(70))
    console.log('✅ All slots cleared')
    console.log('✅ All bookings cleared')
    console.log('✅ Working days configuration cleared')
    console.log('✅ Users and vehicles preserved')
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Test customer booking page - should show "No slots available"')
    console.log('2. Test admin schedule page - should be empty')
    console.log('3. Admin can now create fresh schedule')
    console.log('4. Customer booking should immediately reflect admin schedule')
    console.log('\n📋 READY FOR SYSTEMATIC TESTING')
  } else {
    console.error('\n❌ CLEANUP INCOMPLETE - Manual intervention required')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}