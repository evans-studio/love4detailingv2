import { test, expect } from '@playwright/test';

test.describe('Debug Calendar Component', () => {
  test('should investigate calendar and time slot elements', async ({ page }) => {
    // Go through booking flow to reach calendar
    await page.goto('/book');
    
    // Select service
    const serviceCard = page.locator('.cursor-pointer:has-text("Full Valet & Detail")').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    await page.click('button:has-text("Next: Vehicle Details")');
    
    // Fill vehicle details
    await page.fill('input[name="registration"]', 'AB12CDE');
    await page.selectOption('select[name="make"], [name="make"]', { label: 'BMW' });
    await page.click('button:has-text("Small"), button[data-size="small"]');
    await page.click('button:has-text("Continue"), button:has-text("Next")');
    
    // Fill personal details
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '+44 7700 900123');
    await page.click('button:has-text("Continue"), button:has-text("Next")');
    
    // Now we should be at the calendar step
    await page.waitForTimeout(3000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'temp_docs/test-screenshots/debug-calendar-step.png' });
    
    console.log('Current URL:', page.url());
    
    // Look for calendar-related elements
    const calendarElements = await page.locator('[class*="calendar"], [class*="Calendar"]').all();
    console.log('Calendar elements found:', calendarElements.length);
    
    for (let i = 0; i < Math.min(calendarElements.length, 5); i++) {
      const element = calendarElements[i];
      const className = await element.getAttribute('class');
      const tagName = await element.evaluate(el => el.tagName);
      console.log(`Calendar element ${i}: ${tagName}, class="${className}"`);
    }
    
    // Look for date-related buttons
    const dateButtons = await page.locator('button[class*="date"], button[class*="day"], .react-calendar__tile').all();
    console.log('Date buttons found:', dateButtons.length);
    
    for (let i = 0; i < Math.min(dateButtons.length, 3); i++) {
      const element = dateButtons[i];
      const className = await element.getAttribute('class');
      const text = await element.textContent();
      const disabled = await element.isDisabled();
      console.log(`Date button ${i}: class="${className}", text="${text}", disabled=${disabled}`);
    }
    
    // Look for time slot elements
    const timeElements = await page.locator('[class*="time"], [class*="slot"], button:has-text("AM"), button:has-text("PM")').all();
    console.log('Time elements found:', timeElements.length);
    
    for (let i = 0; i < Math.min(timeElements.length, 5); i++) {
      const element = timeElements[i];
      const className = await element.getAttribute('class');
      const text = await element.textContent();
      console.log(`Time element ${i}: class="${className}", text="${text?.slice(0, 20)}"`);
    }
    
    // Check page content for date/time related text
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains "calendar":', bodyText?.toLowerCase().includes('calendar'));
    console.log('Page contains "date":', bodyText?.toLowerCase().includes('date'));
    console.log('Page contains "time":', bodyText?.toLowerCase().includes('time'));
    console.log('Page contains "appointment":', bodyText?.toLowerCase().includes('appointment'));
    
    // Print current step information
    const stepInfo = await page.locator('[class*="step"], .step-title, h1, h2').all();
    for (let i = 0; i < Math.min(stepInfo.length, 3); i++) {
      const element = stepInfo[i];
      const text = await element.textContent();
      console.log(`Step info ${i}: "${text?.slice(0, 50)}"`);
    }
  });
});