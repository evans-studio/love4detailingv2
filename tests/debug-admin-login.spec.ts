import { test, expect } from '@playwright/test';

test.describe('Debug Admin Login', () => {
  test('should debug where admin login redirects', async ({ page }) => {
    console.log('🔍 Starting admin login debug...');
    
    // Go to sign-in page
    await page.goto('/auth/sign-in');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL after going to sign-in:', page.url());
    
    // Fill admin credentials
    const adminEmail = 'zell@love4detailing.com';
    const adminPassword = 'Love4Detailing2025!';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    
    console.log('✅ Filled admin credentials');
    
    // Click submit and wait for any navigation
    console.log('🔄 Clicking submit button...');
    
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/auth/') || 
      response.url().includes('/api/') ||
      response.url().includes('/admin') ||
      response.url().includes('/dashboard'),
      { timeout: 30000 }
    );
    
    await page.click('button[type="submit"]');
    
    // Wait for some response
    try {
      const response = await responsePromise;
      console.log('📡 Got response:', response.url(), 'Status:', response.status());
    } catch (e) {
      console.log('⚠️ No relevant response captured');
    }
    
    // Wait a bit for any redirects
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('📍 Final URL after login attempt:', finalUrl);
    
    // Check what's actually on the page
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    const h1Text = await page.locator('h1').first().textContent().catch(() => 'No h1 found');
    const h2Text = await page.locator('h2').first().textContent().catch(() => 'No h2 found');
    
    console.log('📝 H1 text:', h1Text);
    console.log('📝 H2 text:', h2Text);
    
    // Check for any error messages
    const errorMessages = await page.locator('.error-message, .text-red-500, [class*="error"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:', errorMessages);
    }
    
    // Check if we're on any known page
    if (finalUrl.includes('/admin')) {
      console.log('✅ Successfully reached admin area');
    } else if (finalUrl.includes('/dashboard')) {
      console.log('⚠️ Redirected to regular dashboard instead of admin');
    } else if (finalUrl.includes('/auth/verify-email')) {
      console.log('⚠️ Redirected to email verification');
    } else if (finalUrl.includes('/auth/sign-in')) {
      console.log('❌ Still on sign-in page - login may have failed');
    } else {
      console.log('❓ Unknown redirect destination');
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'temp_docs/debug-admin-login.png', fullPage: true });
    console.log('📸 Screenshot saved to temp_docs/debug-admin-login.png');
    
    // For the test to pass, we just need to complete the debug process
    expect(true).toBe(true);
  });
});