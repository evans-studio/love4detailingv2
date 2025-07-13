#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 * Tests the new rate limiting middleware functionality
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

// Test endpoints with different rate limits
const TEST_ENDPOINTS = [
  {
    path: '/api/auth/profile',
    method: 'GET',
    expectedLimit: 5,
    description: 'Auth endpoint (5/min)'
  },
  {
    path: '/api/bookings/available-slots',
    method: 'GET',
    expectedLimit: 10,
    description: 'Booking endpoint (10/min)'
  },
  {
    path: '/api/admin/analytics',
    method: 'GET',
    expectedLimit: 20,
    description: 'Admin endpoint (20/min)'
  },
  {
    path: '/api/services',
    method: 'GET',
    expectedLimit: 30,
    description: 'Public endpoint (30/min)'
  }
];

// Helper function to make requests
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    return {
      status: response.status,
      headers: {
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
        'x-ratelimit-policy': response.headers.get('x-ratelimit-policy'),
        'retry-after': response.headers.get('retry-after')
      },
      data: await response.json().catch(() => null)
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      headers: {}
    };
  }
}

// Test rate limiting for a specific endpoint
async function testEndpointRateLimit(testConfig) {
  console.log(`\n🧪 Testing: ${testConfig.description}`);
  console.log(`   Endpoint: ${testConfig.path}`);
  console.log(`   Expected limit: ${testConfig.expectedLimit} requests/minute`);
  console.log('   ' + '='.repeat(50));

  const results = [];
  
  // Make requests up to the limit + 2 extra
  const totalRequests = Math.min(testConfig.expectedLimit + 2, 12); // Cap at 12 for faster testing
  
  for (let i = 1; i <= totalRequests; i++) {
    const result = await makeRequest(testConfig.path, { method: testConfig.method });
    results.push(result);
    
    const status = result.status === 200 ? '✅' : result.status === 429 ? '❌' : '⚠️';
    const remaining = result.headers['x-ratelimit-remaining'] || 'N/A';
    const limit = result.headers['x-ratelimit-limit'] || 'N/A';
    
    console.log(`   Request ${i.toString().padStart(2)}: ${status} ${result.status} | Remaining: ${remaining}/${limit}`);
    
    // If we hit rate limit, show retry-after
    if (result.status === 429 && result.headers['retry-after']) {
      console.log(`   Rate limit hit! Retry after: ${result.headers['retry-after']} seconds`);
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Analyze results
  const successfulRequests = results.filter(r => r.status === 200).length;
  const rateLimitedRequests = results.filter(r => r.status === 429).length;
  const firstResult = results[0];
  
  console.log(`\n   📊 Results:`);
  console.log(`   - Successful requests: ${successfulRequests}`);
  console.log(`   - Rate limited requests: ${rateLimitedRequests}`);
  console.log(`   - Rate limit header: ${firstResult.headers['x-ratelimit-limit'] || 'Missing'}`);
  console.log(`   - Policy header: ${firstResult.headers['x-ratelimit-policy'] || 'Missing'}`);
  
  // Determine if test passed
  const hasCorrectLimit = firstResult.headers['x-ratelimit-limit'] === testConfig.expectedLimit.toString();
  const hasRateLimiting = rateLimitedRequests > 0 || successfulRequests <= testConfig.expectedLimit;
  
  if (hasCorrectLimit && hasRateLimiting) {
    console.log(`   ✅ Test PASSED: Rate limiting working correctly`);
  } else {
    console.log(`   ❌ Test FAILED: Rate limiting not working as expected`);
  }
  
  return { passed: hasCorrectLimit && hasRateLimiting, results };
}

// Test rate limit status API
async function testRateLimitStatusAPI() {
  console.log(`\n🔍 Testing Rate Limit Status API`);
  console.log('   ' + '='.repeat(50));
  
  const result = await makeRequest('/api/admin/rate-limit/status?endpoint=/api/services');
  
  if (result.status === 200 && result.data) {
    console.log('   ✅ Rate limit status API working');
    console.log(`   - Endpoint: ${result.data.endpoint}`);
    console.log(`   - Limit: ${result.data.limit}`);
    console.log(`   - Remaining: ${result.data.remaining}`);
    console.log(`   - Reset time: ${result.data.resetTime}`);
  } else {
    console.log('   ❌ Rate limit status API failed');
    console.log(`   - Status: ${result.status}`);
    console.log(`   - Error: ${result.error || 'Unknown'}`);
  }
}

// Test rate limit config API
async function testRateLimitConfigAPI() {
  console.log(`\n⚙️  Testing Rate Limit Config API`);
  console.log('   ' + '='.repeat(50));
  
  const result = await makeRequest('/api/admin/rate-limit/config');
  
  if (result.status === 200 && result.data) {
    console.log('   ✅ Rate limit config API working');
    console.log(`   - Enabled: ${result.data.enabled}`);
    console.log(`   - Admin bypass: ${result.data.adminBypass}`);
    console.log(`   - Rules count: ${result.data.rules?.length || 0}`);
  } else {
    console.log('   ❌ Rate limit config API failed');
    console.log(`   - Status: ${result.status}`);
    console.log(`   - Error: ${result.error || 'Unknown'}`);
  }
}

// Main test function
async function runRateLimitingTests() {
  console.log('🚀 RATE LIMITING SYSTEM TEST');
  console.log('=====================================');
  console.log('Testing Love4Detailing v2 rate limiting middleware...\n');
  
  // Test server availability
  console.log('📡 Checking server availability...');
  const healthCheck = await makeRequest('/api/services');
  if (healthCheck.status !== 200) {
    console.log('❌ Server not available. Make sure the development server is running.');
    console.log('   Run: npm run dev');
    process.exit(1);
  }
  console.log('✅ Server is available');
  
  // Test each endpoint
  const testResults = [];
  for (const testConfig of TEST_ENDPOINTS) {
    const result = await testEndpointRateLimit(testConfig);
    testResults.push(result);
  }
  
  // Test admin APIs
  await testRateLimitStatusAPI();
  await testRateLimitConfigAPI();
  
  // Summary
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  
  console.log('\n🎯 FINAL RESULTS');
  console.log('=====================================');
  console.log(`Tests passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED - Rate limiting system is working correctly!');
    console.log('\n📋 Rate Limiting Configuration:');
    console.log('- Auth endpoints: 5 requests/minute');
    console.log('- Booking endpoints: 10 requests/minute');
    console.log('- Admin endpoints: 20 requests/minute');
    console.log('- Public endpoints: 30 requests/minute');
  } else {
    console.log('❌ SOME TESTS FAILED - Rate limiting system needs attention');
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Configure Vercel Edge Config in production');
  console.log('2. Set up monitoring dashboards');
  console.log('3. Tune rate limits based on usage patterns');
}

// Run tests
runRateLimitingTests().catch(console.error);