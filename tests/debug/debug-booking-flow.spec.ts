import { test, expect } from '@playwright/test';

test.describe('Debug Booking Flow', () => {
  test('should debug the step-by-step booking flow', async ({ page }) => {
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    
    console.log('=== STEP 1: Service Selection ===');
    
    // Wait for service selection to load
    await expect(page.locator('h2:has-text("Choose Your Service")')).toBeVisible();
    console.log('Service selection step is visible');
    
    // Check if next button is disabled initially
    const nextButton = page.locator('button:has-text("Next: Vehicle Details")');
    const isInitiallyDisabled = await nextButton.isDisabled();
    console.log('Next button initially disabled:', isInitiallyDisabled);
    
    // Click service card
    const serviceCard = page.locator('.cursor-pointer:has-text("Full Valet & Detail")').first();
    await expect(serviceCard).toBeVisible();
    console.log('Service card is visible');
    
    await serviceCard.click();
    console.log('Service card clicked');
    
    // Check if next button is enabled after selection
    await page.waitForTimeout(1000); // Give time for state update
    const isEnabledAfterSelection = await nextButton.isDisabled();
    console.log('Next button disabled after service selection:', isEnabledAfterSelection);
    
    if (!isEnabledAfterSelection) {
      // Click next button
      await nextButton.click();
      console.log('Next button clicked');
      
      console.log('\n=== STEP 2: Vehicle Details ===');
      
      // Wait for vehicle details step
      await page.waitForTimeout(2000);
      
      // Check what's on the page now
      const currentStepHeading = await page.locator('h2, h3').all();
      for (let i = 0; i < currentStepHeading.length; i++) {
        const text = await currentStepHeading[i].textContent();
        console.log(`Heading ${i + 1}: "${text}"`);
      }
      
      // Check for vehicle form inputs
      const registrationInput = await page.locator('input[name="registration"]').isVisible();
      console.log('Registration input visible:', registrationInput);
      
      const makeInput = await page.locator('input[name="make"]').isVisible();
      console.log('Make input visible:', makeInput);
      
      // Check current URL
      console.log('Current URL:', page.url());
      
      // Check what buttons are available
      const availableButtons = await page.locator('button').all();
      console.log('\nAvailable buttons:');
      for (let i = 0; i < availableButtons.length; i++) {
        const text = await availableButtons[i].textContent();
        const disabled = await availableButtons[i].isDisabled();
        console.log(`  ${i + 1}. "${text}" (disabled: ${disabled})`);
      }
    } else {
      console.log('Next button is still disabled after service selection');
    }
    
    expect(true).toBe(true);
  });
});