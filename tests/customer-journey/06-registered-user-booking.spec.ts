import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser, generateVehicle, generateBooking } from '../helpers/test-data';

test.describe('Registered User Booking Flow', () => {
  let helpers: TestHelpers;
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testUser = generateUser();
    
    // Register and login user
    await helpers.registerUser(testUser);
  });

  test('should complete booking with saved vehicle', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Add vehicle first
    await helpers.addVehicle(vehicle);
    
    // Start booking process
    await page.click('text=Book Now');
    await page.waitForURL('/booking');
    
    // Should show saved vehicles
    await expect(page.locator('.saved-vehicles')).toBeVisible();
    await expect(page.locator('text=' + vehicle.registration)).toBeVisible();
    
    // Select saved vehicle
    await page.click(`[data-registration="${vehicle.registration}"]`);
    await page.click('button:has-text("Continue")');
    
    // Select service
    await page.selectOption('select[name="service"]', booking.serviceType);
    await page.click('button:has-text("Continue")');
    
    // Select date and time
    const availableDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
    await availableDateButton.click();
    
    const availableTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
    await availableTimeSlot.click();
    
    await page.click('button:has-text("Continue")');
    
    // Personal details should be pre-filled
    await expect(page.locator('input[name="name"]')).toHaveValue(testUser.name);
    await expect(page.locator('input[name="email"]')).toHaveValue(testUser.email);
    await expect(page.locator('input[name="phone"]')).toHaveValue(testUser.phone);
    
    // Add notes if provided
    if (booking.notes) {
      await page.fill('textarea[name="notes"]', booking.notes);
    }
    
    await page.click('button:has-text("Continue")');
    
    // Review and confirm
    await expect(page.locator('.booking-summary')).toBeVisible();
    await page.click('button:has-text("Confirm Booking")');
    
    // Verify booking confirmation
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
  });

  test('should allow adding new vehicle during booking', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Start booking process
    await page.click('text=Book Now');
    await page.waitForURL('/booking');
    
    // Choose to add new vehicle
    await page.click('text=Add New Vehicle');
    
    // Fill vehicle details
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', vehicle.make);
    await page.fill('input[name="model"]', vehicle.model);
    await page.fill('input[name="year"]', vehicle.year);
    await page.fill('input[name="color"]', vehicle.color);
    
    await page.click('button:has-text("Continue")');
    
    // Complete booking process
    await page.selectOption('select[name="service"]', booking.serviceType);
    await page.click('button:has-text("Continue")');
    
    const availableDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
    await availableDateButton.click();
    
    const availableTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
    await availableTimeSlot.click();
    
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Confirm Booking")');
    
    // Verify booking confirmation
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Vehicle should be saved to account
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    await expect(page.locator('text=' + vehicle.registration)).toBeVisible();
  });

  test('should show pricing based on vehicle size', async ({ page }) => {
    const smallVehicle = generateVehicle();
    smallVehicle.make = 'Ford';
    smallVehicle.model = 'Fiesta';
    
    const largeVehicle = generateVehicle();
    largeVehicle.make = 'BMW';
    largeVehicle.model = 'X5';
    
    // Add both vehicles
    await helpers.addVehicle(smallVehicle);
    await helpers.addVehicle(largeVehicle);
    
    // Test pricing for small vehicle
    await page.click('text=Book Now');
    await page.waitForURL('/booking');
    
    await page.click(`[data-registration="${smallVehicle.registration}"]`);
    await page.click('button:has-text("Continue")');
    
    await page.selectOption('select[name="service"]', 'Interior & Exterior Detail');
    
    // Note the price for small vehicle
    const smallPrice = await page.locator('.price-display').textContent();
    
    // Go back and select large vehicle
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Back")');
    
    await page.click(`[data-registration="${largeVehicle.registration}"]`);
    await page.click('button:has-text("Continue")');
    
    await page.selectOption('select[name="service"]', 'Interior & Exterior Detail');
    
    // Note the price for large vehicle
    const largePrice = await page.locator('.price-display').textContent();
    
    // Large vehicle should cost more
    expect(largePrice).not.toBe(smallPrice);
  });

  test('should handle loyalty discount application', async ({ page }) => {
    // This test assumes user has loyalty points
    await page.click('text=Book Now');
    await page.waitForURL('/booking');
    
    // Go through booking process
    await page.click('text=Add New Vehicle');
    const vehicle = generateVehicle();
    
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', vehicle.make);
    await page.fill('input[name="model"]', vehicle.model);
    await page.fill('input[name="year"]', vehicle.year);
    await page.fill('input[name="color"]', vehicle.color);
    
    await page.click('button:has-text("Continue")');
    
    await page.selectOption('select[name="service"]', 'Interior & Exterior Detail');
    await page.click('button:has-text("Continue")');
    
    const availableDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
    await availableDateButton.click();
    
    const availableTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
    await availableTimeSlot.click();
    
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    
    // Check if loyalty discount is available
    const loyaltySection = page.locator('.loyalty-discount');
    if (await loyaltySection.isVisible()) {
      await page.check('input[name="usePoints"]');
      await expect(page.locator('.discount-amount')).toBeVisible();
    }
    
    await page.click('button:has-text("Confirm Booking")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should pre-fill user information', async ({ page }) => {
    await page.click('text=Book Now');
    await page.waitForURL('/booking');
    
    // Skip to personal details step
    await page.click('text=Add New Vehicle');
    const vehicle = generateVehicle();
    
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', vehicle.make);
    await page.fill('input[name="model"]', vehicle.model);
    await page.fill('input[name="year"]', vehicle.year);
    await page.fill('input[name="color"]', vehicle.color);
    
    await page.click('button:has-text("Continue")');
    
    await page.selectOption('select[name="service"]', 'Interior & Exterior Detail');
    await page.click('button:has-text("Continue")');
    
    const availableDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
    await availableDateButton.click();
    
    const availableTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
    await availableTimeSlot.click();
    
    await page.click('button:has-text("Continue")');
    
    // Personal details should be pre-filled
    await expect(page.locator('input[name="name"]')).toHaveValue(testUser.name);
    await expect(page.locator('input[name="email"]')).toHaveValue(testUser.email);
    await expect(page.locator('input[name="phone"]')).toHaveValue(testUser.phone);
    
    // Fields should be editable
    await page.fill('input[name="name"]', 'Updated Name');
    await expect(page.locator('input[name="name"]')).toHaveValue('Updated Name');
  });

  test('should show booking confirmation with all details', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    await helpers.addVehicle(vehicle);
    
    await page.click('text=Book Now');
    await page.waitForURL('/booking');
    
    // Complete booking process
    await page.click(`[data-registration="${vehicle.registration}"]`);
    await page.click('button:has-text("Continue")');
    
    await page.selectOption('select[name="service"]', booking.serviceType);
    await page.click('button:has-text("Continue")');
    
    const availableDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
    await availableDateButton.click();
    
    const availableTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
    await availableTimeSlot.click();
    
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    
    // Verify booking summary
    await expect(page.locator('.booking-summary')).toBeVisible();
    await expect(page.locator('text=' + vehicle.registration)).toBeVisible();
    await expect(page.locator('text=' + vehicle.make + ' ' + vehicle.model)).toBeVisible();
    await expect(page.locator('text=' + booking.serviceType)).toBeVisible();
    await expect(page.locator('text=' + testUser.name)).toBeVisible();
    await expect(page.locator('text=' + testUser.email)).toBeVisible();
    
    await page.click('button:has-text("Confirm Booking")');
    
    // Verify confirmation page
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('text=Booking Reference')).toBeVisible();
    
    // Should show next steps
    await expect(page.locator('text=What happens next')).toBeVisible();
    await expect(page.locator('text=View Booking')).toBeVisible();
  });
});