const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://love4detailingv2.vercel.app';
const RESULTS_DIR = './testing/results';

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

class TestReporter {
  constructor() {
    this.results = [];
    this.screenshots = [];
    this.currentTest = null;
  }

  startTest(testName) {
    this.currentTest = {
      name: testName,
      startTime: new Date(),
      steps: [],
      issues: [],
      screenshots: []
    };
  }

  logStep(step, status, details = '') {
    if (this.currentTest) {
      this.currentTest.steps.push({
        step,
        status,
        details,
        timestamp: new Date()
      });
      console.log(`[${status}] ${step}${details ? ': ' + details : ''}`);
    }
  }

  logIssue(severity, description, location, expected, actual) {
    if (this.currentTest) {
      this.currentTest.issues.push({
        severity,
        description,
        location,
        expected,
        actual,
        timestamp: new Date()
      });
      console.error(`[${severity}] ${description} at ${location}`);
    }
  }

  async takeScreenshot(page, description) {
    if (this.currentTest) {
      const filename = `${this.currentTest.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
      const filepath = path.join(RESULTS_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: true });
      
      this.currentTest.screenshots.push({
        description,
        filename,
        filepath
      });
      console.log(`📸 Screenshot saved: ${description}`);
    }
  }

  endTest() {
    if (this.currentTest) {
      this.currentTest.endTime = new Date();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      this.results.push(this.currentTest);
      this.currentTest = null;
    }
  }

  generateReport() {
    const reportPath = path.join(RESULTS_DIR, `test-report-${Date.now()}.html`);
    const html = this.generateHTMLReport();
    fs.writeFileSync(reportPath, html);
    console.log(`📋 Test report generated: ${reportPath}`);
    return reportPath;
  }

  generateHTMLReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(t => t.issues.length === 0).length;
    const totalIssues = this.results.reduce((sum, t) => sum + t.issues.length, 0);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Love4Detailing Browser Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .test { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .pass { border-color: #4CAF50; }
        .fail { border-color: #f44336; }
        .step { margin: 5px 0; padding: 5px; }
        .step.PASS { background: #e8f5e8; }
        .step.FAIL { background: #ffebee; }
        .issue { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .issue.High { border-color: #e17055; background: #ffeaa7; }
        .issue.Medium { border-color: #fdcb6e; }
        .issue.Low { border-color: #74b9ff; background: #e3f2fd; }
        .screenshot { margin: 10px 0; }
        .screenshot img { max-width: 300px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>Love4Detailing v2 - Browser Test Report</h1>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Total Tests:</strong> ${totalTests}</p>
        <p><strong>Passed:</strong> ${passedTests}</p>
        <p><strong>Failed:</strong> ${totalTests - passedTests}</p>
        <p><strong>Total Issues:</strong> ${totalIssues}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    ${this.results.map(test => `
    <div class="test ${test.issues.length === 0 ? 'pass' : 'fail'}">
        <h3>${test.name} ${test.issues.length === 0 ? '✅' : '❌'}</h3>
        <p><strong>Duration:</strong> ${Math.round(test.duration / 1000)}s</p>
        
        <h4>Steps:</h4>
        ${test.steps.map(step => `
            <div class="step ${step.status}">
                [${step.status}] ${step.step}${step.details ? ': ' + step.details : ''}
            </div>
        `).join('')}
        
        ${test.issues.length > 0 ? `
        <h4>Issues Found:</h4>
        ${test.issues.map(issue => `
            <div class="issue ${issue.severity}">
                <strong>[${issue.severity}] ${issue.description}</strong><br>
                <strong>Location:</strong> ${issue.location}<br>
                <strong>Expected:</strong> ${issue.expected}<br>
                <strong>Actual:</strong> ${issue.actual}
            </div>
        `).join('')}
        ` : ''}
        
        ${test.screenshots.length > 0 ? `
        <h4>Screenshots:</h4>
        ${test.screenshots.map(screenshot => `
            <div class="screenshot">
                <p><strong>${screenshot.description}</strong></p>
                <img src="${screenshot.filename}" alt="${screenshot.description}">
            </div>
        `).join('')}
        ` : ''}
    </div>
    `).join('')}
</body>
</html>`;
  }
}

async function testAnonymousBookingFlow(page, reporter) {
  reporter.startTest('Anonymous Customer Booking Flow');
  
  try {
    // Step 1: Load homepage
    reporter.logStep('Navigate to homepage', 'RUNNING');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await reporter.takeScreenshot(page, 'Homepage loaded');
    
    // Check if page loaded correctly
    const title = await page.title();
    if (title.toLowerCase().includes('love4detailing')) {
      reporter.logStep('Homepage loads correctly', 'PASS', `Title: ${title}`);
    } else {
      reporter.logIssue('High', 'Homepage title incorrect', BASE_URL, 'Love4Detailing in title', title);
      reporter.logStep('Homepage loads correctly', 'FAIL', `Wrong title: ${title}`);
    }

    // Step 2: Navigate to booking
    reporter.logStep('Click Book Now button', 'RUNNING');
    try {
      // Look for various possible book now buttons
      const bookButton = await page.locator('a:has-text("Book"), button:has-text("Book"), [href*="/book"]').first();
      if (await bookButton.isVisible()) {
        await bookButton.click();
        await page.waitForLoadState('networkidle');
        await reporter.takeScreenshot(page, 'Booking page loaded');
        reporter.logStep('Navigate to booking page', 'PASS');
      } else {
        reporter.logIssue('High', 'Book Now button not found', BASE_URL, 'Book button visible', 'Button not found');
        reporter.logStep('Navigate to booking page', 'FAIL', 'Book button not found');
      }
    } catch (error) {
      reporter.logIssue('High', 'Failed to click Book button', BASE_URL, 'Successful navigation', error.message);
      reporter.logStep('Navigate to booking page', 'FAIL', error.message);
    }

    // Step 3: Test vehicle registration
    reporter.logStep('Enter vehicle registration', 'RUNNING');
    try {
      const regInput = await page.locator('input[placeholder*="reg" i], input[name*="reg" i]').first();
      if (await regInput.isVisible()) {
        await regInput.fill('AB12 CDE');
        await reporter.takeScreenshot(page, 'Vehicle registration entered');
        reporter.logStep('Enter vehicle registration', 'PASS');
      } else {
        reporter.logIssue('High', 'Vehicle registration input not found', page.url(), 'Registration input visible', 'Input not found');
        reporter.logStep('Enter vehicle registration', 'FAIL', 'Input not found');
      }
    } catch (error) {
      reporter.logIssue('Medium', 'Failed to enter registration', page.url(), 'Successful input', error.message);
      reporter.logStep('Enter vehicle registration', 'FAIL', error.message);
    }

    // Step 4: Continue through booking flow
    reporter.logStep('Continue booking flow', 'RUNNING');
    try {
      // Look for Next/Continue button
      const nextButton = await page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        await reporter.takeScreenshot(page, 'Next step in booking');
        reporter.logStep('Continue booking flow', 'PASS');
      } else {
        reporter.logStep('Continue booking flow', 'FAIL', 'Next button not found');
      }
    } catch (error) {
      reporter.logStep('Continue booking flow', 'FAIL', error.message);
    }

    // Test form fields that might be present
    const commonInputs = [
      { selector: 'input[name*="email" i], input[type="email"]', name: 'Email input', testValue: 'test@example.com' },
      { selector: 'input[name*="phone" i], input[type="tel"]', name: 'Phone input', testValue: '07123456789' },
      { selector: 'input[name*="name" i]', name: 'Name input', testValue: 'Test User' },
      { selector: 'input[name*="postcode" i]', name: 'Postcode input', testValue: 'SW1A 1AA' }
    ];

    for (const input of commonInputs) {
      try {
        const element = await page.locator(input.selector).first();
        if (await element.isVisible()) {
          await element.fill(input.testValue);
          reporter.logStep(`Fill ${input.name}`, 'PASS');
        }
      } catch (error) {
        // Not critical if optional fields aren't found
        reporter.logStep(`Fill ${input.name}`, 'SKIP', 'Field not found or not required');
      }
    }

    await reporter.takeScreenshot(page, 'Final booking form state');

  } catch (error) {
    reporter.logIssue('High', 'Booking flow crashed', page.url(), 'Successful booking flow', error.message);
    reporter.logStep('Complete booking flow', 'FAIL', error.message);
  }

