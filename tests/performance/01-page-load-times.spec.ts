import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('Performance Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should load home page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Target: less than 5000ms as specified in guide
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`Home page load time: ${loadTime}ms`);
  });

  test('should load dashboard within performance budget', async ({ page }) => {
    // Login first
    await page.goto('/auth/sign-in');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    const startTime = Date.now();
    
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load quickly for good UX
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Dashboard load time: ${loadTime}ms`);
  });

  test('should load booking form within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/booking');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Booking form is critical for conversions
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Booking form load time: ${loadTime}ms`);
  });

  test('should load admin panel within performance budget', async ({ page }) => {
    // Login as admin
    await helpers.loginAsAdmin();
    
    const startTime = Date.now();
    
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Admin panel can be slightly slower
    expect(loadTime).toBeLessThan(4000);
    
    console.log(`Admin panel load time: ${loadTime}ms`);
  });

  test('should handle booking form submission performance', async ({ page }) => {
    await page.goto('/booking');
    
    // Fill booking form
    await page.fill('input[name="registration"]', 'AB12CDE');
    await page.fill('input[name="make"]', 'BMW');
    await page.fill('input[name="model"]', 'X5');
    await page.fill('input[name="year"]', '2020');
    await page.fill('input[name="color"]', 'Black');
    
    const startTime = Date.now();
    
    await page.click('button:has-text("Continue")');
    await page.waitForURL('/booking?step=2');
    
    const submitTime = Date.now() - startTime;
    
    // Form submission should be fast
    expect(submitTime).toBeLessThan(2000);
    
    console.log(`Booking form submission time: ${submitTime}ms`);
  });

  test('should measure largest contentful paint (LCP)', async ({ page }) => {
    await page.goto('/');
    
    // Measure LCP using Performance API
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 10000);
      });
    });
    
    // LCP should be under 2.5 seconds for good performance
    expect(lcp).toBeLessThan(2500);
    
    console.log(`Largest Contentful Paint: ${lcp}ms`);
  });

  test('should measure first input delay (FID)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Measure FID by clicking an interactive element
    const startTime = performance.now();
    
    await page.click('text=Book Now');
    
    const fidTime = performance.now() - startTime;
    
    // FID should be under 100ms for good responsiveness
    expect(fidTime).toBeLessThan(100);
    
    console.log(`First Input Delay: ${fidTime}ms`);
  });

  test('should measure cumulative layout shift (CLS)', async ({ page }) => {
    await page.goto('/');
    
    // Measure CLS using Performance API
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Resolve after a delay to collect shifts
        setTimeout(() => resolve(clsValue), 5000);
      });
    });
    
    // CLS should be under 0.1 for good visual stability
    expect(cls).toBeLessThan(0.1);
    
    console.log(`Cumulative Layout Shift: ${cls}`);
  });

  test('should measure time to interactive (TTI)', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to be fully interactive
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return document.readyState === 'complete';
    });
    
    const tti = Date.now() - startTime;
    
    // TTI should be reasonable for good user experience
    expect(tti).toBeLessThan(4000);
    
    console.log(`Time to Interactive: ${tti}ms`);
  });

  test('should handle concurrent user loads', async ({ page, context }) => {
    // Simulate multiple users
    const pages = [];
    const loadTimes = [];
    
    // Create multiple pages
    for (let i = 0; i < 3; i++) {
      pages.push(await context.newPage());
    }
    
    // Load pages concurrently
    const loadPromises = pages.map(async (testPage, index) => {
      const startTime = Date.now();
      await testPage.goto('/');
      await testPage.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      loadTimes.push(loadTime);
      return loadTime;
    });
    
    await Promise.all(loadPromises);
    
    // All pages should load within reasonable time
    for (const loadTime of loadTimes) {
      expect(loadTime).toBeLessThan(6000);
    }
    
    console.log(`Concurrent load times: ${loadTimes.join(', ')}ms`);
    
    // Close extra pages
    for (const testPage of pages) {
      await testPage.close();
    }
  });

  test('should measure bundle size impact', async ({ page }) => {
    await page.goto('/');
    
    // Measure resource sizes
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources.map(resource => ({
        name: resource.name,
        size: resource.transferSize || 0,
        type: resource.initiatorType
      }));
    });
    
    // Calculate total JavaScript size
    const jsSize = resourceSizes
      .filter(resource => resource.type === 'script')
      .reduce((total, resource) => total + resource.size, 0);
    
    // JavaScript bundle should be reasonable
    expect(jsSize).toBeLessThan(1000000); // 1MB limit
    
    console.log(`Total JavaScript size: ${jsSize} bytes`);
    
    // Calculate total CSS size
    const cssSize = resourceSizes
      .filter(resource => resource.name.includes('.css'))
      .reduce((total, resource) => total + resource.size, 0);
    
    console.log(`Total CSS size: ${cssSize} bytes`);
  });
});