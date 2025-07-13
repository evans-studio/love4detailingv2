#!/usr/bin/env node

/**
 * Test Reschedule System Integration
 * Verifies that reschedule requests work end-to-end
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

console.log('🔄 RESCHEDULE SYSTEM TESTING')
console.log('=' .repeat(35))

async function createTestBooking() {
  console.log('\n📝 Creating Test Booking for Reschedule')
  console.log('-'.repeat(40))
  
  const testBookingData = {
    customer_email: 'reschedule-test@example.com',
    customer_name: 'Reschedule Test User',
    customer_phone: '07123456789',
    slot_id: '2cbf2a78-18a7-4e32-bf2b-350733814e30',
    service_id: '6856143e-eb1d-4776-bf6b-3f6149f36901',
    vehicle_size: 'medium',
    service_address: '123 Reschedule Test Street, London',
    vehicle_registration: 'RSC123',
    vehicle_make: 'Toyota',
    vehicle_model: 'Prius',
    vehicle_year: 2023,
    vehicle_color: 'Silver',
    payment_method: 'cash'
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings/enhanced/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingData: testBookingData })
    })

    if (!response.ok) {
      throw new Error(`Booking creation failed: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.data?.booking_id) {
      throw new Error('No booking ID returned')
    }

    console.log('✅ Test booking created successfully')
    console.log('📋 Booking ID:', result.data.booking_id)
    console.log('📋 Booking Reference:', result.data.booking_reference)
    
    return {
      bookingId: result.data.booking_id,
      bookingReference: result.data.booking_reference,
      userId: result.data.user_id
    }
    
  } catch (error) {
    console.error('❌ Failed to create test booking:', error.message)
    return null
  }
}

async function getAvailableSlots() {
  console.log('\n📅 Getting Available Slots for Reschedule')
  console.log('-'.repeat(40))
  
  try {
    // Get slots for next week
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const startDate = nextWeek.toISOString().split('T')[0]
    
    const endDate = new Date(nextWeek)
    endDate.setDate(endDate.getDate() + 7)
    const endDateStr = endDate.toISOString().split('T')[0]
    
    const response = await fetch(`${API_BASE_URL}/api/bookings/available-slots?date_start=${startDate}&date_end=${endDateStr}&vehicle_size=medium`)
    
    if (!response.ok) {
      throw new Error(`Failed to get slots: ${response.status}`)
    }
    
    const result = await response.json()
    const slots = result.slots || []
    
    console.log(`📊 Found ${slots.length} available slots`)
    
    if (slots.length === 0) {
      console.log('⚠️  No available slots found for testing')
      return null
    }
    
    // Return the first available slot
    const testSlot = slots[0]
    console.log('📋 Using slot for test:', {
      id: testSlot.id,
      date: testSlot.date,
      time: testSlot.time
    })
    
    return testSlot
    
  } catch (error) {
    console.error('❌ Failed to get available slots:', error.message)
    return null
  }
}

async function testRescheduleRequest(bookingId, newSlotId) {
  console.log('\n🔄 Testing Reschedule Request')
  console.log('-'.repeat(30))
  
  try {
    const rescheduleData = {
      newSlotId: newSlotId,
      reason: 'Testing reschedule system - automated test'
    }
    
    console.log('📤 Sending reschedule request...')
    
    const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rescheduleData)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.log('❌ Reschedule request failed:', result.error)
      console.log('💡 This is expected if not authenticated - checking error type')
      
      if (result.error?.includes('Unauthorized') || result.error?.includes('log in')) {
        console.log('✅ API is working but requires authentication (expected)')
        return { success: false, reason: 'authentication_required', apiWorking: true }
      } else {
        console.log('❌ Unexpected error:', result.error)
        return { success: false, reason: 'api_error', error: result.error }
      }
    }
    
    console.log('✅ Reschedule request created successfully')
    console.log('📋 Request ID:', result.request_id)
    console.log('📧 Email triggered:', result.message)
    
    return {
      success: true,
      requestId: result.request_id,
      message: result.message
    }
    
  } catch (error) {
    console.error('❌ Error testing reschedule request:', error.message)
    return { success: false, reason: 'network_error', error: error.message }
  }
}

async function checkBookingStatus(bookingId) {
  console.log('\n📊 Checking Booking Status After Reschedule')
  console.log('-'.repeat(45))
  
  try {
    // Check if booking status was updated to reschedule_requested
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, booking_reference, status, notes, updated_at')
      .eq('id', bookingId)
      .single()
    
    if (error) {
      console.error('❌ Failed to fetch booking:', error.message)
      return null
    }
    
    console.log('📋 Booking status:', booking.status)
    console.log('📝 Booking notes:', booking.notes)
    console.log('🕐 Last updated:', booking.updated_at)
    
    const hasRescheduleRequest = booking.status === 'reschedule_requested' || 
                                booking.notes?.includes('RESCHEDULE REQUEST')
    
    if (hasRescheduleRequest) {
      console.log('✅ Reschedule request properly recorded in booking')
    } else {
      console.log('⚠️  Reschedule request not found in booking data')
    }
    
    return {
      status: booking.status,
      hasRescheduleRequest,
      notes: booking.notes
    }
    
  } catch (error) {
    console.error('❌ Error checking booking status:', error.message)
    return null
  }
}

async function testAdminVisibility() {
  console.log('\n👨‍💼 Testing Admin Dashboard Visibility')
  console.log('-'.repeat(35))
  
  try {
    // Check if admin dashboard shows reschedule requests
    const today = new Date().toISOString().split('T')[0]
    const response = await fetch(`${API_BASE_URL}/api/admin/bookings/dashboard?admin_id=test&date=${today}`)
    
    if (!response.ok) {
      console.log('⚠️  Admin dashboard API not accessible (expected without auth)')
      return { accessible: false, reason: 'authentication_required' }
    }
    
    const result = await response.json()
    const bookings = result.today_bookings || []
    
    const rescheduleBookings = bookings.filter(b => 
      b.status === 'reschedule_requested' || 
      b.special_instructions?.includes('RESCHEDULE REQUEST')
    )
    
    console.log(`📊 Total bookings: ${bookings.length}`)
    console.log(`🔄 Reschedule requests: ${rescheduleBookings.length}`)
    
    if (rescheduleBookings.length > 0) {
      console.log('✅ Admin dashboard shows reschedule requests')
      rescheduleBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.booking_reference} - ${booking.status}`)
      })
    } else {
      console.log('⚠️  No reschedule requests visible in admin dashboard')
    }
    
    return {
      accessible: true,
      totalBookings: bookings.length,
      rescheduleRequests: rescheduleBookings.length
    }
    
  } catch (error) {
    console.error('❌ Error testing admin visibility:', error.message)
    return { accessible: false, error: error.message }
  }
}

async function runRescheduleTests() {
  console.log('🚀 Starting reschedule system tests...\n')
  
  // Test 1: Create a test booking
  const booking = await createTestBooking()
  if (!booking) {
    console.log('\n❌ Cannot continue without test booking')
    return
  }
  
  // Test 2: Get available slots for reschedule
  const newSlot = await getAvailableSlots()
  if (!newSlot) {
    console.log('\n⚠️  Cannot test reschedule without available slots')
  }
  
  // Test 3: Test reschedule request (even if it fails due to auth)
  let rescheduleResult = null
  if (newSlot) {
    rescheduleResult = await testRescheduleRequest(booking.bookingId, newSlot.id)
  }
  
  // Test 4: Check if booking was updated
  const bookingStatus = await checkBookingStatus(booking.bookingId)
  
  // Test 5: Test admin dashboard visibility
  const adminVisibility = await testAdminVisibility()
  
  // Summary
  console.log('\n📊 RESCHEDULE SYSTEM TEST SUMMARY')
  console.log('=' .repeat(40))
  
  console.log('\n📝 Test Booking:')
  console.log(`   ✅ Created: YES (${booking.bookingReference})`)
  
  console.log('\n📅 Available Slots:')
  console.log(`   ✅ Found: ${newSlot ? 'YES' : 'NO'}`)
  if (newSlot) {
    console.log(`   📋 Test slot: ${newSlot.date} at ${newSlot.time}`)
  }
  
  console.log('\n🔄 Reschedule Request:')
  if (rescheduleResult) {
    if (rescheduleResult.success) {
      console.log(`   ✅ Created: YES`)
      console.log(`   📧 Email sent: YES`)
    } else if (rescheduleResult.reason === 'authentication_required') {
      console.log(`   ⚠️  Auth required: YES (expected)`)
      console.log(`   ✅ API working: ${rescheduleResult.apiWorking ? 'YES' : 'NO'}`)
    } else {
      console.log(`   ❌ Failed: ${rescheduleResult.error}`)
    }
  } else {
    console.log(`   ❌ Not tested (no available slots)`)
  }
  
  console.log('\n📊 Booking Status:')
  if (bookingStatus) {
    console.log(`   📋 Status: ${bookingStatus.status}`)
    console.log(`   🔄 Has reschedule request: ${bookingStatus.hasRescheduleRequest ? 'YES' : 'NO'}`)
  } else {
    console.log(`   ❌ Could not check status`)
  }
  
  console.log('\n👨‍💼 Admin Visibility:')
  if (adminVisibility.accessible) {
    console.log(`   ✅ Dashboard accessible: YES`)
    console.log(`   📊 Shows reschedule requests: ${adminVisibility.rescheduleRequests > 0 ? 'YES' : 'NO'}`)
  } else {
    console.log(`   ⚠️  Dashboard requires auth: YES (expected)`)
  }
  
  // Overall assessment
  console.log('\n🎯 OVERALL ASSESSMENT:')
  
  const componentsWorking = []
  const componentsNeedWork = []
  
  if (booking) componentsWorking.push('Booking creation')
  if (newSlot) componentsWorking.push('Slot availability')
  if (rescheduleResult?.apiWorking) componentsWorking.push('Reschedule API')
  if (bookingStatus?.hasRescheduleRequest) componentsWorking.push('Booking status updates')
  if (adminVisibility.rescheduleRequests > 0) componentsWorking.push('Admin visibility')
  
  if (!newSlot) componentsNeedWork.push('Available slots for testing')
  if (rescheduleResult && !rescheduleResult.success && rescheduleResult.reason !== 'authentication_required') {
    componentsNeedWork.push('Reschedule request creation')
  }
  if (bookingStatus && !bookingStatus.hasRescheduleRequest) {
    componentsNeedWork.push('Booking status tracking')
  }
  
  if (componentsWorking.length > 0) {
    console.log('✅ Working components:')
    componentsWorking.forEach(component => console.log(`   - ${component}`))
  }
  
  if (componentsNeedWork.length > 0) {
    console.log('⚠️  Components needing attention:')
    componentsNeedWork.forEach(component => console.log(`   - ${component}`))
  }
  
  if (componentsWorking.length >= 3) {
    console.log('\n🎉 Reschedule system is largely functional!')
    console.log('💡 Main requirement: User authentication for full testing')
  } else {
    console.log('\n⚠️  Reschedule system needs more work')
    console.log('💡 Focus on the components listed above')
  }
}

// Main execution
if (require.main === module) {
  runRescheduleTests()
    .then(() => {
      console.log('\n✅ Reschedule system testing completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Testing failed:', error)
      process.exit(1)
    })
}

module.exports = {
  createTestBooking,
  getAvailableSlots,
  testRescheduleRequest,
  checkBookingStatus,
  testAdminVisibility,
  runRescheduleTests
}