  reporter.endTest();
}

async function testUserAuthFlow(page, reporter) {
  reporter.startTest('User Authentication Flow');

  try {
    // Test Sign Up
    reporter.logStep('Navigate to sign up', 'RUNNING');
    await page.goto(`${BASE_URL}/auth/sign-up`);
    await page.waitForLoadState('networkidle');
    await reporter.takeScreenshot(page, 'Sign up page');

    // Check if sign up form exists
    const signupForm = await page.locator('form, input[type="email"]').first();
    if (await signupForm.isVisible()) {
      reporter.logStep('Sign up page loads', 'PASS');
    } else {
      reporter.logIssue('High', 'Sign up form not found', page.url(), 'Sign up form visible', 'Form not found');
      reporter.logStep('Sign up page loads', 'FAIL');
    }

    // Test Login page
    reporter.logStep('Navigate to login', 'RUNNING');
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState('networkidle');
    await reporter.takeScreenshot(page, 'Login page');

    const loginForm = await page.locator('form, input[type="email"]').first();
    if (await loginForm.isVisible()) {
      reporter.logStep('Login page loads', 'PASS');
    } else {
      reporter.logIssue('High', 'Login form not found', page.url(), 'Login form visible', 'Form not found');
      reporter.logStep('Login page loads', 'FAIL');
    }

    // Test Magic Link option
    try {
      const magicLinkButton = await page.locator('button:has-text("Magic"), button:has-text("Link")').first();
      if (await magicLinkButton.isVisible()) {
        reporter.logStep('Magic link option available', 'PASS');
      } else {
        reporter.logStep('Magic link option available', 'FAIL', 'Magic link button not found');
      }
    } catch (error) {
      reporter.logStep('Magic link option available', 'FAIL', error.message);
    }

    // Test Admin Login
    reporter.logStep('Test admin login page', 'RUNNING');
    await page.goto(`${BASE_URL}/auth/admin-login`);
    await page.waitForLoadState('networkidle');
    await reporter.takeScreenshot(page, 'Admin login page');

    const adminLogin = await page.locator('form, input[type="email"]').first();
    if (await adminLogin.isVisible()) {
      reporter.logStep('Admin login page loads', 'PASS');
    } else {
      reporter.logIssue('Medium', 'Admin login page not found', page.url(), 'Admin login form visible', 'Form not found');
      reporter.logStep('Admin login page loads', 'FAIL');
    }

  } catch (error) {
    reporter.logIssue('High', 'Auth flow crashed', page.url(), 'Successful auth flow', error.message);
    reporter.logStep('Complete auth flow', 'FAIL', error.message);
  }

  reporter.endTest();
}

