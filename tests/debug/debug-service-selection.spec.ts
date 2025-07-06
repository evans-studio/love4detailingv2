import { test, expect } from '@playwright/test';

test.describe('Debug Service Selection', () => {
  test('should debug service card availability', async ({ page }) => {
    // Navigate to booking page
    await page.goto('/book');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'temp_docs/test-screenshots/debug-booking-page.png' });
    
    // Check what's actually on the page
    const pageContent = await page.content();
    console.log('Page URL:', page.url());
    
    // Look for any service-related elements
    const serviceElements = await page.locator('[data-testid*="service"]').all();
    console.log('Service elements found:', serviceElements.length);
    
    for (let i = 0; i < serviceElements.length; i++) {
      const element = serviceElements[i];
      const testId = await element.getAttribute('data-testid');
      const text = await element.textContent();
      console.log(`Service element ${i}: data-testid="${testId}", text="${text?.slice(0, 50)}..."`);
    }
    
    // Look for any elements containing "Full Valet"
    const valetElements = await page.locator(':has-text("Full Valet")').all();
    console.log('Full Valet elements found:', valetElements.length);
    
    for (let i = 0; i < valetElements.length; i++) {
      const element = valetElements[i];
      const tagName = await element.evaluate(el => el.tagName);
      const testId = await element.getAttribute('data-testid');
      const className = await element.getAttribute('class');
      console.log(`Valet element ${i}: ${tagName}, data-testid="${testId}", class="${className}"`);
    }
    
    // Check if page has loaded content
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains "Service":', bodyText?.includes('Service'));
    console.log('Page contains "Book":', bodyText?.includes('Book'));
    console.log('Page contains "Full Valet":', bodyText?.includes('Full Valet'));
    
    // Look for any buttons on the page
    const buttons = await page.locator('button').all();
    console.log('Buttons found:', buttons.length);
    
    // Look for cards
    const cards = await page.locator('[class*="card"], [class*="Card"]').all();
    console.log('Card elements found:', cards.length);
    
    // Print first 1000 characters of page for debugging
    console.log('Page content preview:', bodyText?.slice(0, 1000));
  });

  test('should debug service configuration API', async ({ page }) => {
    // Test if services are loading from API
    await page.goto('/book');
    
    // Intercept API calls
    page.on('response', async response => {
      console.log('API Response:', response.url(), response.status());
      if (response.url().includes('service')) {
        const body = await response.text();
        console.log('Service API response:', body.slice(0, 200));
      }
    });
    
    // Wait for any async loading
    await page.waitForTimeout(3000);
    
    // Check console for any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });
});