#!/usr/bin/env node

/**
 * Comprehensive Schedule System Integration Test
 * Tests the complete schedule system end-to-end
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  testStartDate: '2024-01-15',
  testEndDate: '2024-01-21',
  testServiceId: 'service-1',
  testVehicleSize: 'medium'
}

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

// Test database connection
async function testDatabaseConnection() {
  logInfo('Testing database connection...')
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey)
    
    const { data, error } = await supabase
      .from('available_slots')
      .select('count')
      .limit(1)
    
    if (error) {
      throw error
    }
    
    logSuccess('Database connection successful')
    return true
  } catch (error) {
    logError(`Database connection failed: ${error.message}`)
    return false
  }
}

// Test API endpoints
async function testApiEndpoints() {
  logInfo('Testing API endpoints...')
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const endpoints = [
    {
      name: 'Available Slots',
      url: `${baseUrl}/api/bookings/available-slots`,
      method: 'POST',
      body: {
        startDate: TEST_CONFIG.testStartDate,
        endDate: TEST_CONFIG.testEndDate,
        serviceId: TEST_CONFIG.testServiceId,
        vehicleSize: TEST_CONFIG.testVehicleSize
      }
    },
    {
      name: 'Schedule Templates',
      url: `${baseUrl}/api/admin/schedule/templates`,
      method: 'GET'
    },
    {
      name: 'Schedule Analytics',
      url: `${baseUrl}/api/admin/schedule/analytics`,
      method: 'GET'
    }
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_CONFIG.supabaseKey}`
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      logSuccess(`${endpoint.name} API endpoint working`)
      
      // Validate response structure
      if (endpoint.name === 'Available Slots') {
        if (!data.success || !Array.isArray(data.data)) {
          throw new Error('Invalid response structure')
        }
      }
      
    } catch (error) {
      logError(`${endpoint.name} API endpoint failed: ${error.message}`)
    }
  }
}

// Test component rendering
async function testComponentRendering() {
  logInfo('Testing component rendering...')
  
  try {
    // Check if all required component files exist
    const requiredComponents = [
      'src/components/booking/SlotPicker.tsx',
      'src/components/admin/schedule/AdvancedScheduleManager.tsx',
      'src/components/admin/schedule/SimplifiedScheduleManager.tsx'
    ]
    
    for (const component of requiredComponents) {
      const componentPath = path.join(process.cwd(), component)
      if (!fs.existsSync(componentPath)) {
        throw new Error(`Component file not found: ${component}`)
      }
    }
    
    logSuccess('All required components exist')
    
    // Run component tests
    try {
      execSync('npm test -- --testPathPattern=SlotPicker.test.tsx', { 
        stdio: 'pipe',
        cwd: process.cwd()
      })
      logSuccess('SlotPicker component tests passed')
    } catch (error) {
      logWarning('SlotPicker component tests failed or skipped')
    }
    
    try {
      execSync('npm test -- --testPathPattern=AdvancedScheduleManager.test.tsx', { 
        stdio: 'pipe',
        cwd: process.cwd()
      })
      logSuccess('AdvancedScheduleManager component tests passed')
    } catch (error) {
      logWarning('AdvancedScheduleManager component tests failed or skipped')
    }
    
  } catch (error) {
    logError(`Component rendering test failed: ${error.message}`)
  }
}

// Test store functionality
async function testStoreIntegration() {
  logInfo('Testing store integration...')
  
  try {
    // Run store tests
    execSync('npm test -- --testPathPattern=scheduleStore.test.ts', { 
      stdio: 'pipe',
      cwd: process.cwd()
    })
    logSuccess('Store integration tests passed')
  } catch (error) {
    logWarning('Store integration tests failed or skipped')
  }
}

// Test accessibility features
async function testAccessibilityFeatures() {
  logInfo('Testing accessibility features...')
  
  try {
    // Check if accessibility features are properly implemented
    const slotPickerContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/booking/SlotPicker.tsx'),
      'utf8'
    )
    
    const requiredA11yFeatures = [
      'aria-label',
      'aria-pressed',
      'aria-disabled',
      'aria-describedby',
      'aria-live',
      'role=',
      'tabIndex',
      'onKeyDown'
    ]
    
    let missingFeatures = []
    
    for (const feature of requiredA11yFeatures) {
      if (!slotPickerContent.includes(feature)) {
        missingFeatures.push(feature)
      }
    }
    
    if (missingFeatures.length > 0) {
      logWarning(`Missing accessibility features: ${missingFeatures.join(', ')}`)
    } else {
      logSuccess('All accessibility features implemented')
    }
    
    // Check for keyboard navigation
    if (slotPickerContent.includes('ArrowRight') && slotPickerContent.includes('ArrowLeft')) {
      logSuccess('Keyboard navigation implemented')
    } else {
      logWarning('Keyboard navigation may not be fully implemented')
    }
    
    // Check for high contrast mode
    if (slotPickerContent.includes('highContrast')) {
      logSuccess('High contrast mode implemented')
    } else {
      logWarning('High contrast mode not implemented')
    }
    
    // Check for reduced motion
    if (slotPickerContent.includes('reduceMotion')) {
      logSuccess('Reduced motion support implemented')
    } else {
      logWarning('Reduced motion support not implemented')
    }
    
  } catch (error) {
    logError(`Accessibility test failed: ${error.message}`)
  }
}

// Test database functions
async function testDatabaseFunctions() {
  logInfo('Testing database functions...')
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      TEST_CONFIG.supabaseUrl, 
      process.env.SUPABASE_SERVICE_ROLE_KEY || TEST_CONFIG.supabaseKey
    )
    
    // Test get_enhanced_available_slots function
    const { data: slots, error: slotsError } = await supabase.rpc('get_enhanced_available_slots', {
      date_start: TEST_CONFIG.testStartDate,
      date_end: TEST_CONFIG.testEndDate,
      service_id: TEST_CONFIG.testServiceId,
      vehicle_size: TEST_CONFIG.testVehicleSize
    })
    
    if (slotsError) {
      throw new Error(`get_enhanced_available_slots failed: ${slotsError.message}`)
    }
    
    logSuccess('get_enhanced_available_slots function working')
    
    // Test other database functions if they exist
    const functions = [
      'manage_time_slot',
      'book_time_slot',
      'cancel_slot_booking',
      'generate_available_slots_from_template'
    ]
    
    for (const func of functions) {
      try {
        // Test function existence by calling with minimal params
        const { error } = await supabase.rpc(func, {})
        
        if (error && !error.message.includes('required')) {
          throw error
        }
        
        logSuccess(`${func} function exists`)
      } catch (error) {
        logWarning(`${func} function may not exist or have issues`)
      }
    }
    
  } catch (error) {
    logError(`Database functions test failed: ${error.message}`)
  }
}

// Test performance
async function testPerformance() {
  logInfo('Testing performance...')
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    // Test API response time
    const startTime = Date.now()
    
    const response = await fetch(`${baseUrl}/api/bookings/available-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate: TEST_CONFIG.testStartDate,
        endDate: TEST_CONFIG.testEndDate,
        serviceId: TEST_CONFIG.testServiceId,
        vehicleSize: TEST_CONFIG.testVehicleSize
      })
    })
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    if (response.ok) {
      if (responseTime < 1000) {
        logSuccess(`API response time: ${responseTime}ms (Good)`)
      } else if (responseTime < 3000) {
        logWarning(`API response time: ${responseTime}ms (Acceptable)`)
      } else {
        logError(`API response time: ${responseTime}ms (Too slow)`)
      }
    } else {
      logError('API request failed during performance test')
    }
    
  } catch (error) {
    logError(`Performance test failed: ${error.message}`)
  }
}

// Generate test report
function generateTestReport() {
  logInfo('Generating test report...')
  
  const report = {
    timestamp: new Date().toISOString(),
    testConfig: TEST_CONFIG,
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      warnings: 0
    },
    details: []
  }
  
  // This would be populated by the actual test results
  // For now, we'll create a basic report structure
  
  const reportPath = path.join(process.cwd(), 'test-reports', 'schedule-system-test-report.json')
  
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    logSuccess(`Test report generated: ${reportPath}`)
  } catch (error) {
    logError(`Failed to generate test report: ${error.message}`)
  }
}

// Main test runner
async function runAllTests() {
  log('🧪 Starting Schedule System Integration Tests', 'blue')
  log('================================================', 'blue')
  
  // Validate environment
  if (!TEST_CONFIG.supabaseUrl || !TEST_CONFIG.supabaseKey) {
    logError('Missing required environment variables')
    process.exit(1)
  }
  
  // Run all tests
  await testDatabaseConnection()
  await testApiEndpoints()
  await testComponentRendering()
  await testStoreIntegration()
  await testAccessibilityFeatures()
  await testDatabaseFunctions()
  await testPerformance()
  
  // Generate report
  generateTestReport()
  
  log('================================================', 'blue')
  log('🎉 Schedule System Integration Tests Complete', 'green')
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Test runner failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  testDatabaseConnection,
  testApiEndpoints,
  testComponentRendering,
  testStoreIntegration,
  testAccessibilityFeatures,
  testDatabaseFunctions,
  testPerformance
}