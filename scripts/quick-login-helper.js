#!/usr/bin/env node

/**
 * Quick Login Helper
 * Shows which user owns which bookings for easy testing
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

async function showLoginHelper() {
  console.log('🔑 Quick Login Helper for Reschedule Testing\n')

  try {
    // Get all bookings first
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, booking_reference, status, user_id, created_at')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error fetching bookings:', error.message)
      return
    }

    if (!bookings || bookings.length === 0) {
      console.log('📋 No confirmed bookings found')
      return
    }

    console.log('📋 Recent Confirmed Bookings for Reschedule Testing:\n')
    
    // Get user details for each booking
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i]
      
      // Get user details
      const { data: user } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', booking.user_id)
        .single()
      
      console.log(`${i + 1}. Booking: ${booking.booking_reference}`)
      console.log(`   ID: ${booking.id}`)
      console.log(`   Owner: ${user?.full_name || user?.email || 'Unknown'}`)
      console.log(`   Email: ${user?.email || 'Unknown'}`)
      console.log(`   Created: ${new Date(booking.created_at).toLocaleDateString()}`)
      console.log(`   Status: ${booking.status}`)
      console.log('')
    }

    console.log('🎯 To test reschedule:')
    console.log('1. Go to http://localhost:3000/auth/login')
    console.log('2. Log in with one of the emails above')
    console.log('3. Go to Dashboard > Bookings')
    console.log('4. Click "Reschedule" on the booking')
    console.log('')
    console.log('📝 Note: The booking f2b825be-4956-403a-a2cc-d75937cf38a7 belongs to evanspaul87@gmail.com')

  } catch (error) {
    console.error('❌ Helper failed:', error)
  }
}

// Run the helper
showLoginHelper()
  .then(() => {
    console.log('✅ Helper completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Helper execution failed:', error)
    process.exit(1)
  })