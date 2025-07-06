import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { ADMIN_CREDENTIALS } from '../helpers/test-data';

test.describe('Admin Authentication', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should login with admin credentials', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Fill admin credentials
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await page.waitForURL('/admin');
    
    // Verify admin interface is visible
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    await expect(page.locator('text=All Bookings')).toBeVisible();
    await expect(page.locator('text=All Users')).toBeVisible();
  });

  test('should have admin-specific navigation', async ({ page }) => {
    await helpers.loginAsAdmin();
    
    // Should show admin navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Bookings')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Vehicles')).toBeVisible();
    await expect(page.locator('text=Reports')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should display admin dashboard overview', async ({ page }) => {
    await helpers.loginAsAdmin();
    
    // Should show admin statistics
    await expect(page.locator('.admin-stats')).toBeVisible();
    await expect(page.locator('text=Total Bookings')).toBeVisible();
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Active Vehicles')).toBeVisible();
    
    // Should show recent activity
    await expect(page.locator('.recent-activity')).toBeVisible();
    await expect(page.locator('text=Recent Bookings')).toBeVisible();
    await expect(page.locator('text=New Users')).toBeVisible();
  });

  test('should prevent non-admin access to admin routes', async ({ page }) => {
    // Try to access admin route without login
    await page.goto('/admin');
    
    // Should redirect to login
    await page.waitForURL('/auth/sign-in');
    
    // Login as regular user
    const regularUser = {
      email: 'regular@user.com',
      password: 'password123'
    };
    
    await page.fill('input[type="email"]', regularUser.email);
    await page.fill('input[type="password"]', regularUser.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to regular dashboard
    await page.waitForURL('/dashboard');
    
    // Try to access admin route as regular user
    await page.goto('/admin');
    
    // Should be redirected or show access denied
    await expect(page).not.toHaveURL('/admin');
  });

  test('should handle admin logout', async ({ page }) => {
    await helpers.loginAsAdmin();
    
    // Verify admin access
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    
    // Logout
    await page.click('.user-menu-button, .admin-menu-button');
    await page.click('text=Logout');
    
    // Should redirect to home page
    await page.waitForURL('/');
    
    // Verify logged out
    await expect(page.locator('text=Sign In')).toBeVisible();
    
    // Try to access admin route after logout
    await page.goto('/admin');
    
    // Should redirect to login
    await page.waitForURL('/auth/sign-in');
  });

  test('should show admin role indicator', async ({ page }) => {
    await helpers.loginAsAdmin();
    
    // Should show admin role indicator
    await expect(page.locator('.admin-badge, .role-admin')).toBeVisible();
    await expect(page.locator('text=Admin')).toBeVisible();
    
    // Should show admin email
    await expect(page.locator('text=' + ADMIN_CREDENTIALS.email)).toBeVisible();
  });

  test('should have admin-specific permissions', async ({ page }) => {
    await helpers.loginAsAdmin();
    
    // Should have access to management features
    await expect(page.locator('text=Manage Users')).toBeVisible();
    await expect(page.locator('text=Manage Bookings')).toBeVisible();
    await expect(page.locator('text=System Settings')).toBeVisible();
    
    // Should have access to sensitive data
    await expect(page.locator('text=All Users')).toBeVisible();
    await expect(page.locator('text=Financial Reports')).toBeVisible();
  });

  test('should handle admin session timeout', async ({ page }) => {
    await helpers.loginAsAdmin();
    
    // Simulate session timeout by clearing session storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to access admin feature
    await page.click('text=All Bookings');
    
    // Should redirect to login or show session expired message
    await expect(page.locator('text=Session expired, text=Please login again')).toBeVisible();
  });

  test('should validate admin credentials format', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Test invalid email format
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    // Test empty credentials
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="password"]', '');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
  });

  test('should handle admin password reset', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Click forgot password link
    await page.click('text=Forgot Password');
    
    // Should navigate to password reset page
    await page.waitForURL('/auth/forgot-password');
    
    // Enter admin email
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });
});