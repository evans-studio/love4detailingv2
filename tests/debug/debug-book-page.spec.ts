import { test, expect } from '@playwright/test';

test.describe('Debug Booking Page', () => {
  test('should debug what elements are available on /book page', async ({ page }) => {
    // Navigate to booking page
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    
    // Log current URL
    console.log('Current URL:', page.url());
    
    // Check page title and main heading
    const title = await page.title();
    console.log('Page title:', title);
    
    const h1 = await page.locator('h1').first().textContent();
    console.log('Main heading:', h1);
    
    // Check for service selection heading
    const serviceHeading = await page.locator('h2').all();
    console.log('H2 headings count:', serviceHeading.length);
    
    for (let i = 0; i < serviceHeading.length; i++) {
      const text = await serviceHeading[i].textContent();
      console.log(`H2 ${i + 1}:`, text);
    }
    
    // Check for service cards by different selectors
    const serviceCardsByTestId = await page.locator('[data-testid*="service"]').count();
    console.log('Service cards by data-testid:', serviceCardsByTestId);
    
    const cardsByClass = await page.locator('.service-card').count();
    console.log('Service cards by class:', cardsByClass);
    
    // Check for "Full Valet" text anywhere
    const fullValetElements = await page.locator('text=Full Valet').count();
    console.log('Elements containing "Full Valet":', fullValetElements);
    
    // Check for any buttons
    const buttons = await page.locator('button').all();
    console.log('Total buttons found:', buttons.length);
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const text = await buttons[i].textContent();
      const disabled = await buttons[i].isDisabled();
      console.log(`Button ${i + 1}: "${text}" (disabled: ${disabled})`);
    }
    
    // Check if we were redirected
    if (!page.url().includes('/book')) {
      console.log('WARNING: Page was redirected from /book to:', page.url());
    }
    
    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'debug-book-page.png', fullPage: true });
    console.log('Screenshot saved as debug-book-page.png');
    
    // Check for any error or loading states
    const errorMessages = await page.locator('[role="alert"], .error-message').count();
    console.log('Error messages found:', errorMessages);
    
    const loadingStates = await page.locator('text=Loading').count();
    console.log('Loading states found:', loadingStates);
    
    // Always pass so we get the debug info
    expect(true).toBe(true);
  });
});