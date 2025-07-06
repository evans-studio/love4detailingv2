import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser } from '../helpers/test-data';

test.describe('Mobile Navigation', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Set iPhone SE viewport as specified in guide
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should display mobile navigation menu', async ({ page }) => {
    await page.goto('/');
    
    // Should show mobile menu button
    const mobileMenuButton = page.locator('.mobile-menu-button, [aria-label="Menu"], button:has-text("Menu")');
    await expect(mobileMenuButton).toBeVisible();
    
    // Click to open menu
    await mobileMenuButton.click();
    
    // Should show mobile menu
    await expect(page.locator('.mobile-menu, .mobile-nav')).toBeVisible();
    
    // Should show navigation links
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Services')).toBeVisible();
    await expect(page.locator('text=Pricing')).toBeVisible();
    await expect(page.locator('text=Contact')).toBeVisible();
  });

  test('should handle mobile menu interactions', async ({ page }) => {
    await page.goto('/');
    
    // Open mobile menu
    const mobileMenuButton = page.locator('.mobile-menu-button, [aria-label="Menu"], button:has-text("Menu")');
    await mobileMenuButton.click();
    
    // Click on Services link
    await page.click('text=Services');
    
    // Should navigate to services page
    await page.waitForURL('/services');
    
    // Menu should close automatically
    await expect(page.locator('.mobile-menu')).not.toBeVisible();
  });

  test('should display mobile-optimized booking form', async ({ page }) => {
    await page.goto('/booking');
    
    // Form should be mobile-friendly
    await expect(page.locator('.booking-form')).toBeVisible();
    
    // Form fields should be appropriately sized
    const formFields = page.locator('input, select, textarea');
    const count = await formFields.count();
    
    for (let i = 0; i < count; i++) {
      const field = formFields.nth(i);
      const boundingBox = await field.boundingBox();
      
      if (boundingBox) {
        // Fields should be wide enough for mobile
        expect(boundingBox.width).toBeGreaterThan(200);
      }
    }
  });

  test('should handle mobile dashboard navigation', async ({ page }) => {
    const testUser = generateUser();
    
    // Register and login
    await helpers.registerUser(testUser);
    
    // Should show mobile dashboard
    await expect(page.locator('.dashboard')).toBeVisible();
    
    // Should show mobile sidebar button
    const sidebarButton = page.locator('.mobile-sidebar-button, .sidebar-toggle');
    if (await sidebarButton.isVisible()) {
      await sidebarButton.click();
      
      // Should show mobile sidebar
      await expect(page.locator('.mobile-sidebar, .sidebar')).toBeVisible();
      
      // Should show navigation links
      await expect(page.locator('text=My Bookings')).toBeVisible();
      await expect(page.locator('text=My Vehicles')).toBeVisible();
      await expect(page.locator('text=Profile')).toBeVisible();
    }
  });

  test('should handle touch-friendly controls', async ({ page }) => {
    await page.goto('/booking');
    
    // Buttons should be touch-friendly (at least 44px)
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();
      
      if (boundingBox) {
        // Touch targets should be at least 44px
        expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should handle mobile calendar interaction', async ({ page }) => {
    await page.goto('/booking');
    
    // Navigate to date selection
    await page.click('text=Add New Vehicle');
    await page.fill('input[name="registration"]', 'AB12CDE');
    await page.fill('input[name="make"]', 'BMW');
    await page.fill('input[name="model"]', 'X5');
    await page.fill('input[name="year"]', '2020');
    await page.fill('input[name="color"]', 'Black');
    await page.click('button:has-text("Continue")');
    
    await page.selectOption('select[name="service"]', 'Interior & Exterior Detail');
    await page.click('button:has-text("Continue")');
    
    // Calendar should be mobile-friendly
    await expect(page.locator('.react-calendar')).toBeVisible();
    
    // Calendar tiles should be touch-friendly
    const calendarTiles = page.locator('.react-calendar__tile');
    const tileCount = await calendarTiles.count();
    
    if (tileCount > 0) {
      const firstTile = calendarTiles.first();
      const boundingBox = await firstTile.boundingBox();
      
      if (boundingBox) {
        // Calendar tiles should be large enough for touch
        expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('should handle mobile form validation', async ({ page }) => {
    await page.goto('/booking');
    
    // Try to submit form without required fields
    await page.click('button:has-text("Continue")');
    
    // Error messages should be visible on mobile
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    // Error messages should not be cut off
    const errorMessages = page.locator('.error-message, .field-error');
    const count = await errorMessages.count();
    
    for (let i = 0; i < count; i++) {
      const message = errorMessages.nth(i);
      const boundingBox = await message.boundingBox();
      
      if (boundingBox) {
        // Error messages should fit within viewport
        expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should handle mobile keyboard interactions', async ({ page }) => {
    await page.goto('/booking');
    
    // Focus on input field
    await page.click('input[name="registration"]');
    
    // Type using mobile keyboard
    await page.keyboard.type('AB12CDE');
    
    // Should update field value
    await expect(page.locator('input[name="registration"]')).toHaveValue('AB12CDE');
    
    // Test with different input types
    await page.click('input[name="year"]');
    await page.keyboard.type('2020');
    
    await expect(page.locator('input[name="year"]')).toHaveValue('2020');
  });

  test('should handle mobile scrolling', async ({ page }) => {
    await page.goto('/services');
    
    // Should be able to scroll through content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Should reach bottom of page
    const scrollPosition = await page.evaluate(() => window.pageYOffset);
    expect(scrollPosition).toBeGreaterThan(0);
  });

  test('should handle mobile orientation changes', async ({ page }) => {
    await page.goto('/');
    
    // Test portrait mode (default)
    await expect(page.locator('.mobile-menu-button')).toBeVisible();
    
    // Switch to landscape mode
    await page.setViewportSize({ width: 667, height: 375 });
    
    // Should still be usable in landscape
    await expect(page.locator('text=Book Now')).toBeVisible();
    
    // Content should adapt to landscape
    const mainContent = page.locator('main, .main-content');
    const boundingBox = await mainContent.boundingBox();
    
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(boundingBox.height);
    }
  });

  test('should handle mobile user authentication', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Login form should be mobile-friendly
    await expect(page.locator('.login-form')).toBeVisible();
    
    // Form fields should be appropriately sized
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    
    const emailBox = await emailField.boundingBox();
    const passwordBox = await passwordField.boundingBox();
    
    if (emailBox && passwordBox) {
      expect(emailBox.width).toBeGreaterThan(200);
      expect(passwordBox.width).toBeGreaterThan(200);
    }
    
    // Test mobile login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit button should be touch-friendly
    const submitButton = page.locator('button[type="submit"]');
    const submitBox = await submitButton.boundingBox();
    
    if (submitBox) {
      expect(submitBox.height).toBeGreaterThanOrEqual(44);
    }
  });
});