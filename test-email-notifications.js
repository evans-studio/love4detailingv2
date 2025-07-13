#!/usr/bin/env node

/**
 * Comprehensive Email Notification Testing Suite
 * Tests booking confirmation emails, admin notifications, and failure scenarios
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_BASE_URL = 'http://localhost:3000'

// Initialize Supabase client only if we have the required environment variables
let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// Test data for different scenarios
const testBookingData = {
  valid: {
    customer_email: 'test-email-valid@example.com',
    customer_name: 'Valid Email Test',
    customer_phone: '07123456789',
    slot_id: '2cbf2a78-18a7-4e32-bf2b-350733814e30',
    service_id: '6856143e-eb1d-4776-bf6b-3f6149f36901',
    vehicle_size: 'medium',
    service_address: '123 Test Street, London',
    vehicle_registration: 'ETEST123',
    vehicle_make: 'Toyota',
    vehicle_model: 'Camry',
    vehicle_year: 2022,
    vehicle_color: 'Blue',
    payment_method: 'cash'
  },
  invalidEmail: {
    customer_email: 'invalid-email-address',
    customer_name: 'Invalid Email Test',
    customer_phone: '07123456789',
    slot_id: '2cbf2a78-18a7-4e32-bf2b-350733814e30',
    service_id: '6856143e-eb1d-4776-bf6b-3f6149f36901',
    vehicle_size: 'medium',
    service_address: '123 Test Street, London',
    vehicle_registration: 'INVALID123',
    vehicle_make: 'Honda',
    vehicle_model: 'Civic',
    vehicle_year: 2021,
    vehicle_color: 'Red',
    payment_method: 'cash'
  },
  missingData: {
    customer_email: 'test-missing@example.com',
    customer_name: 'Missing Data Test',
    customer_phone: '07123456789',
    slot_id: '2cbf2a78-18a7-4e32-bf2b-350733814e30',
    service_id: '6856143e-eb1d-4776-bf6b-3f6149f36901',
    vehicle_size: 'medium',
    service_address: '123 Test Street, London',
    // Missing vehicle data to test email robustness
    payment_method: 'cash'
  }
}

console.log('🧪 EMAIL NOTIFICATION TESTING SUITE')
console.log('=' .repeat(50))

async function testBookingCreationWithEmail(testName, bookingData) {
  console.log(`\n📧 Testing: ${testName}`)
  console.log('-'.repeat(30))
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings/enhanced/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingData })
    })

    const responseData = await response.json()
    
    if (response.ok) {
      console.log('✅ Booking created successfully')
      console.log('📋 Booking reference:', responseData.data?.booking_reference)
      console.log('📧 Email triggered:', responseData.data?.email_triggered ? 'YES' : 'NO')
      
      if (responseData.data?.email_error) {
        console.log('❌ Email error:', responseData.data.email_error)
      }
      
      if (responseData.data?.email_skipped) {
        console.log('⚠️  Email skipped:', responseData.data.email_skipped)
      }
      
      return {
        success: true,
        bookingId: responseData.data?.booking_id,
        emailTriggered: responseData.data?.email_triggered,
        emailError: responseData.data?.email_error
      }
    } else {
      console.log('❌ Booking creation failed:', responseData.error)
      return { success: false, error: responseData.error }
    }
  } catch (error) {
    console.log('💥 Request failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function testEmailService() {
  console.log('\n📧 Testing Email Service Directly')
  console.log('-'.repeat(30))
  
  try {
    const testEmailData = {
      booking_reference: 'TEST-EMAIL-001',
      customer_name: 'Direct Email Test',
      customer_email: 'test-direct@example.com',
      customer_phone: '07123456789',
      service_name: 'Full Car Detailing Service',
      service_date: '2025-07-20',
      service_time: '10:00',
      service_location: '123 Test Street, London',
      vehicle_make: 'BMW',
      vehicle_model: 'X5',
      vehicle_registration: 'DIRECT123',
      total_price_pence: 7500,
      special_instructions: 'This is a test email',
      admin_phone: '07123 456789',
      admin_email: 'zell@love4detailing.com'
    }

    const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailType: 'booking_confirmation',
        data: testEmailData
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Direct email test successful:', result)
    } else {
      const error = await response.json()
      console.log('❌ Direct email test failed:', error)
    }
  } catch (error) {
    console.log('💥 Direct email test error:', error.message)
  }
}

async function testEmailConfiguration() {
  console.log('\n🔧 Testing Email Configuration')
  console.log('-'.repeat(30))
  
  // Check environment variables
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    console.log('❌ RESEND_API_KEY not configured')
    return false
  }
  
  console.log('✅ RESEND_API_KEY configured:', resendApiKey.substring(0, 10) + '...')
  return true
}

async function verifyBookingEmailLogs() {
  console.log('\n📝 Checking Recent Email Logs')
  console.log('-'.repeat(30))
  
  // Wait a bit for async emails to complete
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  // Check dev.log for email-related entries
  try {
    const fs = require('fs')
    const logPath = './dev.log'
    
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8')
      const emailLogs = logContent.split('\n').filter(line => 
        line.includes('📧') || 
        line.includes('Email') || 
        line.includes('SENDING BOOKING CONFIRMATION')
      ).slice(-10) // Last 10 email-related logs
      
      if (emailLogs.length > 0) {
        console.log('📋 Recent email logs:')
        emailLogs.forEach(log => console.log('  ', log))
      } else {
        console.log('⚠️  No recent email logs found')
      }
    } else {
      console.log('⚠️  No dev.log file found')
    }
  } catch (error) {
    console.log('❌ Error reading logs:', error.message)
  }
}

async function testInvalidEmailHandling() {
  console.log('\n⚠️  Testing Invalid Email Handling')
  console.log('-'.repeat(30))
  
  const result = await testBookingCreationWithEmail(
    'Invalid Email Address',
    testBookingData.invalidEmail
  )
  
  if (result.success) {
    console.log('✅ Booking still succeeded with invalid email (good!)')
    if (result.emailError) {
      console.log('✅ Email error properly handled:', result.emailError)
    }
  } else {
    console.log('❌ Booking failed due to email issue (bad!)')
  }
  
  return result
}

async function testMissingDataHandling() {
  console.log('\n📭 Testing Missing Data Handling')
  console.log('-'.repeat(30))
  
  const result = await testBookingCreationWithEmail(
    'Missing Vehicle Data',
    testBookingData.missingData
  )
  
  if (result.success) {
    console.log('✅ Booking succeeded despite missing data (good!)')
  } else {
    console.log('❌ Booking failed due to missing data')
  }
  
  return result
}

async function runComprehensiveEmailTests() {
  console.log('🚀 Starting comprehensive email notification tests...\n')
  
  // Test 1: Configuration Check
  const configOk = await testEmailConfiguration()
  if (!configOk) {
    console.log('\n❌ Email configuration issues detected. Stopping tests.')
    return
  }
  
  // Test 2: Valid Email Test
  const validTest = await testBookingCreationWithEmail(
    'Valid Email Test',
    testBookingData.valid
  )
  
  // Test 3: Invalid Email Handling
  const invalidTest = await testInvalidEmailHandling()
  
  // Test 4: Missing Data Handling
  const missingDataTest = await testMissingDataHandling()
  
  // Test 5: Direct Email Service Test
  await testEmailService()
  
  // Test 6: Check Email Logs
  await verifyBookingEmailLogs()
  
  // Summary
  console.log('\n📊 EMAIL TESTING SUMMARY')
  console.log('=' .repeat(30))
  console.log('✅ Valid email test:', validTest.success ? 'PASSED' : 'FAILED')
  console.log('✅ Invalid email handling:', invalidTest.success ? 'PASSED' : 'FAILED')
  console.log('✅ Missing data handling:', missingDataTest.success ? 'PASSED' : 'FAILED')
  console.log('📧 Email integration:', validTest.emailTriggered ? 'ACTIVE' : 'INACTIVE')
  
  if (validTest.emailTriggered) {
    console.log('\n🎉 Email notifications are working!')
    console.log('💡 Check your email inbox for test emails')
  } else {
    console.log('\n⚠️  Email notifications may not be working properly')
    console.log('💡 Check RESEND_API_KEY configuration and email service setup')
  }
}

// Handle rate limiting
async function waitForRateLimit() {
  console.log('⏱️  Waiting 2 seconds to avoid rate limiting...')
  await new Promise(resolve => setTimeout(resolve, 2000))
}

// Main execution
if (require.main === module) {
  runComprehensiveEmailTests()
    .then(() => {
      console.log('\n✅ Email testing completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Email testing failed:', error)
      process.exit(1)
    })
}

module.exports = {
  testBookingCreationWithEmail,
  testEmailService,
  testEmailConfiguration,
  runComprehensiveEmailTests
}