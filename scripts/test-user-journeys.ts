#!/usr/bin/env tsx

/**
 * User Journey Test Runner
 * 
 * Runs the most critical user journey tests to validate the updated frontend
 * and dark theme implementation.
 */

import { execSync } from 'child_process';

interface TestSuite {
  name: string;
  path: string;
  priority: 'critical' | 'important' | 'optional';
  description: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'First-time Visitor Experience',
    path: 'tests/customer-journey/01-first-time-visitor.spec.ts',
    priority: 'critical',
    description: 'Tests homepage, navigation, and initial user experience'
  },
  {
    name: 'Anonymous Booking Flow',
    path: 'tests/customer-journey/02-anonymous-booking.spec.ts',
    priority: 'critical',
    description: 'Tests complete booking process for new users'
  },
  {
    name: 'User Registration',
    path: 'tests/customer-journey/03-user-registration.spec.ts',
    priority: 'important',
    description: 'Tests user account creation process'
  },
  {
    name: 'Mobile Navigation',
    path: 'tests/mobile/01-mobile-navigation.spec.ts',
    priority: 'important',
    description: 'Tests dark theme and navigation on mobile devices'
  }
];

async function runTestSuite(suite: TestSuite): Promise<{ success: boolean; output: string }> {
  console.log(`\n🧪 Running: ${suite.name}`);
  console.log(`📋 ${suite.description}`);
  
  try {
    const output = execSync(
      `npx playwright test "${suite.path}" --project=chromium --reporter=json`,
      { 
        encoding: 'utf8',
        timeout: 120000 // 2 minutes timeout
      }
    );
    
    console.log(`✅ ${suite.name}: PASSED`);
    return { success: true, output };
  } catch (error: any) {
    console.log(`❌ ${suite.name}: FAILED`);
    if (error.stdout) {
      console.log(`Output: ${error.stdout.slice(-500)}`); // Last 500 chars
    }
    return { success: false, output: error.message };
  }
}

async function main() {
  console.log('🚀 Love4Detailing User Journey Test Runner');
  console.log('===========================================');
  console.log('Testing updated frontend with service configuration and dark theme\n');

  const results: { suite: TestSuite; result: { success: boolean; output: string } }[] = [];
  
  // Run critical tests first
  const criticalSuites = TEST_SUITES.filter(s => s.priority === 'critical');
  console.log(`📊 Running ${criticalSuites.length} critical test suites...\n`);
  
  for (const suite of criticalSuites) {
    const result = await runTestSuite(suite);
    results.push({ suite, result });
    
    // If critical test fails, continue but note it
    if (!result.success) {
      console.log(`⚠️  Critical test failed, but continuing...`);
    }
  }
  
  // Run important tests
  const importantSuites = TEST_SUITES.filter(s => s.priority === 'important');
  console.log(`\n📊 Running ${importantSuites.length} important test suites...\n`);
  
  for (const suite of importantSuites) {
    const result = await runTestSuite(suite);
    results.push({ suite, result });
  }
  
  // Generate summary
  console.log('\n📋 Test Summary');
  console.log('================');
  
  const criticalPassed = results.filter(r => r.suite.priority === 'critical' && r.result.success).length;
  const importantPassed = results.filter(r => r.suite.priority === 'important' && r.result.success).length;
  const totalPassed = results.filter(r => r.result.success).length;
  
  console.log(`✅ Critical Tests: ${criticalPassed}/${criticalSuites.length} passed`);
  console.log(`✅ Important Tests: ${importantPassed}/${importantSuites.length} passed`);
  console.log(`✅ Total: ${totalPassed}/${results.length} test suites passed`);
  
  // Detailed results
  console.log('\n📝 Detailed Results:');
  results.forEach(({ suite, result }) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const priority = suite.priority.toUpperCase();
    console.log(`  ${status} [${priority}] ${suite.name}`);
  });
  
  // Summary for frontend implementation
  if (criticalPassed === criticalSuites.length) {
    console.log('\n🎉 SUCCESS: All critical user journeys are working!');
    console.log('✨ Frontend service configuration and dark theme implementation validated');
  } else {
    console.log('\n⚠️  WARNING: Some critical tests failed');
    console.log('🔧 Review failed tests and fix implementation issues');
  }
  
  if (totalPassed === results.length) {
    console.log('🌟 PERFECT: All test suites passed! Frontend is production ready.');
  }
  
  process.exit(totalPassed === results.length ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runUserJourneyTests };