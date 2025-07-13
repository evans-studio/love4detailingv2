#!/usr/bin/env node

/**
 * Debug Reschedule API Error
 * Test the exact API call that's failing
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

async function debugRescheduleError() {
  console.log('🔍 Debugging Reschedule API Error...\n')

  try {
    // Test 1: Check if reschedule_requests table exists
    console.log('1️⃣ Checking reschedule_requests table...')
    const { data: tableTest, error: tableError } = await supabase
      .from('reschedule_requests')
      .select('*')
      .limit(1)

    if (tableError && tableError.code === '42P01') {
      console.log('❌ reschedule_requests table does NOT exist')
      console.log('   This is likely the cause of the 400 error')
      console.log('   Need to create the table manually in Supabase dashboard')
      
      // Create the table via SQL
      console.log('\n🔧 Attempting to create table...')
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS reschedule_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          current_slot_id UUID NOT NULL REFERENCES available_slots(id),
          requested_slot_id UUID NOT NULL REFERENCES available_slots(id),
          reason TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
          admin_response TEXT,
          admin_id UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          responded_at TIMESTAMPTZ,
          
          CONSTRAINT reschedule_different_slots CHECK (current_slot_id != requested_slot_id),
          CONSTRAINT reschedule_one_pending_per_booking UNIQUE (booking_id) WHERE status = 'pending'
        );
        
        ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own reschedule requests"
          ON reschedule_requests FOR SELECT
          USING (auth.uid() = user_id);
          
        CREATE POLICY "Users can create reschedule requests for their own bookings"
          ON reschedule_requests FOR INSERT
          WITH CHECK (
            auth.uid() = user_id AND
            EXISTS (
              SELECT 1 FROM bookings 
              WHERE id = booking_id AND user_id = auth.uid()
            )
          );
      `
      
      // Note: We can't execute raw SQL through the JS client easily, 
      // so we'll just report the issue and provide the SQL
      console.log('   SQL to run in Supabase dashboard:')
      console.log('   (Copy and paste in SQL Editor)')
      console.log(createTableSQL)
      
    } else if (tableError) {
      console.log('❌ Error accessing reschedule_requests table:', tableError.message)
    } else {
      console.log('✅ reschedule_requests table exists')
    }

    // Test 2: Check database function
    console.log('\n2️⃣ Testing create_reschedule_request function...')
    const { data: funcResult, error: funcError } = await supabase.rpc('create_reschedule_request', {
      p_booking_id: 'test-id',
      p_requested_slot_id: 'test-slot',
      p_reason: 'test'
    })

    if (funcError) {
      console.log('❌ Function error:', funcError.message)
      if (funcError.code === '42883') {
        console.log('   Function does not exist')
      } else if (funcError.message.includes('relation "reschedule_requests" does not exist')) {
        console.log('   Function exists but table is missing')
      }
    } else {
      console.log('✅ Function working (unexpected with test data)')
    }

    // Test 3: Check sample booking
    console.log('\n3️⃣ Checking sample booking...')
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_reference, status, slot_id, user_id')
      .limit(1)

    if (bookingError) {
      console.log('❌ Error fetching bookings:', bookingError.message)
    } else if (bookings.length === 0) {
      console.log('⚠️  No bookings found for testing')
    } else {
      console.log('✅ Sample booking found:', bookings[0].booking_reference)
      console.log('   Booking ID:', bookings[0].id)
      console.log('   User ID:', bookings[0].user_id)
      console.log('   Slot ID:', bookings[0].slot_id)
    }

    // Test 4: Check available slots
    console.log('\n4️⃣ Checking available slots...')
    const { data: slots, error: slotsError } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time')
      .limit(3)

    if (slotsError) {
      console.log('❌ Error fetching slots:', slotsError.message)
    } else {
      console.log(`✅ Found ${slots.length} slots for testing`)
      if (slots.length > 0) {
        console.log('   Sample slot:', slots[0].id, slots[0].slot_date, slots[0].start_time)
      }
    }

    // Summary and solution
    console.log('\n🎯 Error Analysis:')
    if (tableError && tableError.code === '42P01') {
      console.log('   ROOT CAUSE: reschedule_requests table missing')
      console.log('   SOLUTION: Create table in Supabase dashboard')
      console.log('   PRIORITY: High - blocking reschedule functionality')
    } else {
      console.log('   Tables exist, need to investigate function calls')
    }

    console.log('\n🚀 Next Steps:')
    console.log('   1. Create reschedule_requests table in Supabase dashboard')
    console.log('   2. Test the reschedule modal again') 
    console.log('   3. If still failing, check function parameters')

    return true

  } catch (error) {
    console.error('❌ Debug failed:', error)
    return false
  }
}

// Run the debug
debugRescheduleError()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Debug ${success ? 'completed' : 'failed'}`)
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Debug execution failed:', error)
    process.exit(1)
  })