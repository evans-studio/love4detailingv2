#!/usr/bin/env node

/**
 * Test Booking Creation with Email Integration
 * Verifies that emails are sent when bookings are created
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const API_BASE_URL = 'http://localhost:3000'

console.log('📧 BOOKING + EMAIL INTEGRATION TEST')
console.log('=' .repeat(40))

async function createTestBooking() {
  console.log('\n📝 Creating Test Booking')
  console.log('-'.repeat(25))
  
  const testBookingData = {
    customer_email: 'integration-test@example.com',
    customer_name: 'Integration Test User',
    customer_phone: '07123456789',
    slot_id: '2cbf2a78-18a7-4e32-bf2b-350733814e30',
    service_id: '6856143e-eb1d-4776-bf6b-3f6149f36901',
    vehicle_size: 'medium',
    service_address: '123 Integration Test Street, London',
    vehicle_registration: 'INT123',
    vehicle_make: 'Ford',
    vehicle_model: 'Focus',
    vehicle_year: 2023,
    vehicle_color: 'Blue',
    payment_method: 'cash'
  }

  try {
    console.log('🚀 Sending booking request...')
    
    const response = await fetch(`${API_BASE_URL}/api/bookings/enhanced/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingData: testBookingData })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Booking created successfully')
      console.log('📋 Booking ID:', result.data?.booking_id)
      console.log('📋 Booking Reference:', result.data?.booking_reference)
      console.log('📧 Email Triggered:', result.data?.email_triggered ? '✅ YES' : '❌ NO')
      
      if (result.data?.email_error) {
        console.log('❌ Email Error:', result.data.email_error)
      }
      
      if (result.data?.email_skipped) {
        console.log('⚠️  Email Skipped:', result.data.email_skipped)
      }
      
      // Return the booking data for further testing
      return {
        success: true,
        bookingId: result.data?.booking_id,
        bookingReference: result.data?.booking_reference,
        emailTriggered: result.data?.email_triggered,
        emailError: result.data?.email_error,
        accountCreated: result.data?.account_created,
        userId: result.data?.user_id
      }
    } else {
      const error = await response.json()
      console.log('❌ Booking creation failed:', error.error || error.details)
      return { success: false, error: error.error || error.details }
    }
  } catch (error) {
    console.log('💥 Booking request failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function checkEmailLogs() {
  console.log('\n📄 Checking Email Logs')
  console.log('-'.repeat(20))
  
  // Wait a moment for async operations
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  try {
    const fs = require('fs')
    const logPath = './dev.log'
    
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8')
      const recentLogs = logContent.split('\n').slice(-50) // Last 50 lines
      
      // Filter for email-related logs
      const emailLogs = recentLogs.filter(line => 
        line.includes('📧') || 
        line.includes('SENDING BOOKING CONFIRMATION') ||
        line.includes('Email data prepared') ||
        line.includes('Email triggered') ||
        line.includes('email sent successfully') ||
        line.includes('email failed')
      )
      
      if (emailLogs.length > 0) {
        console.log('📋 Recent email-related logs:')
        emailLogs.forEach(log => {
          // Clean up the log for better readability
          const cleanLog = log.replace(/^\d+→/, '').trim()
          console.log('   ', cleanLog)
        })
      } else {
        console.log('⚠️  No recent email logs found in dev.log')
      }
    } else {
      console.log('⚠️  No dev.log file found')
    }
  } catch (error) {
    console.log('❌ Error reading logs:', error.message)
  }
}

async function verifyEmailContent(bookingReference) {
  console.log('\n🔍 Email Content Verification')
  console.log('-'.repeat(30))
  
  console.log('📧 Expected email content should include:')
  console.log('   ✓ Booking reference:', bookingReference)
  console.log('   ✓ Customer name: Integration Test User')
  console.log('   ✓ Customer email: integration-test@example.com')
  console.log('   ✓ Vehicle: Ford Focus (INT123)')
  console.log('   ✓ Service: Full Car Detailing Service')
  console.log('   ✓ Price: £60.00 (medium vehicle)')
  console.log('   ✓ Location: 123 Integration Test Street, London')
  console.log('   ✓ Admin contact: zell@love4detailing.com')
  
  console.log('\n💡 Check your email inbox to verify these details are correct')
  
  return true
}

async function testFailureScenario() {
  console.log('\n🚫 Testing Email Failure Scenario')
  console.log('-'.repeat(35))
  
  // Temporarily break email by using invalid data
  const invalidBookingData = {
    customer_email: '', // Empty email should cause issues but not fail booking
    customer_name: 'Email Failure Test',
    customer_phone: '07123456789',
    slot_id: '2cbf2a78-18a7-4e32-bf2b-350733814e30',
    service_id: '6856143e-eb1d-4776-bf6b-3f6149f36901',
    vehicle_size: 'medium',
    service_address: '123 Test Street, London',
    vehicle_registration: 'FAIL123',
    vehicle_make: 'Test',
    vehicle_model: 'Vehicle',
    payment_method: 'cash'
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings/enhanced/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingData: invalidBookingData })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Booking still succeeded despite email issues (good!)')
      console.log('📧 Email Triggered:', result.data?.email_triggered ? '✅ YES' : '❌ NO')
      
      if (result.data?.email_error) {
        console.log('✅ Email error properly handled:', result.data.email_error)
      }
      
      return { success: true, emailRobust: !result.data?.email_triggered }
    } else {
      const error = await response.json()
      console.log('❌ Booking failed due to email issues (bad!):', error.error)
      return { success: false, emailRobust: false }
    }
  } catch (error) {
    console.log('💥 Request failed:', error.message)
    return { success: false, emailRobust: false }
  }
}

async function runIntegrationTest() {
  console.log('🚀 Starting booking + email integration test...\n')
  
  // Test 1: Create booking and check email integration
  const bookingResult = await createTestBooking()
  
  if (!bookingResult.success) {
    console.log('\n❌ Integration test failed - booking creation unsuccessful')
    return
  }
  
  // Test 2: Check email logs
  await checkEmailLogs()
  
  // Test 3: Verify expected email content
  if (bookingResult.bookingReference) {
    await verifyEmailContent(bookingResult.bookingReference)
  }
  
  // Test 4: Test failure scenario
  const failureResult = await testFailureScenario()
  
  // Summary
  console.log('\n📊 INTEGRATION TEST SUMMARY')
  console.log('=' .repeat(35))
  console.log('✅ Booking creation:', bookingResult.success ? 'PASSED' : 'FAILED')
  console.log('✅ Email integration:', bookingResult.emailTriggered ? 'ACTIVE' : 'INACTIVE')
  console.log('✅ Account creation:', bookingResult.accountCreated ? 'YES' : 'NO')
  console.log('✅ Email robustness:', failureResult.emailRobust ? 'ROBUST' : 'NEEDS WORK')
  
  if (bookingResult.emailTriggered && failureResult.emailRobust) {
    console.log('\n🎉 EMAIL INTEGRATION IS WORKING CORRECTLY!')
    console.log('💡 Emails are sent for successful bookings')
    console.log('💡 Bookings still work even if emails fail')
    console.log('💡 Check your email inbox for test messages')
  } else if (bookingResult.emailTriggered) {
    console.log('\n⚠️  EMAIL INTEGRATION IS PARTIALLY WORKING')
    console.log('💡 Emails are being sent but error handling may need improvement')
  } else {
    console.log('\n❌ EMAIL INTEGRATION NEEDS ATTENTION')
    console.log('💡 Emails are not being triggered for bookings')
    console.log('💡 Check email service configuration and API integration')
  }
}

// Main execution
if (require.main === module) {
  runIntegrationTest()
    .then(() => {
      console.log('\n✅ Integration testing completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Integration testing failed:', error)
      process.exit(1)
    })
}

module.exports = {
  createTestBooking,
  checkEmailLogs,
  verifyEmailContent,
  testFailureScenario,
  runIntegrationTest
}