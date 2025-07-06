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
    
    // Fill registration form
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="phone"]', user.phone);
    
    // Accept terms and conditions
    await page.check('input[name="terms"]');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    
    // Verify user is logged in
    await expect(page.locator('text=' + user.name)).toBeVisible();
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    const user = generateUser();

    await page.goto('/auth/sign-up');
    
    // Test invalid email formats
    const invalidEmails = ['invalid-email', 'test@', '@domain.com', 'test.domain.com'];
    
    for (const invalidEmail of invalidEmails) {
      await page.fill('input[name="name"]', user.name);
      await page.fill('input[name="email"]', invalidEmail);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="phone"]', user.phone);
      await page.check('input[name="terms"]');
      
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
      await page.fill('input[name="name"]', user.name);
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', weakPassword);
      await page.fill('input[name="phone"]', user.phone);
      await page.check('input[name="terms"]');
      
      await page.click('button[type="submit"]');
      
      // Should show password strength error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
    }
  });

  test('should validate phone number format', async ({ page }) => {
    const user = generateUser();

    await page.goto('/auth/sign-up');
    
    // Test invalid phone formats
    const invalidPhones = ['123', '123456789012345', 'abc123', '+44 abc'];
    
    for (const invalidPhone of invalidPhones) {
      await page.fill('input[name="name"]', user.name);
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="phone"]', invalidPhone);
      await page.check('input[name="terms"]');
      
      await page.click('button[type="submit"]');
      
      // Should show phone validation error
      await expect(page.locator('.error-message, .field-error')).toBeVisible();
    }
  });

  test('should require terms and conditions acceptance', async ({ page }) => {
    const user = generateUser();

    await page.goto('/auth/sign-up');
    
    // Fill form without accepting terms
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="phone"]', user.phone);
    
    // Don't check terms checkbox
    await page.click('button[type="submit"]');
    
    // Should show terms validation error
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
    
    // Now check terms and submit
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');
    
    // Should proceed to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should handle duplicate email registration', async ({ page }) => {
    const user = generateUser();
    
    // First registration
    await page.goto('/auth/sign-up');
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="phone"]', user.phone);
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');
    
    // Wait for registration and logout
    await page.waitForURL('/dashboard');
    await helpers.logout();
    
    // Try to register again with same email
    await page.goto('/auth/sign-up');
    await page.fill('input[name="name"]', 'Another User');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="phone"]', '+44 7888 888888');
    await page.check('input[name="terms"]');
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
    await expect(page.locator('h1')).toContainText('Sign In');
  });
});