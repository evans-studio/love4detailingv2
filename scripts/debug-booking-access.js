#!/usr/bin/env node

/**
 * Debug Booking Access Issue
 * Check why the reschedule API is returning 404
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugBookingAccess() {
  console.log('🔍 Debugging Booking Access Issue...\n')

  try {
    const bookingId = 'f2b825be-4956-403a-a2cc-d75937cf38a7'
    
    // Check if booking exists
    console.log('1️⃣ Checking if booking exists...')
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError && bookingError.code === 'PGRST116') {
      console.log('❌ Booking does NOT exist')
      console.log('   This booking ID was not found in the database')
      
      // Show available bookings
      console.log('\n📋 Available bookings:')
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('id, booking_reference, status, created_at')
        .limit(5)
      
      if (allBookings && allBookings.length > 0) {
        allBookings.forEach(b => {
          console.log(`   ${b.booking_reference} (${b.id}) - ${b.status}`)
        })
      } else {
        console.log('   No bookings found')
      }
      
      return false
    } else if (bookingError) {
      console.log('❌ Error fetching booking:', bookingError.message)
      return false
    } else {
      console.log('✅ Booking exists!')
      console.log('   Booking Reference:', booking.booking_reference)
      console.log('   Status:', booking.status)
      console.log('   User ID:', booking.user_id)
      console.log('   Created:', new Date(booking.created_at).toLocaleString())
    }

    // Check users table structure
    console.log('\n2️⃣ Checking users and auth structure...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(3)

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message)
      
      // Check if we're using auth.users instead
      console.log('\n🔍 Checking auth.users table...')
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .limit(3)
      
      if (authError) {
        console.log('❌ Cannot access auth.users either:', authError.message)
      } else {
        console.log('✅ Found auth.users table')
        console.log('   Sample users:', authUsers.map(u => u.email).join(', '))
      }
    } else {
      console.log('✅ Users table accessible')
      console.log('   Sample users:', users.map(u => u.email || u.id).join(', '))
    }

    // Check if the booking belongs to any user
    console.log('\n3️⃣ Checking booking ownership...')
    if (booking.user_id) {
      // Try to find the user
      const { data: bookingOwner, error: ownerError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', booking.user_id)
        .single()

      if (ownerError) {
        console.log('⚠️  Booking owner not found in users table')
        console.log('   User ID from booking:', booking.user_id)
        console.log('   This might be the issue - booking has user_id but user doesn\'t exist')
      } else {
        console.log('✅ Booking owner found')
        console.log('   Owner:', bookingOwner.full_name || bookingOwner.email || bookingOwner.id)
      }
    } else {
      console.log('⚠️  Booking has no user_id (anonymous booking?)')
    }

    // Check available slots
    console.log('\n4️⃣ Checking booking slot...')
    if (booking.slot_id) {
      const { data: slot, error: slotError } = await supabase
        .from('available_slots')
        .select('*')
        .eq('id', booking.slot_id)
        .single()

      if (slotError) {
        console.log('❌ Booking slot not found:', slotError.message)
      } else {
        console.log('✅ Booking slot found')
        console.log('   Date:', slot.slot_date)
        console.log('   Time:', slot.start_time)
      }
    } else {
      console.log('⚠️  Booking has no slot_id')
    }

    // Summary and recommendations
    console.log('\n🎯 Analysis & Recommendations:')
    
    if (booking) {
      console.log('   ✅ Booking exists in database')
      
      if (booking.user_id) {
        console.log('   ✅ Booking has user_id')
        console.log('   💡 Issue likely: Authentication mismatch')
        console.log('   🔧 Solutions:')
        console.log('      1. Make sure user is logged in')
        console.log('      2. Check if session user_id matches booking user_id')
        console.log('      3. Verify RLS policies allow access')
      } else {
        console.log('   ⚠️  Booking has no user_id (anonymous)')
        console.log('   🔧 Solution: Update API to handle anonymous bookings')
      }
    }

    return true

  } catch (error) {
    console.error('❌ Debug failed:', error)
    return false
  }
}

// Run the debug
debugBookingAccess()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Debug ${success ? 'completed' : 'failed'}`)
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Debug execution failed:', error)
    process.exit(1)
  })