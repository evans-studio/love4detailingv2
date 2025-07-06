import { test, expect } from '@playwright/test';

test.describe('Debug Services Data', () => {
  test('should check if services are being loaded and rendered', async ({ page }) => {
    // Navigate to booking page
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check if services are rendered by looking for any card-like elements
    const cardElements = await page.locator('div[class*="Card"], div[class*="card"]').all();
    console.log('Card-like elements found:', cardElements.length);
    
    // Check for elements with service-related text patterns
    const serviceTextElements = await page.locator('text=/Full Valet|Detail|Interior|Exterior/').all();
    console.log('Service-related text elements:', serviceTextElements.length);
    
    for (let i = 0; i < serviceTextElements.length; i++) {
      const text = await serviceTextElements[i].textContent();
      console.log(`Service text ${i + 1}: "${text}"`);
    }
    
    // Check for pricing elements
    const priceElements = await page.locator('text=/£\\d+/').all();
    console.log('Price elements found:', priceElements.length);
    
    for (let i = 0; i < priceElements.length; i++) {
      const text = await priceElements[i].textContent();
      console.log(`Price ${i + 1}: "${text}"`);
    }
    
    // Check for "features" or feature-like content
    const featureElements = await page.locator('text=/wash|clean|vacuum|shine/i').all();
    console.log('Feature-related elements:', featureElements.length);
    
    // Look for any clickable service-related elements
    const clickableElements = await page.locator('button, [role="button"], [onclick], .cursor-pointer').all();
    console.log('Clickable elements found:', clickableElements.length);
    
    for (let i = 0; i < Math.min(clickableElements.length, 10); i++) {
      const text = await clickableElements[i].textContent();
      const className = await clickableElements[i].getAttribute('class');
      console.log(`Clickable ${i + 1}: "${text}" (class: ${className})`);
    }
    
    // Check the actual DOM structure around the service selection
    const serviceSection = await page.locator('h2:has-text("Choose Your Service")').locator('..').innerHTML();
    console.log('\n=== SERVICE SECTION HTML (first 500 chars) ===');
    console.log(serviceSection.substring(0, 500));
    
    // Check if there are any Grid layouts that might contain services
    const gridElements = await page.locator('div[class*="grid"]').all();
    console.log('\nGrid elements found:', gridElements.length);
    
    for (let i = 0; i < gridElements.length; i++) {
      const gridClass = await gridElements[i].getAttribute('class');
      const childCount = await gridElements[i].locator('>*').count();
      console.log(`Grid ${i + 1}: class="${gridClass}" children=${childCount}`);
    }
    
    expect(true).toBe(true);
  });
});