async function testDashboardAccess(page, reporter) {
  reporter.startTest('Dashboard Access Test');

  try {
    // Test Customer Dashboard
    reporter.logStep('Access customer dashboard', 'RUNNING');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await reporter.takeScreenshot(page, 'Dashboard page');

    // Check if redirected to login (expected for unauthenticated user)
    if (page.url().includes('/auth/')) {
      reporter.logStep('Dashboard redirects to auth (expected)', 'PASS');
    } else {
      reporter.logStep('Dashboard protection check', 'FAIL', 'Should redirect unauthenticated users');
    }

    // Test Admin Dashboard
    reporter.logStep('Access admin dashboard', 'RUNNING');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await reporter.takeScreenshot(page, 'Admin dashboard attempt');

    if (page.url().includes('/auth/')) {
      reporter.logStep('Admin dashboard redirects to auth (expected)', 'PASS');
    } else {
      reporter.logStep('Admin dashboard protection check', 'FAIL', 'Should redirect unauthenticated users');
    }

  } catch (error) {
    reporter.logIssue('Medium', 'Dashboard access test failed', page.url(), 'Proper redirects', error.message);
    reporter.logStep('Dashboard access test', 'FAIL', error.message);
  }

  reporter.endTest();
}

async function testPageNavigation(page, reporter) {
  reporter.startTest('Page Navigation Test');

  const pagesToTest = [
    { url: '/', name: 'Homepage' },
    { url: '/book', name: 'Booking page' },
    { url: '/auth/sign-in', name: 'Sign in page' },
    { url: '/auth/sign-up', name: 'Sign up page' },
    { url: '/dashboard', name: 'Dashboard' },
    { url: '/admin', name: 'Admin' }
  ];

  for (const testPage of pagesToTest) {
    try {
      reporter.logStep(`Navigate to ${testPage.name}`, 'RUNNING');
      await page.goto(`${BASE_URL}${testPage.url}`);
      await page.waitForLoadState('networkidle');
      
      // Check for common error indicators
      const pageText = await page.textContent('body');
      if (pageText.toLowerCase().includes('error') || pageText.toLowerCase().includes('not found')) {
        reporter.logIssue('High', `${testPage.name} shows error`, page.url(), 'Valid page content', 'Error or not found message');
        reporter.logStep(`${testPage.name} loads correctly`, 'FAIL', 'Page shows error');
      } else {
        reporter.logStep(`${testPage.name} loads correctly`, 'PASS');
      }

      await reporter.takeScreenshot(page, `${testPage.name} loaded`);

    } catch (error) {
      reporter.logIssue('High', `Failed to load ${testPage.name}`, `${BASE_URL}${testPage.url}`, 'Page loads successfully', error.message);
      reporter.logStep(`${testPage.name} loads correctly`, 'FAIL', error.message);
    }
  }

  reporter.endTest();
}

