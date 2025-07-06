import { test, expect } from '@playwright/test';

test.describe('Debug Step Order', () => {
  test('should check the actual step order in production', async ({ page }) => {
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    
    console.log('=== STEP 1: Service Selection ===');
    const step1Heading = await page.locator('h2, h3').first().textContent();
    console.log('Step 1 heading:', step1Heading);
    
    // Click service
    const serviceCard = page.locator('.cursor-pointer:has-text("Full Valet & Detail")').first();
    await serviceCard.click();
    await page.click('button:has-text("Next: Vehicle Details")');
    
    console.log('\n=== STEP 2: Vehicle Details ===');
    await page.waitForTimeout(1000);
    const step2Heading = await page.locator('h2, h3').first().textContent();
    console.log('Step 2 heading:', step2Heading);
    
    // Select vehicle details quickly
    await page.click('button:has-text("Medium"):has-text("BMW 3 Series")');
    
    // Check what the next button says
    const nextButtons = await page.locator('button:has-text("Next")').all();
    for (let i = 0; i < nextButtons.length; i++) {
      const text = await nextButtons[i].textContent();
      console.log(`Next button ${i + 1}: "${text}"`);
    }
    
    await page.click('button:has-text("Next: Personal Details")');
    
    console.log('\n=== STEP 3: Personal Details ===');
    await page.waitForTimeout(1000);
    const step3Heading = await page.locator('h2, h3').first().textContent();
    console.log('Step 3 heading:', step3Heading);
    
    // Check what the next button says now
    const nextButtons2 = await page.locator('button:has-text("Next")').all();
    for (let i = 0; i < nextButtons2.length; i++) {
      const text = await nextButtons2[i].textContent();
      console.log(`Next button ${i + 1}: "${text}"`);
    }
    
    // Fill minimal personal details
    const nameInput = await page.locator('input[name="name"], input[name="firstName"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
    }
    
    const emailInput = await page.locator('input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
    }
    
    const phoneInput = await page.locator('input[name="phone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('07123456789');
    }
    
    // Try to go to next step
    const nextPersonalButton = page.locator('button:has-text("Next")').first();
    if (await nextPersonalButton.isVisible() && !(await nextPersonalButton.isDisabled())) {
      await nextPersonalButton.click();
      
      console.log('\n=== STEP 4: Next Step ===');
      await page.waitForTimeout(1000);
      const step4Heading = await page.locator('h2, h3').first().textContent();
      console.log('Step 4 heading:', step4Heading);
    }
    
    expect(true).toBe(true);
  });
});