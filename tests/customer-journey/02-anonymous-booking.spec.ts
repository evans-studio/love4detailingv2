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
    await page.click('text=Book Your Service Now');
    await page.waitForURL('/book');

    // Step 1: Select service (new first step)
    await expect(page.locator('h2:has-text("Choose Your Service")').or(page.locator('h1:has-text("Service")'))).toBeVisible();
    
    // Click on the Full Valet & Detail service card using working selector
    const serviceCard = page.locator('.cursor-pointer:has-text("Full Valet & Detail")').first();
    
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    
    // Continue to next step
    await page.click('button:has-text("Next: Vehicle Details")');

    // Step 2: Enter vehicle details using the production flow
    await page.waitForTimeout(1000);
    
    // Select vehicle make first (required)
    await page.click('button:has-text("Select make")');
    await page.waitForTimeout(1000);
    
    // Look for the dropdown options and select one
    const makeOption = page.locator('[role="option"], [data-value], li:has-text("BMW")').first();
    if (await makeOption.isVisible()) {
      await makeOption.click();
    } else {
      // Try clicking any visible option
      const anyOption = page.locator('[role="option"], [data-value], li').first();
      if (await anyOption.isVisible()) {
        await anyOption.click();
      }
    }
    
    await page.waitForTimeout(500);
    
    // Select vehicle size (required)
    await page.click('button:has-text("Medium"):has-text("BMW 3 Series")');
    
    // Wait for validation and then proceed
    await page.waitForTimeout(1000);
    
    // Continue to next step
    const nextButton = page.locator('button:has-text("Next: Personal Details")');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    // Step 3: Select date and time
    // Click on available date
    const availableDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
    await availableDateButton.click();
    
    // Select time slot
    const availableTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
    await availableTimeSlot.click();
    
    await page.click('button:has-text("Continue")');

    // Step 4: Enter personal details
    // Split name for firstName/lastName fields
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await page.fill('input[name="firstName"]', firstName);
    await page.fill('input[name="lastName"]', lastName);
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
    await page.goto('/book');

    // Step 1: Check that next button is disabled without selecting service
    await expect(page.locator('button:has-text("Next: Vehicle Details")')).toBeDisabled();
    
    // The form should show that a service must be selected
    await expect(page.locator('h1, h2').filter({ hasText: /service/i })).toBeVisible();
    
    // Select service and continue
    const serviceCard = page.locator('.cursor-pointer:has-text("Full Valet & Detail")').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    await page.click('button:has-text("Next: Vehicle Details")');
    
    // Step 2: Try to continue without vehicle details
    await page.click('button:has-text("Continue")');
    
    // Should show validation errors
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    // Fill required fields one by one and verify validation
    await page.fill('input[name="vehicle.registration"]', 'AB12CDE');
    // Make and model are dropdowns, not input fields
    await page.fill('input[name="vehicle.year"]', '2020');
    await page.fill('input[name="vehicle.color"]', 'Black');
    
    // Now continue should work
    await page.click('button:has-text("Continue")');
    
    // Should be on date/time step
    await expect(page.locator('h2:has-text("Select Date & Time")')).toBeVisible();
  });

  test('should handle vehicle registration format validation', async ({ page }) => {
    await page.goto('/book');

    // First select service to get to vehicle details step
    const serviceCard = page.locator('.cursor-pointer:has-text("Full Valet & Detail")').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    await page.click('button:has-text("Next: Vehicle Details")');

    // Test invalid registration formats
    const invalidRegistrations = ['ABC', '123', 'ABCDEF123', 'AB123456'];
    
    for (const invalidReg of invalidRegistrations) {
      await page.fill('input[name="vehicle.registration"]', invalidReg);
      await page.click('button:has-text("Continue")');
      
      // Should show validation error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
      
      // Clear the field for next test
      await page.fill('input[name="vehicle.registration"]', '');
    }

    // Test valid registration
    await page.fill('input[name="vehicle.registration"]', 'AB12CDE');
    // Make and model are dropdowns, not input fields
    await page.fill('input[name="vehicle.year"]', '2020');
    await page.fill('input[name="vehicle.color"]', 'Black');
    
    await page.click('button:has-text("Continue")');
    // Should proceed to date/time step
    await expect(page.locator('h2:has-text("Select Date & Time")')).toBeVisible();
  });

  test('should prevent booking in past dates', async ({ page }) => {
    const vehicle = generateVehicle();
    
    await page.goto('/book');
    
    // Step 1: Select service
    const serviceCard = page.locator('.cursor-pointer:has-text("Full Valet & Detail")').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    await page.click('button:has-text("Next: Vehicle Details")');
    
    // Step 2: Fill vehicle details
    await page.fill('input[name="vehicle.registration"]', vehicle.registration);
    await page.fill('input[name="make"]', vehicle.make);
    await page.fill('input[name="model"]', vehicle.model);
    await page.fill('input[name="year"]', vehicle.year);
    await page.fill('input[name="color"]', vehicle.color);
    
    await page.click('button:has-text("Continue")');
    
    // Step 3: Check date validation
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