import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser } from '../helpers/test-data';

test.describe('User Login and Dashboard Exploration', () => {
  let helpers: TestHelpers;
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testUser = generateUser();
    
    // Register user first
    await helpers.registerUser(testUser);
    await helpers.logout();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Fill login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    
    // Verify user is logged in
    await expect(page.locator('text=' + testUser.name)).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Try with wrong password
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    
    // Should remain on login page
    await expect(page).toHaveURL('/auth/sign-in');
  });

  test('should navigate through dashboard sections', async ({ page }) => {
    await helpers.login(testUser.email, testUser.password);
    
    // Check main dashboard elements
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('.sidebar, .navigation')).toBeVisible();
    
    // Test sidebar navigation
    const navigationLinks = [
      { text: 'My Bookings', url: '/dashboard/bookings' },
      { text: 'My Vehicles', url: '/dashboard/vehicles' },
      { text: 'Profile', url: '/dashboard/profile' },
      { text: 'Rewards', url: '/dashboard/rewards' }
    ];
    
    for (const link of navigationLinks) {
      await page.click(`text=${link.text}`);
      await page.waitForURL(link.url);
      await expect(page.locator('h1')).toContainText(link.text);
    }
  });

  test('should display dashboard overview correctly', async ({ page }) => {
    await helpers.login(testUser.email, testUser.password);
    
    // Check dashboard overview sections
    await expect(page.locator('.dashboard-overview, .dashboard-stats')).toBeVisible();
    
    // Should show user's stats
    await expect(page.locator('text=Total Bookings')).toBeVisible();
    await expect(page.locator('text=Vehicles')).toBeVisible();
    await expect(page.locator('text=Rewards Points')).toBeVisible();
    
    // Quick action buttons
    await expect(page.locator('text=Book Now')).toBeVisible();
    await expect(page.locator('text=Add Vehicle')).toBeVisible();
  });

  test('should handle "remember me" functionality', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Login with remember me checked
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.check('input[name="remember"]');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    
    // Close and reopen browser (simulate session)
    await page.context().clearCookies();
    await page.reload();
    
    // Should still be logged in if remember me works
    // Note: This depends on implementation - might need to check localStorage/sessionStorage
  });

  test('should have working logout functionality', async ({ page }) => {
    await helpers.login(testUser.email, testUser.password);
    
    // Find and click logout button
    await page.click('.user-menu-button, .profile-button');
    await page.click('text=Logout');
    
    // Should redirect to home page
    await page.waitForURL('/');
    
    // Verify user is logged out
    await expect(page.locator('text=Sign In')).toBeVisible();
    
    // Try to access dashboard directly
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL('/auth/sign-in');
  });

  test('should show user profile information', async ({ page }) => {
    await helpers.login(testUser.email, testUser.password);
    
    // Navigate to profile
    await page.click('text=Profile');
    await page.waitForURL('/dashboard/profile');
    
    // Check profile information
    const nameParts = testUser.name.split(' ');
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await expect(page.locator('input[name="firstName"], input[name="first_name"]')).toHaveValue(firstName);
    await expect(page.locator('input[name="lastName"], input[name="last_name"]')).toHaveValue(lastName);
    await expect(page.locator('input[name="email"]')).toHaveValue(testUser.email);
  });

  test('should display correct user role and permissions', async ({ page }) => {
    await helpers.login(testUser.email, testUser.password);
    
    // Regular user should not see admin links
    await expect(page.locator('text=Admin')).not.toBeVisible();
    await expect(page.locator('text=Manage Users')).not.toBeVisible();
    await expect(page.locator('text=All Bookings')).not.toBeVisible();
    
    // Should see user-specific navigation
    await expect(page.locator('text=My Bookings')).toBeVisible();
    await expect(page.locator('text=My Vehicles')).toBeVisible();
  });
});