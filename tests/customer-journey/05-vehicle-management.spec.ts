import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser, generateVehicle } from '../helpers/test-data';

test.describe('Vehicle Management', () => {
  let helpers: TestHelpers;
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testUser = generateUser();
    
    // Register and login user
    await helpers.registerUser(testUser);
  });

  test('should add new vehicle successfully', async ({ page }) => {
    const vehicle = generateVehicle();
    
    // Navigate to vehicles page
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    
    // Click add vehicle button
    await page.click('text=Add Vehicle');
    
    // Fill vehicle form
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', vehicle.make);
    await page.fill('input[name="model"]', vehicle.model);
    await page.fill('input[name="year"]', vehicle.year);
    await page.fill('input[name="color"]', vehicle.color);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('text=Vehicle added successfully')).toBeVisible();
    
    // Verify vehicle appears in list
    await expect(page.locator('text=' + vehicle.registration)).toBeVisible();
    await expect(page.locator('text=' + vehicle.make + ' ' + vehicle.model)).toBeVisible();
  });

  test('should view saved vehicles', async ({ page }) => {
    const vehicle = generateVehicle();
    
    // Add a vehicle first
    await helpers.addVehicle(vehicle);
    
    // Navigate to vehicles page
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    
    // Verify vehicle is displayed
    await expect(page.locator('.vehicle-card')).toBeVisible();
    await expect(page.locator('text=' + vehicle.registration)).toBeVisible();
    await expect(page.locator('text=' + vehicle.make)).toBeVisible();
    await expect(page.locator('text=' + vehicle.model)).toBeVisible();
    await expect(page.locator('text=' + vehicle.year)).toBeVisible();
    await expect(page.locator('text=' + vehicle.color)).toBeVisible();
  });

  test('should delete vehicle', async ({ page }) => {
    const vehicle = generateVehicle();
    
    // Add a vehicle first
    await helpers.addVehicle(vehicle);
    
    // Navigate to vehicles page
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    
    // Click delete button
    await page.click(`[data-registration="${vehicle.registration}"] .delete-button, .vehicle-card .delete-button`);
    
    // Confirm deletion
    await page.click('text=Confirm');
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Verify vehicle is removed from list
    await expect(page.locator('text=' + vehicle.registration)).not.toBeVisible();
  });

  test('should validate vehicle registration format', async ({ page }) => {
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    await page.click('text=Add Vehicle');
    
    // Test invalid registration formats
    const invalidRegistrations = ['ABC', '123', 'ABCDEFG', '123456789'];
    
    for (const invalidReg of invalidRegistrations) {
      await page.fill('input[name="registration"]', invalidReg);
      await page.fill('input[name="make"]', 'BMW');
      await page.fill('input[name="model"]', 'X5');
      await page.fill('input[name="year"]', '2020');
      await page.fill('input[name="color"]', 'Black');
      
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    await page.click('text=Add Vehicle');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    // Fill fields one by one
    await page.fill('input[name="registration"]', 'AB12CDE');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    await page.fill('input[name="make"]', 'BMW');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    await page.fill('input[name="model"]', 'X5');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    await page.fill('input[name="year"]', '2020');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    await page.fill('input[name="color"]', 'Black');
    await page.click('button[type="submit"]');
    
    // Should now succeed
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should prevent duplicate vehicle registration', async ({ page }) => {
    const vehicle = generateVehicle();
    
    // Add a vehicle first
    await helpers.addVehicle(vehicle);
    
    // Try to add same vehicle again
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    await page.click('text=Add Vehicle');
    
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', 'Different Make');
    await page.fill('input[name="model"]', 'Different Model');
    await page.fill('input[name="year"]', '2021');
    await page.fill('input[name="color"]', 'Red');
    
    await page.click('button[type="submit"]');
    
    // Should show duplicate error
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=already exists')).toBeVisible();
  });

  test('should validate year range', async ({ page }) => {
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    await page.click('text=Add Vehicle');
    
    // Test invalid years
    const invalidYears = ['1800', '2050', 'abc', '20'];
    
    for (const invalidYear of invalidYears) {
      await page.fill('input[name="registration"]', 'AB12CDE');
      await page.fill('input[name="make"]', 'BMW');
      await page.fill('input[name="model"]', 'X5');
      await page.fill('input[name="year"]', invalidYear);
      await page.fill('input[name="color"]', 'Black');
      
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
    }
  });

  test('should show empty state when no vehicles', async ({ page }) => {
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    
    // Should show empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=No vehicles added yet')).toBeVisible();
    await expect(page.locator('text=Add Vehicle')).toBeVisible();
  });

  test('should handle vehicle size detection', async ({ page }) => {
    const vehicle = generateVehicle();
    
    await page.click('text=My Vehicles');
    await page.waitForURL('/dashboard/vehicles');
    await page.click('text=Add Vehicle');
    
    // Fill form with known vehicle
    await page.fill('input[name="registration"]', vehicle.registration);
    await page.fill('input[name="make"]', 'BMW');
    await page.fill('input[name="model"]', 'X5');
    await page.fill('input[name="year"]', '2020');
    await page.fill('input[name="color"]', 'Black');
    
    await page.click('button[type="submit"]');
    
    // Should detect size automatically
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Check if size is displayed
    await expect(page.locator('.vehicle-size, text=Large')).toBeVisible();
  });
});