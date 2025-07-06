# Love 4 Detailing - End-to-End Testing Guide

## Overview

This document outlines the comprehensive end-to-end (E2E) testing approach for the Love 4 Detailing application using Playwright. It covers customer journeys, admin functionality, edge cases, mobile responsiveness, performance, and accessibility testing.

## Test Suite Structure

The test suite is organized into the following major sections:

1. **Customer Journey Tests** - Tests focusing on end-user experiences
2. **Admin Journey Tests** - Tests for administrative capabilities
3. **Edge Cases and Error Handling** - Tests for validation and error states
4. **Combined Workflows** - Tests that simulate complete user journeys
5. **Mobile Viewport Tests** - Tests for responsive design
6. **Performance Tests** - Tests for page load times
7. **Accessibility Tests** - Tests for web accessibility standards

## Setup Requirements

```bash
# Install dependencies
npm install @playwright/test @faker-js/faker

# Install browser drivers
npx playwright install
```

## Configuration

The test suite uses the following configuration:

```typescript
// Configuration
const BASE_URL = 'https://love4detailingv2.vercel.app';
const ADMIN_EMAIL = 'zell@love4detailing.com';  // Replace with actual admin credentials
const ADMIN_PASSWORD = 'your-admin-password';  // Replace with actual admin password
```

## Customer Journey Test Cases

### 1. First-time Visitor Experience
- Navigate through main pages (Home, Services, Pricing, Contact)
- Verify navigation links and content
- Test primary CTA ("Book Now") functionality

### 2. Anonymous Booking Flow
- Complete full booking process without an account
- Enter vehicle details
- Provide personal information
- Select date and time
- Review and confirm booking
- Verify booking confirmation

### 3. New User Registration
- Register with valid credentials
- Verify redirection to dashboard
- Check user profile initialization

### 4. User Login and Dashboard Exploration
- Login with valid credentials
- Navigate through dashboard sections
- Verify sidebar navigation
- Check each dashboard page loads correctly

### 5. Vehicle Management
- Add new vehicles with valid information
- View saved vehicles
- Delete vehicles
- Edit vehicle details (if applicable)

### 6. Registered User Booking Flow
- Login and initiate booking
- Select from saved vehicles
- Choose available time slot
- Complete booking process
- Verify booking appears in history

### 7. Booking Management
- View booking details
- Check status updates
- Cancel booking (if applicable)
- Verify booking history updates

### 8. Rebooking Flow
- Navigate from existing booking to create new booking
- Verify vehicle information is pre-populated
- Complete rebooking process
- Verify both bookings in history

### 9. Rewards System
- Check points accumulation after booking
- Verify rewards transaction history
- Test points balance updates
- Check reward tier status (if applicable)

### 10. Profile Management
- Update personal information
- Change contact details
- Verify changes persist after reload
- Test validation on form fields

## Admin Journey Test Cases

### 1. Admin Authentication
- Login with admin credentials
- Verify access to admin dashboard
- Test authorization boundaries

### 2. Booking Management
- View all customer bookings
- Filter and search functionality
- Booking detail inspection
- Status updates and management

### 3. Time Slot Management
- View availability calendar
- Block/unblock time slots
- Modify operating hours (if applicable)
- Manage special day settings

### 4. User Management
- View customer accounts
- Search and filter users
- View user details and history
- Manage user access (if applicable)

### 5. Vehicle Database Access
- View all registered vehicles
- Filter by make/model/size
- View vehicle history

### 6. Reports and Analytics
- Generate booking reports
- View revenue metrics (if applicable)
- Export data functionality (if applicable)
- Filter reports by date range

## Edge Cases and Error Handling

### 1. Authentication Edge Cases
- Invalid login credentials
- Account lockout (if applicable)
- Password reset flow
- Email verification process

### 2. Registration Edge Cases
- Duplicate email registration attempt
- Invalid format validation
- Password strength requirements
- Incomplete registration handling

### 3. Booking Edge Cases
- Booking with full time slots
- Overlapping bookings
- Last-minute booking restrictions
- Past date selection handling

### 4. Vehicle Management Edge Cases
- Invalid registration formats
- Duplicate vehicle registration
- Unsupported vehicle types
- Incorrect data validation

### 5. Session Management
- Session timeout handling
- Concurrent session management
- Remember me functionality
- Secure session storage

## Mobile Viewport Tests

Tests are conducted using iPhone SE dimensions (375x667px) to verify:

- Mobile navigation menu functionality
- Responsive form layouts
- Touch-friendly controls
- Mobile booking experience
- Dashboard mobile experience

## Performance Tests

- Home page load time (target: <5000ms)
- Dashboard load performance
- Booking form submission performance
- Admin panel load times

## Accessibility Tests

- Image alt text verification
- Heading hierarchy correctness
- Form label associations
- ARIA attribute usage
- Color contrast compliance
- Keyboard navigation support

## Test Data Strategy

The test suite uses Faker.js to generate random, realistic test data:

```typescript
// Example test data generators
function generateUser() {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password() + 'Aa1!',
    phone: faker.phone.number('+44 7### ######'),
  };
}

function generateVehicle() {
  return {
    registration: `${faker.string.alpha(2).toUpperCase()}${faker.number.int({ min: 10, max: 99 })}${faker.string.alpha(3).toUpperCase()}`,
    make: faker.helpers.arrayElement(['BMW', 'Audi', 'Mercedes', 'Ford', 'Toyota', 'Honda', 'Volkswagen']),
    model: faker.vehicle.model(),
    year: faker.date.past({ years: 10 }).getFullYear().toString(),
    color: faker.color.human(),
  };
}
```

