#!/usr/bin/env node

/**
 * Test Admin Time Display Issues
 * Verifies that admin dashboard shows correct booking times vs creation times
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const API_BASE_URL = 'http://localhost:3000'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🕐 ADMIN TIME DISPLAY TESTING')
console.log('=' .repeat(35))

async function testAdminBookingTimes() {
  console.log('\n📊 Testing Admin Booking Dashboard Time Display')
  console.log('-'.repeat(45))
  
  try {
    // First, let's see what the admin dashboard API returns
    console.log('🔍 Fetching admin dashboard data...')
    
    const response = await fetch(`${API_BASE_URL}/api/admin/bookings/dashboard?admin_id=test&date=${new Date().toISOString().split('T')[0]}`)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(`API failed: ${result.error}`)
    }
    
    const bookings = result.today_bookings || []
    console.log(`📋 Found ${bookings.length} bookings`)
    
    if (bookings.length === 0) {
      console.log('⚠️  No bookings found for today')
      return { success: true, bookings: [], issues: ['No bookings to test'] }
    }
    
    // Analyze time data for each booking
    const issues = []
    const timeAnalysis = []
    
    for (const booking of bookings) {
      const analysis = {
        booking_reference: booking.booking_reference,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        slot_found: booking.slot_found,
        created_at: booking.created_at,
        issues: []
      }
      
      // Check if using fallback time data
      if (!booking.slot_found) {
        analysis.issues.push('Using fallback time data (not from actual slot)')
        issues.push(`${booking.booking_reference}: No slot data found`)
      }
      
      // Check if date/time look suspicious
      if (booking.scheduled_time === '10:00' && !booking.slot_found) {
        analysis.issues.push('Suspicious fallback time (exactly 10:00)')
        issues.push(`${booking.booking_reference}: Fallback time detected`)
      }
      
      // Check if date is from creation time instead of slot time
      const createdDate = booking.created_at?.split('T')[0]
      if (booking.scheduled_date === createdDate && !booking.slot_found) {
        analysis.issues.push('Date appears to be from creation time, not booking slot')
        issues.push(`${booking.booking_reference}: Date from creation time`)
      }
      
      timeAnalysis.push(analysis)
    }
    
    // Display results
    console.log('\n📊 Time Data Analysis:')
    timeAnalysis.forEach(analysis => {
      console.log(`\n📋 ${analysis.booking_reference}:`)
      console.log(`   📅 Date: ${analysis.scheduled_date}`)
      console.log(`   🕐 Time: ${analysis.scheduled_time}`)
      console.log(`   ✅ Slot Found: ${analysis.slot_found ? 'YES' : 'NO'}`)
      console.log(`   📝 Created: ${analysis.created_at?.split('T')[0]}`)
      
      if (analysis.issues.length > 0) {
        console.log(`   ⚠️  Issues:`)
        analysis.issues.forEach(issue => console.log(`      - ${issue}`))
      }
    })
    
    return {
      success: true,
      bookings: timeAnalysis,
      issues,
      totalBookings: bookings.length,
      bookingsWithSlotData: timeAnalysis.filter(b => b.slot_found).length,
      bookingsWithFallbackData: timeAnalysis.filter(b => !b.slot_found).length
    }
    
  } catch (error) {
    console.error('❌ Error testing admin dashboard:', error.message)
    return { success: false, error: error.message }
  }
}

async function testRescheduleNotifications() {
  console.log('\n📧 Testing Reschedule Notification System')
  console.log('-'.repeat(40))
  
  try {
    console.log('🔍 Testing reschedule requests API...')
    
    const response = await fetch(`${API_BASE_URL}/api/admin/pending-slot-actions`)
    
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.log(`   Error details: ${errorText}`)
      return { 
        success: false, 
        error: `${response.status}: ${response.statusText}`,
        apiWorking: false
      }
    }
    
    const result = await response.json()
    
    if (!result.success) {
      console.log(`❌ API Failed: ${result.error}`)
      return { 
        success: false, 
        error: result.error,
        apiWorking: false
      }
    }
    
    const rescheduleRequests = result.data?.pending_actions?.reschedule_requests || []
    console.log(`📋 Found ${rescheduleRequests.length} pending reschedule requests`)
    
    if (rescheduleRequests.length === 0) {
      console.log('✅ No pending reschedule requests (expected if table not set up)')
    } else {
      console.log('📊 Reschedule requests found:')
      rescheduleRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.booking_reference} - ${req.customer?.name}`)
      })
    }
    
    return {
      success: true,
      apiWorking: true,
      rescheduleRequestsCount: rescheduleRequests.length,
      requests: rescheduleRequests
    }
    
  } catch (error) {
    console.error('❌ Error testing reschedule notifications:', error.message)
    return { 
      success: false, 
      error: error.message,
      apiWorking: false
    }
  }
}

async function checkRescheduleTable() {
  console.log('\n🗄️  Checking Reschedule Database Table')
  console.log('-'.repeat(35))
  
  try {
    console.log('🔍 Checking if reschedule_requests table exists...')
    
    const { data, error } = await supabase
      .from('reschedule_requests')
      .select('count(*)')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ reschedule_requests table does not exist')
        return { tableExists: false, error: 'Table not found' }
      } else {
        console.log('❌ Error checking table:', error.message)
        return { tableExists: false, error: error.message }
      }
    }
    
    console.log('✅ reschedule_requests table exists')
    console.log(`📊 Found ${data?.[0]?.count || 0} records`)
    
    return { 
      tableExists: true, 
      recordCount: data?.[0]?.count || 0 
    }
    
  } catch (error) {
    console.error('❌ Error checking reschedule table:', error.message)
    return { tableExists: false, error: error.message }
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting admin dashboard diagnostics...\n')
  
  // Test 1: Admin booking time display
  const timeTest = await testAdminBookingTimes()
  
  // Test 2: Reschedule notification system
  const rescheduleTest = await testRescheduleNotifications()
  
  // Test 3: Check reschedule table
  const tableTest = await checkRescheduleTable()
  
  // Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY')
  console.log('=' .repeat(25))
  
  // Time Display Results
  console.log('\n🕐 Time Display Results:')
  if (timeTest.success) {
    console.log(`   ✅ Admin dashboard API working`)
    console.log(`   📊 Total bookings: ${timeTest.totalBookings}`)
    console.log(`   ✅ With slot data: ${timeTest.bookingsWithSlotData}`)
    console.log(`   ⚠️  With fallback data: ${timeTest.bookingsWithFallbackData}`)
    
    if (timeTest.issues.length > 0) {
      console.log(`   🚨 Issues found:`)
      timeTest.issues.forEach(issue => console.log(`      - ${issue}`))
    }
  } else {
    console.log(`   ❌ Dashboard test failed: ${timeTest.error}`)
  }
  
  // Reschedule Results
  console.log('\n📧 Reschedule Notifications:')
  if (rescheduleTest.success) {
    console.log(`   ✅ API accessible: ${rescheduleTest.apiWorking ? 'YES' : 'NO'}`)
    console.log(`   📊 Pending requests: ${rescheduleTest.rescheduleRequestsCount}`)
  } else {
    console.log(`   ❌ Reschedule API failed: ${rescheduleTest.error}`)
  }
  
  // Database Results
  console.log('\n🗄️  Database Status:')
  console.log(`   ✅ Reschedule table exists: ${tableTest.tableExists ? 'YES' : 'NO'}`)
  if (tableTest.tableExists) {
    console.log(`   📊 Records in table: ${tableTest.recordCount}`)
  } else {
    console.log(`   💡 This explains why reschedule notifications aren't working`)
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:')
  
  if (timeTest.bookingsWithFallbackData > 0) {
    console.log('   📅 Time Display: Some bookings showing estimated times instead of actual slot times')
    console.log('      - Check if bookings have valid slot_id references')
    console.log('      - Verify slot data is being properly fetched and joined')
  }
  
  if (!tableTest.tableExists) {
    console.log('   📧 Reschedule Notifications: Create reschedule_requests table for proper tracking')
    console.log('      - Currently using temporary email-only approach')
    console.log('      - Admin dashboard won\'t show reschedule requests without database table')
  }
  
  if (rescheduleTest.apiWorking && tableTest.tableExists && rescheduleTest.rescheduleRequestsCount === 0) {
    console.log('   ✅ Reschedule system appears ready but no pending requests')
  }
}

// Main execution
if (require.main === module) {
  runDiagnostics()
    .then(() => {
      console.log('\n✅ Diagnostics completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Diagnostics failed:', error)
      process.exit(1)
    })
}

module.exports = {
  testAdminBookingTimes,
  testRescheduleNotifications,
  checkRescheduleTable,
  runDiagnostics
}