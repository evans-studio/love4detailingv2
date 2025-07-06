import { test, expect } from '@playwright/test';

test.describe('Debug Network Requests', () => {
  test('should check network requests and service loading on /book page', async ({ page }) => {
    const responses: any[] = [];
    const requests: any[] = [];
    
    // Capture all network activity
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    });
    
    // Navigate to booking page
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    
    // Give some time for all async operations
    await page.waitForTimeout(5000);
    
    console.log('\n=== NETWORK REQUESTS ===');
    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    console.log('API requests made:', apiRequests.length);
    
    apiRequests.forEach(req => {
      console.log(`${req.method} ${req.url}`);
    });
    
    console.log('\n=== NETWORK RESPONSES ===');
    const apiResponses = responses.filter(r => r.url.includes('/api/'));
    console.log('API responses received:', apiResponses.length);
    
    apiResponses.forEach(res => {
      console.log(`${res.status} ${res.statusText} - ${res.url}`);
    });
    
    // Check specifically for vehicle-sizes API
    const vehicleSizesRequests = requests.filter(r => r.url.includes('/api/vehicle-sizes'));
    const vehicleSizesResponses = responses.filter(r => r.url.includes('/api/vehicle-sizes'));
    
    console.log('\n=== VEHICLE SIZES API ===');
    console.log('Vehicle sizes requests:', vehicleSizesRequests.length);
    console.log('Vehicle sizes responses:', vehicleSizesResponses.length);
    
    if (vehicleSizesResponses.length > 0) {
      vehicleSizesResponses.forEach(res => {
        console.log(`Vehicle sizes API: ${res.status} ${res.statusText}`);
      });
    }
    
    // Check JavaScript errors
    const jsErrors: string[] = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    if (jsErrors.length > 0) {
      console.log('\n=== JAVASCRIPT ERRORS ===');
      jsErrors.forEach(error => console.log('JS Error:', error));
    }
    
    // Check if the form is in loading state
    const loadingText = await page.locator('text=Loading').count();
    console.log('\n=== FORM STATE ===');
    console.log('Loading indicators found:', loadingText);
    
    // Check the actual form structure
    const formElement = await page.locator('form').first();
    const formVisible = await formElement.isVisible();
    console.log('Form element visible:', formVisible);
    
    if (formVisible) {
      const formHTML = await formElement.innerHTML();
      console.log('Form content preview (first 200 chars):', formHTML.substring(0, 200));
    }
    
    expect(true).toBe(true);
  });
});