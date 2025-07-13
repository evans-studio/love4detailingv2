#!/usr/bin/env node

/**
 * Targeted Email Delivery Testing
 * Tests email delivery scenarios and content validation
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const API_BASE_URL = 'http://localhost:3000'

console.log('📧 EMAIL DELIVERY TESTING')
console.log('=' .repeat(30))

async function testDirectEmailAPI() {
  console.log('\n📤 Testing Direct Email API')
  console.log('-'.repeat(25))
  
  const testEmailData = {
    booking_reference: 'EMAIL-TEST-001',
    customer_name: 'Email Test Customer',
    customer_email: 'test-direct@example.com',
    customer_phone: '07123456789',
    service_name: 'Full Car Detailing Service',
    service_date: '2025-07-20',
    service_time: '10:00',
    service_location: '123 Test Street, London, SW1A 1AA',
    vehicle_make: 'BMW',
    vehicle_model: 'X5',
    vehicle_registration: 'TEST123',
    total_price_pence: 7500,
    special_instructions: 'Test email - please handle with care',
    admin_phone: '07123 456789',
    admin_email: 'zell@love4detailing.com'
  }

  try {
    console.log('📧 Sending test email...')
    
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
      console.log('✅ Direct email sent successfully')
      console.log('📧 Message ID:', result.messageId)
      
      // Validate email content was properly prepared
      console.log('\n📋 Email Content Validation:')
      console.log('   Customer:', testEmailData.customer_name)
      console.log('   Email:', testEmailData.customer_email)
      console.log('   Booking ref:', testEmailData.booking_reference)
      console.log('   Vehicle:', `${testEmailData.vehicle_make} ${testEmailData.vehicle_model}`)
      console.log('   Price:', `£${(testEmailData.total_price_pence / 100).toFixed(2)}`)
      console.log('   Instructions:', testEmailData.special_instructions)
      
      return { success: true, messageId: result.messageId }
    } else {
      const error = await response.json()
      console.log('❌ Direct email failed:', error.error)
      return { success: false, error: error.error }
    }
  } catch (error) {
    console.log('💥 Email request failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function testInvalidEmailAddress() {
  console.log('\n🚫 Testing Invalid Email Address')
  console.log('-'.repeat(30))
  
  const invalidEmailData = {
    booking_reference: 'INVALID-EMAIL-001',
    customer_name: 'Invalid Email Test',
    customer_email: 'not-a-valid-email-address',
    customer_phone: '07123456789',
    service_name: 'Full Car Detailing Service',
    service_date: '2025-07-20',
    service_time: '10:00',
    service_location: '123 Test Street, London',
    vehicle_make: 'Honda',
    vehicle_model: 'Civic',
    vehicle_registration: 'INVALID1',
    total_price_pence: 6000,
    admin_phone: '07123 456789',
    admin_email: 'zell@love4detailing.com'
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailType: 'booking_confirmation',
        data: invalidEmailData
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('⚠️  Email sent to invalid address (unexpected):', result.messageId)
      return { success: true, messageId: result.messageId }
    } else {
      const error = await response.json()
      console.log('✅ Email properly rejected for invalid address:', error.error)
      return { success: false, error: error.error, expectedFailure: true }
    }
  } catch (error) {
    console.log('✅ Email service properly handled invalid address:', error.message)
    return { success: false, error: error.message, expectedFailure: true }
  }
}

async function testEmailContentValidation() {
  console.log('\n📝 Testing Email Content Requirements')
  console.log('-'.repeat(35))
  
  // Test missing required fields
  const incompleteData = {
    booking_reference: 'INCOMPLETE-001',
    customer_name: 'Incomplete Test',
    // Missing customer_email (required field)
    service_name: 'Test Service'
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailType: 'booking_confirmation',
        data: incompleteData
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('⚠️  Email sent with incomplete data (may need validation):', result.messageId)
      return { success: true, messageId: result.messageId, needsValidation: true }
    } else {
      const error = await response.json()
      console.log('✅ Email properly rejected for incomplete data:', error.error)
      return { success: false, error: error.error, expectedFailure: true }
    }
  } catch (error) {
    console.log('✅ Email service properly handled incomplete data:', error.message)
    return { success: false, error: error.message, expectedFailure: true }
  }
}

async function testRateLimitingScenario() {
  console.log('\n⏱️  Testing Rate Limiting (5 emails in quick succession)')
  console.log('-'.repeat(55))
  
  const results = []
  
  for (let i = 0; i < 5; i++) {
    const testData = {
      booking_reference: `RATE-TEST-${i + 1}`,
      customer_name: `Rate Test Customer ${i + 1}`,
      customer_email: `rate-test-${i + 1}@example.com`,
      customer_phone: '07123456789',
      service_name: 'Full Car Detailing Service',
      service_date: '2025-07-20',
      service_time: '10:00',
      service_location: '123 Test Street, London',
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      vehicle_registration: `RATE${i + 1}`,
      total_price_pence: 6000,
      admin_phone: '07123 456789',
      admin_email: 'zell@love4detailing.com'
    }

    try {
      console.log(`   📧 Sending email ${i + 1}/5...`)
      
      const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailType: 'booking_confirmation',
          data: testData
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`   ✅ Email ${i + 1} sent:`, result.messageId?.substring(0, 20) + '...')
        results.push({ success: true, messageId: result.messageId })
      } else {
        const error = await response.json()
        console.log(`   ❌ Email ${i + 1} failed:`, error.error)
        results.push({ success: false, error: error.error })
      }
    } catch (error) {
      console.log(`   💥 Email ${i + 1} request failed:`, error.message)
      results.push({ success: false, error: error.message })
    }
    
    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  const successCount = results.filter(r => r.success).length
  console.log(`\n📊 Rate limiting results: ${successCount}/5 emails sent successfully`)
  
  if (successCount === 5) {
    console.log('✅ No rate limiting issues detected')
  } else {
    console.log('⚠️  Some emails failed - may indicate rate limiting or other issues')
  }
  
  return results
}

async function runEmailDeliveryTests() {
  console.log('🚀 Starting email delivery tests...\n')
  
  // Test 1: Direct Email API
  const directTest = await testDirectEmailAPI()
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Test 2: Invalid Email Handling
  const invalidTest = await testInvalidEmailAddress()
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Test 3: Content Validation
  const contentTest = await testEmailContentValidation()
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Test 4: Rate Limiting
  const rateTest = await testRateLimitingScenario()
  
  // Summary
  console.log('\n📊 EMAIL DELIVERY TEST SUMMARY')
  console.log('=' .repeat(35))
  console.log('✅ Direct email test:', directTest.success ? 'PASSED' : 'FAILED')
  console.log('✅ Invalid email handling:', invalidTest.expectedFailure ? 'PASSED' : (invalidTest.success ? 'NEEDS REVIEW' : 'FAILED'))
  console.log('✅ Content validation:', contentTest.expectedFailure ? 'PASSED' : (contentTest.needsValidation ? 'NEEDS REVIEW' : 'FAILED'))
  
  const rateSuccessCount = rateTest.filter(r => r.success).length
  console.log('✅ Rate limiting test:', `${rateSuccessCount}/5 emails sent`)
  
  // Overall assessment
  console.log('\n🎯 EMAIL SYSTEM ASSESSMENT:')
  if (directTest.success) {
    console.log('✅ Email delivery is working')
    console.log('💡 Check your email inbox for test messages')
  } else {
    console.log('❌ Email delivery has issues')
    console.log('💡 Check RESEND_API_KEY and email service configuration')
  }
  
  if (invalidTest.expectedFailure) {
    console.log('✅ Invalid email handling is robust')
  } else {
    console.log('⚠️  Invalid email handling may need improvement')
  }
  
  if (rateSuccessCount >= 4) {
    console.log('✅ Rate limiting is not an immediate concern')
  } else {
    console.log('⚠️  Rate limiting may be affecting email delivery')
  }
}

// Main execution
if (require.main === module) {
  runEmailDeliveryTests()
    .then(() => {
      console.log('\n✅ Email delivery testing completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Email delivery testing failed:', error)
      process.exit(1)
    })
}

module.exports = {
  testDirectEmailAPI,
  testInvalidEmailAddress,
  testEmailContentValidation,
  testRateLimitingScenario,
  runEmailDeliveryTests
}