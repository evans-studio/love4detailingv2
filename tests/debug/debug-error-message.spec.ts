import { test, expect } from '@playwright/test';

test.describe('Debug Error Messages', () => {
  test('should check what error message is showing on /book page', async ({ page }) => {
    // Navigate to booking page
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    
    // Check for error messages
    const errorElements = await page.locator('[role="alert"], .error-message').all();
    console.log('Found', errorElements.length, 'error elements');
    
    for (let i = 0; i < errorElements.length; i++) {
      const text = await errorElements[i].textContent();
      const isVisible = await errorElements[i].isVisible();
      console.log(`Error ${i + 1}: "${text}" (visible: ${isVisible})`);
    }
    
    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Check network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('Network error:', response.url(), response.status(), response.statusText());
      }
    });
    
    // Wait a bit to capture any async errors
    await page.waitForTimeout(3000);
    
    // Check if the service selection component is actually rendered
    const serviceSelectionDiv = await page.locator('div:has-text("Choose Your Service")').first();
    const serviceSelectionVisible = await serviceSelectionDiv.isVisible();
    console.log('Service selection component visible:', serviceSelectionVisible);
    
    // Check if there are any elements with "service" in their class or data attributes
    const serviceElements = await page.locator('[class*="service"], [data-*="service"]').all();
    console.log('Elements with "service" in attributes:', serviceElements.length);
    
    for (let i = 0; i < serviceElements.length; i++) {
      const element = serviceElements[i];
      const className = await element.getAttribute('class');
      const testId = await element.getAttribute('data-testid');
      console.log(`Service element ${i + 1}: class="${className}" testid="${testId}"`);
    }
    
    expect(true).toBe(true);
  });
});