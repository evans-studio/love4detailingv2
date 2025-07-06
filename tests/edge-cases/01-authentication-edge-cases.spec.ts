import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser } from '../helpers/test-data';

test.describe('Authentication Edge Cases', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Test with non-existent email
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    
    // Should remain on login page
    await expect(page).toHaveURL('/auth/sign-in');
  });

  test('should handle empty login fields', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Try to submit with empty fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    // Should not proceed
    await expect(page).toHaveURL('/auth/sign-in');
  });

  test('should handle SQL injection attempts', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Test SQL injection patterns
    const injectionAttempts = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "admin'; --",
      "' UNION SELECT * FROM users --"
    ];
    
    for (const injection of injectionAttempts) {
      await page.fill('input[type="email"]', injection);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Should show error or remain on login page
      await expect(page).toHaveURL('/auth/sign-in');
      
      // Clear fields for next test
      await page.fill('input[type="email"]', '');
      await page.fill('input[type="password"]', '');
    }
  });

  test('should handle XSS attempts in login form', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Test XSS patterns
    const xssAttempts = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>'
    ];
    
    for (const xss of xssAttempts) {
      await page.fill('input[type="email"]', xss);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Should not execute script
      await expect(page).toHaveURL('/auth/sign-in');
      
      // Clear fields for next test
      await page.fill('input[type="email"]', '');
      await page.fill('input[type="password"]', '');
    }
  });

  test('should handle account lockout after multiple failed attempts', async ({ page }) => {
    const testUser = generateUser();
    
    // First register a user
    await helpers.registerUser(testUser);
    await helpers.logout();
    
    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await page.goto('/auth/sign-in');
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error
      await expect(page.locator('.error-message')).toBeVisible();
    }
    
    // After multiple attempts, should show lockout message
    await expect(page.locator('text=Account locked')).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    const testUser = generateUser();
    
    // Register user first
    await helpers.registerUser(testUser);
    await helpers.logout();
    
    // Go to password reset
    await page.goto('/auth/sign-in');
    await page.click('text=Forgot Password');
    await page.waitForURL('/auth/forgot-password');
    
    // Enter email
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });

  test('should handle password reset with invalid email', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    // Enter non-existent email
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.click('button[type="submit"]');
    
    // Should show error or generic message for security
    await expect(page.locator('.error-message, .success-message')).toBeVisible();
  });

  test('should handle email verification process', async ({ page }) => {
    const testUser = generateUser();
    
    // Register user
    await page.goto('/auth/sign-up');
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="phone"]', testUser.phone);
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');
    
    // Should show verification message
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Try to access dashboard before verification
    await page.goto('/dashboard');
    
    // Should redirect to verification page or login
    await expect(page).not.toHaveURL('/dashboard');
  });

  test('should handle session timeout', async ({ page }) => {
    const testUser = generateUser();
    
    // Register and login
    await helpers.registerUser(testUser);
    
    // Simulate session timeout by clearing storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to access protected page
    await page.goto('/dashboard/bookings');
    
    // Should redirect to login
    await page.waitForURL('/auth/sign-in');
    
    // Should show session expired message
    await expect(page.locator('text=Session expired')).toBeVisible();
  });

  test('should handle concurrent sessions', async ({ page, context }) => {
    const testUser = generateUser();
    
    // Register user
    await helpers.registerUser(testUser);
    
    // Open second tab
    const secondPage = await context.newPage();
    await secondPage.goto('/dashboard');
    
    // Both should be logged in
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(secondPage.locator('text=Dashboard')).toBeVisible();
    
    // Logout from first tab
    await helpers.logout();
    
    // Second tab should also be logged out (if single session)
    await secondPage.reload();
    await expect(secondPage).toHaveURL('/auth/sign-in');
  });

  test('should handle malformed authentication tokens', async ({ page }) => {
    const testUser = generateUser();
    
    // Register and login
    await helpers.registerUser(testUser);
    
    // Corrupt the auth token
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'corrupted-token');
    });
    
    // Try to access protected page
    await page.goto('/dashboard/bookings');
    
    // Should handle gracefully and redirect to login
    await page.waitForURL('/auth/sign-in');
  });

  test('should handle network errors during authentication', async ({ page }) => {
    // Simulate network failure
    await page.route('**/auth/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/auth/sign-in');
    
    // Try to login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Should show network error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=Network error')).toBeVisible();
  });
});