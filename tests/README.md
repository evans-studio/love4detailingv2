# Love 4 Detailing E2E Test Suite

This directory contains the comprehensive end-to-end test suite for the Love 4 Detailing application using Playwright.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run tests with visible browser
npm run test:e2e:headed

# Run specific test suites
npm run test:e2e:customer
npm run test:e2e:admin
npm run test:e2e:mobile
npm run test:e2e:performance

# View test report
npm run test:e2e:report

# Debug failing tests
npm run test:e2e:debug
```

## Test Structure

```
tests/
├── customer-journey/     # Customer-facing functionality tests
├── admin-journey/        # Admin dashboard and management tests
├── edge-cases/          # Error handling and validation tests
├── mobile/              # Mobile-specific tests
├── performance/         # Performance and load time tests
├── accessibility/       # Web accessibility compliance tests
└── helpers/             # Shared utilities and test data
```

## Test Coverage

### Customer Journey (8 test files)
- ✅ First-time visitor experience
- ✅ Anonymous booking flow
- ✅ User registration
- ✅ Login and dashboard exploration
- ✅ Vehicle management
- ✅ Registered user booking flow
- ✅ Booking management
- ✅ Rewards system

### Admin Journey (3 test files)
- ✅ Admin authentication
- ✅ Booking management
- ✅ User management
- 🔄 Time slot management (TODO)
- 🔄 Vehicle database access (TODO)
- 🔄 Reports and analytics (TODO)

### Edge Cases (1 test file)
- ✅ Authentication edge cases
- 🔄 Registration edge cases (TODO)
- 🔄 Booking validation (TODO)
- 🔄 Session management (TODO)

### Mobile Tests (1 test file)
- ✅ Mobile navigation
- 🔄 Mobile booking flow (TODO)
- 🔄 Touch interactions (TODO)

### Performance Tests (1 test file)
- ✅ Page load times
- ✅ Core Web Vitals
- ✅ Bundle size impact

## Configuration

The test suite is configured to run against:
- **Production URL**: https://love4detailingv2.vercel.app
- **Local Development**: http://localhost:3000 (when dev server is running)

Tests are executed across multiple browsers:
- Chromium (Chrome)
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari
- iPhone SE viewport

## Test Data

Tests use Faker.js to generate realistic test data:
- User accounts with valid UK details
- Vehicle registrations in UK format
- Realistic booking scenarios
- Valid contact information

## Results Documentation

All test results must be documented in `temp_docs/test-results-[DATE].md` following the template provided. Include:
- Test execution summary
- Detailed issue reports with screenshots
- Performance metrics
- Recommendations for fixes

## Environment Setup

Before running tests, ensure:

1. **Admin Credentials**: Set `ADMIN_PASSWORD` environment variable
2. **Database**: Application has test data and is accessible
3. **Email Service**: Configured for testing notifications
4. **Services**: All external services are available

## Writing New Tests

Follow these patterns when adding tests:

```typescript
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser, generateVehicle } from '../helpers/test-data';

test.describe('Test Suite Name', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should do something specific', async ({ page }) => {
    // Arrange
    const testData = generateUser();
    
    // Act
    await helpers.login(testData.email, testData.password);
    
    // Assert
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
```

## Best Practices

1. **Use Helper Functions**: Leverage `TestHelpers` class for common operations
2. **Generate Test Data**: Use Faker.js generators instead of hardcoded data
3. **Wait Properly**: Use `waitForURL`, `waitForSelector` instead of arbitrary timeouts
4. **Clean Assertions**: Use descriptive expect statements
5. **Document Issues**: Create detailed issue reports with screenshots
6. **Maintain Tests**: Update selectors when UI changes

## Selectors Strategy

The test suite uses a hierarchy of selector strategies:
1. **Test Attributes**: `data-testid="element"` (preferred)
2. **Semantic Selectors**: `role=button`, `text=Submit`
3. **CSS Selectors**: `.class-name`, `#id`
4. **XPath**: Only as last resort

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm install
    npx playwright install
    npm run test:e2e
    
- name: Upload Test Results
  uses: actions/upload-artifact@v2
  if: always()
  with:
    name: test-results
    path: test-results/
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in `playwright.config.ts`
2. **Flaky Tests**: Add proper waits, avoid `waitForTimeout`
3. **Selector Issues**: Use browser dev tools to verify selectors
4. **Auth Issues**: Check admin credentials and session handling

### Debug Mode

```bash
# Run specific test in debug mode
npx playwright test tests/customer-journey/01-first-time-visitor.spec.ts --debug

# Run with browser visible
npx playwright test --headed --workers=1
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots on failure
- Video recordings
- Network logs
- Console errors

Find these in `test-results/` directory.

## Performance Targets

- **Home Page**: < 5000ms load time
- **Dashboard**: < 3000ms load time
- **Booking Form**: < 3000ms load time
- **Admin Panel**: < 4000ms load time
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1

## Accessibility Standards

Tests validate compliance with:
- WCAG 2.1 AA standards
- Image alt text requirements
- Proper heading hierarchy
- Form label associations
- Keyboard navigation support
- Color contrast ratios

---

For detailed test execution guidance, see `temp_docs/e2e-test.md`.
For results documentation, use `temp_docs/test-results-template.md`.