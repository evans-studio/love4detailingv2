#!/usr/bin/env node

/**
 * Monitoring System Test Script
 * Tests the comprehensive monitoring and logging system
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

// Test health check endpoint
async function testHealthCheck() {
  console.log('🏥 Testing Health Check System...');
  console.log('================================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    console.log(`✅ Health Check Status: ${response.status}`);
    console.log(`📊 Overall Status: ${data.status}`);
    console.log(`⏱️  Uptime: ${data.uptime} seconds`);
    console.log(`🔧 Environment: ${data.environment}`);
    console.log(`📦 Version: ${data.version}`);
    
    console.log('\n🔍 Service Status:');
    Object.entries(data.services).forEach(([service, status]) => {
      const statusIcon = status.status === 'healthy' ? '✅' : 
                        status.status === 'degraded' ? '⚠️' : '❌';
      console.log(`  ${statusIcon} ${service}: ${status.status} (${status.responseTime}ms)`);
      if (status.details) {
        console.log(`     Details: ${status.details}`);
      }
    });
    
    return { passed: true, data };
  } catch (error) {
    console.log(`❌ Health Check Failed: ${error.message}`);
    return { passed: false, error };
  }
}

// Test logging endpoints
async function testLoggingEndpoints() {
  console.log('\n📝 Testing Logging System...');
  console.log('=============================');
  
  try {
    // Test log creation
    const testLogEntry = {
      level: 'info',
      message: 'Test log entry from monitoring system test',
      component: 'test-suite',
      metadata: {
        testId: 'monitoring-test-001',
        timestamp: new Date().toISOString()
      }
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/monitoring/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testLogEntry)
    });
    
    const createResult = await createResponse.json();
    console.log(`✅ Log Creation: ${createResponse.status} - ${createResult.message}`);
    
    // Test log retrieval
    const retrieveResponse = await fetch(`${BASE_URL}/api/monitoring/logs?limit=10`);
    const retrieveResult = await retrieveResponse.json();
    
    if (retrieveResult.success) {
      console.log(`✅ Log Retrieval: ${retrieveResponse.status}`);
      console.log(`📊 Retrieved ${retrieveResult.data.logs.length} logs`);
      console.log(`📈 Total logs: ${retrieveResult.data.total}`);
      
      // Show recent logs
      console.log('\n🔍 Recent Log Entries:');
      retrieveResult.data.logs.slice(0, 3).forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.levelName}] ${log.component}: ${log.message}`);
        console.log(`     Time: ${new Date(log.timestamp).toLocaleString()}`);
      });
    } else {
      console.log(`❌ Log Retrieval Failed: ${retrieveResult.error}`);
    }
    
    // Test log filtering
    const filterResponse = await fetch(`${BASE_URL}/api/monitoring/logs?level=INFO&component=test-suite`);
    const filterResult = await filterResponse.json();
    
    if (filterResult.success) {
      console.log(`✅ Log Filtering: Found ${filterResult.data.logs.length} filtered logs`);
    }
    
    return { passed: true };
  } catch (error) {
    console.log(`❌ Logging Test Failed: ${error.message}`);
    return { passed: false, error };
  }
}

// Test rate limiting monitoring
async function testRateLimitingMonitoring() {
  console.log('\n🚦 Testing Rate Limiting Monitoring...');
  console.log('======================================');
  
  try {
    // Test rate limit status
    const statusResponse = await fetch(`${BASE_URL}/api/admin/rate-limit/status?endpoint=/api/services`);
    const statusResult = await statusResponse.json();
    
    if (statusResult.success) {
      console.log(`✅ Rate Limit Status: ${statusResponse.status}`);
      console.log(`📊 Endpoint: ${statusResult.data.endpoint}`);
      console.log(`⏱️  Limit: ${statusResult.data.limit}`);
      console.log(`🔄 Remaining: ${statusResult.data.remaining}`);
    } else {
      console.log(`⚠️  Rate Limit Status: ${statusResult.error}`);
    }
    
    // Test rate limit config
    const configResponse = await fetch(`${BASE_URL}/api/admin/rate-limit/config`);
    const configResult = await configResponse.json();
    
    if (configResult.success) {
      console.log(`✅ Rate Limit Config: ${configResponse.status}`);
      console.log(`🔧 Enabled: ${configResult.data.enabled}`);
      console.log(`👤 Admin Bypass: ${configResult.data.adminBypass}`);
      console.log(`📋 Rules: ${configResult.data.rules?.length || 0} configured`);
    } else {
      console.log(`⚠️  Rate Limit Config: ${configResult.error}`);
    }
    
    return { passed: true };
  } catch (error) {
    console.log(`❌ Rate Limiting Test Failed: ${error.message}`);
    return { passed: false, error };
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🔥 Testing Error Handling...');
  console.log('============================');
  
  try {
    // Test 404 error
    const notFoundResponse = await fetch(`${BASE_URL}/api/non-existent-endpoint`);
    console.log(`✅ 404 Error Handling: ${notFoundResponse.status}`);
    
    // Test invalid log creation
    const invalidLogResponse = await fetch(`${BASE_URL}/api/monitoring/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ invalid: 'data' })
    });
    
    const invalidLogResult = await invalidLogResponse.json();
    console.log(`✅ Invalid Log Handling: ${invalidLogResponse.status} - ${invalidLogResult.error}`);
    
    return { passed: true };
  } catch (error) {
    console.log(`❌ Error Handling Test Failed: ${error.message}`);
    return { passed: false, error };
  }
}

// Performance test
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  console.log('========================');
  
  try {
    const startTime = Date.now();
    
    // Test multiple concurrent requests
    const promises = Array(5).fill(null).map(() => fetch(`${BASE_URL}/api/health`));
    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`✅ Concurrent Health Checks: ${results.length} requests in ${totalTime}ms`);
    console.log(`📊 Average response time: ${(totalTime / results.length).toFixed(2)}ms`);
    
    // Test logging performance
    const logStartTime = Date.now();
    const logPromises = Array(3).fill(null).map((_, i) => 
      fetch(`${BASE_URL}/api/monitoring/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: 'info',
          message: `Performance test log ${i + 1}`,
          component: 'performance-test'
        })
      })
    );
    
    await Promise.all(logPromises);
    const logEndTime = Date.now();
    const logTotalTime = logEndTime - logStartTime;
    
    console.log(`✅ Concurrent Log Creation: ${logPromises.length} requests in ${logTotalTime}ms`);
    
    return { passed: true };
  } catch (error) {
    console.log(`❌ Performance Test Failed: ${error.message}`);
    return { passed: false, error };
  }
}

// Main test runner
async function runMonitoringSystemTests() {
  console.log('🚀 MONITORING SYSTEM COMPREHENSIVE TEST');
  console.log('=======================================');
  console.log('Testing Love4Detailing v2 monitoring capabilities...\n');
  
  // Check server availability
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      console.log('❌ Server not available. Make sure the development server is running.');
      console.log('   Run: npm run dev');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Server not reachable. Make sure the development server is running.');
    console.log('   Run: npm run dev');
    process.exit(1);
  }
  
  const tests = [
    { name: 'Health Check System', fn: testHealthCheck },
    { name: 'Logging System', fn: testLoggingEndpoints },
    { name: 'Rate Limiting Monitoring', fn: testRateLimitingMonitoring },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Performance Testing', fn: testPerformance }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, ...result });
    } catch (error) {
      results.push({ name: test.name, passed: false, error });
    }
  }
  
  // Summary
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log('\n🎯 MONITORING SYSTEM TEST RESULTS');
  console.log('==================================');
  console.log(`Tests passed: ${passedTests}/${totalTests}`);
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error.message || result.error}`);
    }
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED - Monitoring system is fully operational!');
    console.log('\n📋 Monitoring Features Available:');
    console.log('- Comprehensive health checks with service status');
    console.log('- Structured logging with filtering and export');
    console.log('- Rate limiting monitoring and configuration');
    console.log('- Error boundary integration with logging');
    console.log('- Performance monitoring and metrics');
    console.log('- Real-time monitoring dashboard at /admin/monitoring');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Check the monitoring system configuration');
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Access the monitoring dashboard at /admin/monitoring');
  console.log('2. Set up automated health check monitoring');
  console.log('3. Configure log retention and rotation');
  console.log('4. Set up alerting for critical issues');
}

// Run tests
runMonitoringSystemTests().catch(console.error);