async function testResponsiveDesign(page, reporter) {
  reporter.startTest('Responsive Design Test');

  const viewports = [
    { width: 375, height: 667, name: 'Mobile (iPhone)' },
    { width: 768, height: 1024, name: 'Tablet (iPad)' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];

  for (const viewport of viewports) {
    try {
      reporter.logStep(`Test ${viewport.name} viewport`, 'RUNNING');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      await reporter.takeScreenshot(page, `${viewport.name} view`);
      
      // Check if content is visible and not overlapping
      const isContentVisible = await page.isVisible('body');
      if (isContentVisible) {
        reporter.logStep(`${viewport.name} renders correctly`, 'PASS');
      } else {
        reporter.logIssue('Medium', `${viewport.name} rendering issue`, BASE_URL, 'Content visible', 'Content not visible');
        reporter.logStep(`${viewport.name} renders correctly`, 'FAIL');
      }

    } catch (error) {
      reporter.logIssue('Medium', `${viewport.name} test failed`, BASE_URL, 'Responsive design works', error.message);
      reporter.logStep(`${viewport.name} test`, 'FAIL', error.message);
    }
  }

  reporter.endTest();
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive browser testing...');
  console.log(`📱 Testing URL: ${BASE_URL}`);
  
  const browser = await chromium.launch({ headless: false }); // Set to false to see the browser
  const page = await browser.newPage();
  const reporter = new TestReporter();

  // Set a longer timeout for slow networks
  page.setDefaultTimeout(30000);

  try {
    // Run all test suites
    await testPageNavigation(page, reporter);
    await testAnonymousBookingFlow(page, reporter);
    await testUserAuthFlow(page, reporter);
    await testDashboardAccess(page, reporter);
    await testResponsiveDesign(page, reporter);

    // Generate final report
    const reportPath = reporter.generateReport();
    console.log('\n✅ Testing completed!');
    console.log(`📋 Full report available at: ${reportPath}`);
    
    // Summary
    const totalTests = reporter.results.length;
    const passedTests = reporter.results.filter(t => t.issues.length === 0).length;
    const totalIssues = reporter.results.reduce((sum, t) => sum + t.issues.length, 0);
    
    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Total Issues: ${totalIssues}`);

  } catch (error) {
    console.error('💥 Testing failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, TestReporter };