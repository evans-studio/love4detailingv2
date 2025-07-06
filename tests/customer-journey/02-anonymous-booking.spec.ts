import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateVehicle, generateBooking, generateUser } from '../helpers/test-data';

test.describe('Anonymous Booking Flow', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should complete full anonymous booking process', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    const user = generateUser();

    // Start booking process
    await page.goto('/');
    await page.click('text=Book Now');
    await page.waitForURL('/booking');

    // Step 1: Enter vehicle details
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', vehicle.make);
    await page.fill('input[name="model"]', vehicle.model);
    await page.fill('input[name="year"]', vehicle.year);
    await page.fill('input[name="color"]', vehicle.color);
    
    // Continue to next step
    await page.click('button:has-text("Continue")');

    // Step 2: Select service
    await page.selectOption('select[name="service"]', booking.serviceType);
    await page.click('button:has-text("Continue")');

    // Step 3: Select date and time
    // Click on available date
    const availableDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
    await availableDateButton.click();
    
    // Select time slot
    const availableTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
    await availableTimeSlot.click();
    
    await page.click('button:has-text("Continue")');

    // Step 4: Enter personal details
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="phone"]', user.phone);
    
    // Add notes if provided
    if (booking.notes) {
      await page.fill('textarea[name="notes"]', booking.notes);
    }

    await page.click('button:has-text("Continue")');

    // Step 5: Review and confirm
    await expect(page.locator('.booking-summary')).toBeVisible();
    await expect(page.locator('text=' + vehicle.registration)).toBeVisible();
    await expect(page.locator('text=' + booking.serviceType)).toBeVisible();
    await expect(page.locator('text=' + user.name)).toBeVisible();

    // Confirm booking
    await page.click('button:has-text("Confirm Booking")');

    // Verify booking confirmation
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    
    // Should show booking reference
    await expect(page.locator('text=Booking Reference')).toBeVisible();
  });

  test('should validate required fields in booking form', async ({ page }) => {
    await page.goto('/booking');

    // Try to continue without filling required fields
    await page.click('button:has-text("Continue")');

    // Should show validation errors
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    // Fill required fields one by one and verify validation
    await page.fill('input[name="registration"]', 'AB12CDE');
    await page.fill('input[name="make"]', 'BMW');
    await page.fill('input[name="model"]', 'X5');
    await page.fill('input[name="year"]', '2020');
    await page.fill('input[name="color"]', 'Black');
    
    // Now continue should work
    await page.click('button:has-text("Continue")');
    await page.waitForURL('/booking?step=2');
  });

  test('should handle vehicle registration format validation', async ({ page }) => {
    await page.goto('/booking');

    // Test invalid registration formats
    const invalidRegistrations = ['ABC', '123', 'ABCDEF123', 'AB123456'];
    
    for (const invalidReg of invalidRegistrations) {
      await page.fill('input[name="registration"]', invalidReg);
      await page.click('button:has-text("Continue")');
      
      // Should show validation error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
      
      // Clear the field for next test
      await page.fill('input[name="registration"]', '');
    }

    // Test valid registration
    await page.fill('input[name="registration"]', 'AB12CDE');
    await page.fill('input[name="make"]', 'BMW');
    await page.fill('input[name="model"]', 'X5');
    await page.fill('input[name="year"]', '2020');
    await page.fill('input[name="color"]', 'Black');
    
    await page.click('button:has-text("Continue")');
    // Should proceed to next step
    await page.waitForURL('/booking?step=2');
  });

  test('should prevent booking in past dates', async ({ page }) => {
    const vehicle = generateVehicle();
    
    await page.goto('/booking');
    
    // Fill vehicle details
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', vehicle.make);
    await page.fill('input[name="model"]', vehicle.model);
    await page.fill('input[name="year"]', vehicle.year);
    await page.fill('input[name="color"]', vehicle.color);
    
    await page.click('button:has-text("Continue")');
    
    // Select service
    await page.selectOption('select[name="service"]', 'Interior & Exterior Detail');
    await page.click('button:has-text("Continue")');
    
    // Past dates should be disabled
    const pastDateButtons = page.locator('.react-calendar__tile--disabled');
    const pastDateCount = await pastDateButtons.count();
    expect(pastDateCount).toBeGreaterThan(0);
    
    // Only future dates should be clickable
    const futureDateButtons = page.locator('.react-calendar__tile:not([disabled])');
    const futureDateCount = await futureDateButtons.count();
    expect(futureDateCount).toBeGreaterThan(0);
  });
});