## Common Test Functions

Reusable functions to improve test maintainability:

```typescript
// Login helper function
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/auth/sign-in`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

// Admin login helper
async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.waitForURL(`${BASE_URL}/admin`);
}
```

## Running the Tests

```bash
# Run all tests
npx playwright test

# Run specific test group
npx playwright test --grep "Customer Journey"
npx playwright test --grep "Admin Journey"
npx playwright test --grep "Edge Cases"

# Run tests and generate HTML report
npx playwright test --reporter=html

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Documenting Test Results

**IMPORTANT**: All test findings, issues, and observations MUST be documented in a results file located in the `temp_docs` directory.

### Results Documentation Process

1. Create a results file at `temp_docs/test-results-[DATE].md` (e.g., `temp_docs/test-results-2025-07-06.md`)

2. Document the following for each test run:
   - Date and time of test execution
   - Test environment details (browser, viewport size)
   - Summary of passing tests
   - Detailed description of any failures
   - Screenshots of issues (stored in `temp_docs/test-screenshots/`)
   - Recommended fixes for each issue

3. Use the following format for documenting issues:

```markdown
## Issue #[NUMBER]: [SHORT DESCRIPTION]

**Test Case:** [Test case name]
**Severity:** [Critical/High/Medium/Low]
**Browser:** [Chrome/Firefox/Safari]
**URL:** [Affected page URL]

### Description
[Detailed description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots
![Screenshot description](../test-screenshots/issue-[NUMBER].png)

### Recommended Fix
[Suggestion for fixing the issue]
```

4. Include a summary section at the top with counts of:
   - Total tests run
   - Tests passed
   - Tests failed
   - Critical issues
   - High-priority issues
   - Medium-priority issues
   - Low-priority issues

5. After completing all fixes, run the tests again and update the results document with verification status.

## Implementation Notes

1. **Selectors**: The test suite uses a combination of:
   - Text selectors: `text=Book Now`
   - CSS selectors: `.booking-card`
   - Role selectors: `role=button`
   - Test attributes (recommended): `data-testid="booking-form"`

2. **Waits and Timing**:
   - Use explicit waits where possible: `await page.waitForSelector()`
   - Avoid arbitrary timeouts: `await page.waitForTimeout()`
   - Wait for network idle on critical operations

3. **Assertions**:
   - Use Playwright's expect library for readable assertions
   - Verify visible elements, text content, and URLs
   - Check for success/error messages

4. **Error Handling**:
   - Tests should fail with clear error messages
   - Use try/catch blocks for expected errors
   - Log details for debugging

## Selector Customization

⚠️ **Important**: Before running the tests, review and update the following selectors based on your actual implementation:

1. **Authentication Selectors**:
   - Login form: `input[type="email"]`, `input[type="password"]`
   - Registration form: `input[name="name"]`, `input[name="email"]`
   - User menu: `.user-menu-button`, `.user-profile`

2. **Booking Flow Selectors**:
   - Vehicle form: `input[name="registration"]`, `input[name="make"]`
   - Calendar: `button.react-calendar__tile`
   - Time slots: `.time-slot-button`
   - Booking summary: `.booking-summary`

3. **Dashboard Selectors**:
   - Navigation: `text=My Bookings`, `text=My Vehicles`
   - Vehicle cards: `.vehicle-card`
   - Booking cards: `.booking-card`
   - Rewards: `.rewards-section`, `.points-balance`

4. **Admin Selectors**:
   - Tables: `.bookings-table`, `.users-table`
   - Filters: `select[name="status"]`, `input[name="search"]`
   - Detail panels: `.booking-details`, `.user-details`

5. **Mobile Selectors**:
   - Mobile menu: `.mobile-menu-button`
   - Mobile sidebar: `.mobile-sidebar-button`

## Playwright Best Practices

1. Use page objects or component abstractions for complex UI elements
2. Implement test hooks for common setup/teardown operations
3. Structure tests by user flow rather than by UI component
4. Separate test data from test logic
5. Use test.describe() and test.beforeEach() for grouping related tests
6. Leverage Playwright's auto-waiting mechanisms
7. Avoid flaky selectors; prefer data attributes for testing
8. Implement visual regression tests for critical UI components

## Test Maintenance

1. Review and update tests when the UI changes
2. Maintain a balance between coverage and maintenance cost
3. Use CI/CD pipeline to run tests automatically
4. Review test failures regularly and address root causes
5. Consider implementing screenshot capture on test failures
6. Keep the test results documentation up-to-date in the temp_docs directory

## Automated Results Collection

To automatically generate a basic test results template, add the following to your Playwright configuration:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  // ... other config options
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
    // Custom reporter to generate results markdown
    ['playwright-custom-reporter', {
      outputFile: path.join('temp_docs', `test-results-${new Date().toISOString().split('T')[0]}.md`),
      template: `# Love 4 Detailing Test Results - {date}

## Summary
- Total tests: {totalTests}
- Passed: {passedTests}
- Failed: {failedTests}
- Skipped: {skippedTests}

## Failed Tests
{failedTestsDetails}

## Next Steps
1. Review and fix all failed tests
2. Prioritize Critical and High severity issues
3. Rerun tests to verify fixes
4. Update this document with resolution status
`
    }]
  ],
});
```

---

*Last updated: July 6, 2025*