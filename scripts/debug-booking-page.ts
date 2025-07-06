#!/usr/bin/env tsx

/**
 * Debug Booking Page
 * 
 * Simple script to debug what's actually rendered on the /book page
 */

import { chromium } from 'playwright';

async function debugBookingPage() {
  console.log('🔍 Debugging /book page...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to booking page
    console.log('📍 Navigating to /book page...');
    await page.goto('http://localhost:3000/book');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Extra wait for any async operations
    
    // Check what's on the page
    console.log('📋 Page title:', await page.title());
    console.log('📍 Current URL:', page.url());
    
    // Look for main elements
    const h1 = await page.locator('h1').first().textContent();
    console.log('📝 Main heading:', h1);
    
    // Check for service selection step
    const serviceHeading = await page.locator('h2:has-text("Choose Your Service")').isVisible();
    console.log('🎯 Service selection visible:', serviceHeading);
    
    // Check for service cards
    const serviceCards = await page.locator('[data-testid*="service-card"]').count();
    console.log('🃏 Service cards found:', serviceCards);
    
    if (serviceCards > 0) {
      const cardIds = await page.locator('[data-testid*="service-card"]').all();
      for (let i = 0; i < cardIds.length; i++) {
        const testId = await cardIds[i].getAttribute('data-testid');
        console.log(`  - Card ${i + 1}: ${testId}`);
      }
    }
    
    // Check for any service-related text
    const fullValetText = await page.locator('text=Full Valet').isVisible();
    console.log('📄 "Full Valet" text visible:', fullValetText);
    
    // Check for Next button
    const nextButton = await page.locator('button:has-text("Next")').isVisible();
    console.log('⏭️ Next button visible:', nextButton);
    
    // Check for any error messages
    const errorMessage = await page.locator('.error-message, [role="alert"]').isVisible();
    console.log('❌ Error messages visible:', errorMessage);
    
    // Check if redirected
    if (!page.url().includes('/book')) {
      console.log('⚠️ Page was redirected to:', page.url());
    }
    
    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'debug-booking-page.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-booking-page.png');
    
    // Wait for manual inspection
    console.log('\n⏸️ Page is open for manual inspection. Press any key to continue...');
    await page.waitForTimeout(10000); // 10 seconds to inspect
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  debugBookingPage().catch(console.error);
}