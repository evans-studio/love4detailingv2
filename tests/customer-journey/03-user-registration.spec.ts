import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser } from '../helpers/test-data';

test.describe('New User Registration', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should register new user successfully', async ({ page }) => {
    const user = generateUser();

    await page.goto('/auth/sign-up');
    
    // Fill registration form with correct field names
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await page.fill('input[name="firstName"]', firstName);
    await page.fill('input[name="lastName"]', lastName);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Should redirect to verify email page
    await page.waitForURL('/auth/verify-email');
    
    // Verify we're on the email verification page
    await expect(page.locator('h1, h2').filter({ hasText: /verify|email/i })).toBeVisible();
    await expect(page.locator('text=check your email')).toBeVisible({ timeout: 5000 }).catch(() => 
      expect(page.locator('text=verification')).toBeVisible()
    );
  });

  test('should validate email format', async ({ page }) => {
    const user = generateUser();

    await page.goto('/auth/sign-up');
    
    // Test invalid email formats
    const invalidEmails = ['invalid-email', 'test@', '@domain.com', 'test.domain.com'];
    
    for (const invalidEmail of invalidEmails) {
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || 'Test';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      await page.fill('input[name="firstName"]', firstName);
      await page.fill('input[name="lastName"]', lastName);
      await page.fill('input[name="email"]', invalidEmail);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="confirmPassword"]', user.password);
      
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
    }
  });

  test('should validate password strength', async ({ page }) => {
    const user = generateUser();

    await page.goto('/auth/sign-up');
    
    // Test weak passwords
    const weakPasswords = ['123', 'password', 'abc123', 'PASSWORD'];
    
    for (const weakPassword of weakPasswords) {
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || 'Test';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      await page.fill('input[name="firstName"]', firstName);
      await page.fill('input[name="lastName"]', lastName);
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', weakPassword);
      await page.fill('input[name="confirmPassword"]', weakPassword);
      
      await page.click('button[type="submit"]');
      
      // Should show password strength error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
    }
  });

  test('should validate confirm password matching', async ({ page }) => {
    const user = generateUser();

    await page.goto('/auth/sign-up');
    
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await page.fill('input[name="firstName"]', firstName);
    await page.fill('input[name="lastName"]', lastName);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', 'different-password');
    
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
  });

  test('should handle duplicate email registration', async ({ page }) => {
    const user = generateUser();
    
    // First registration
    await page.goto('/auth/sign-up');
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await page.fill('input[name="firstName"]', firstName);
    await page.fill('input[name="lastName"]', lastName);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.click('button[type="submit"]');
    
    // Wait for registration response
    await page.waitForURL('/auth/verify-email');
    
    // Try to register again with same email
    await page.goto('/auth/sign-up');
    await page.fill('input[name="firstName"]', 'Another');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.click('button[type="submit"]');
    
    // Should show duplicate email error
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=already exists')).toBeVisible();
  });

  test('should have working login link', async ({ page }) => {
    await page.goto('/auth/sign-up');
    
    // Check for login link
    await expect(page.locator('text=Already have an account')).toBeVisible();
    await page.click('text=Sign in');
    
    // Should navigate to login page
    await page.waitForURL('/auth/sign-in');
    await expect(page.locator('h1, h2').filter({ hasText: 'Sign in' })).toBeVisible();
  });
});