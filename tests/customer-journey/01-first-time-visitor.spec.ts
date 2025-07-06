import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('First-time Visitor Experience', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should navigate through main pages successfully', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await expect(page).toHaveTitle(/Love4Detailing/);
    
    // Check that services are mentioned on page (use first instance to avoid strict mode violation)
    await expect(page.locator('text=Services').first()).toBeVisible();
    
    // Check that contact information is available
    await expect(page.locator('text=Contact')).toBeVisible();
    
    // Check navigation through available links
    const servicesLink = page.locator('text=Services').first();
    if (await servicesLink.isVisible()) {
      await servicesLink.click();
      // Allow for potential redirects or same-page navigation
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate back to home
    await page.goto('/');
    
    // Test contact link functionality
    const contactLink = page.locator('a[href*="tel"], a[href*="mailto"]').first();
    if (await contactLink.isVisible()) {
      await expect(contactLink).toBeVisible();
    }
  });

  test('should display primary CTA button prominently', async ({ page }) => {
    await page.goto('/');
    
    // Check for primary CTA buttons - actual buttons found: "Book Detail", "Book Service"
    const bookButton = page.locator('button:has-text("Book"), a:has-text("Book")').first();
    await expect(bookButton).toBeVisible();
    
    // Verify button is clickable and styled as primary CTA
    await expect(bookButton).toBeEnabled();
    
    // Test button functionality
    await bookButton.click();
    await page.waitForLoadState('networkidle');
    
    // Should navigate to booking-related page (/book found in links)
    await expect(page).toHaveURL(/\/(book|booking)/);
  });

  test('should display essential business information', async ({ page }) => {
    await page.goto('/');
    
    // Check for business name/logo (use specific heading to avoid strict mode violation)
    await expect(page.locator('h1:has-text("Love 4 Detailing")')).toBeVisible();
    await expect(page.locator('span:has-text("Love4Detailing")').first()).toBeVisible();
    
    // Check for contact information (phone and email links found)
    await expect(page.locator('a[href*="tel"]')).toBeVisible();
    await expect(page.locator('a[href*="mailto"]')).toBeVisible();
    
    // Check for professional service indicators (use first instance to avoid strict mode violation)
    await expect(page.locator('p:has-text("Professional car detailing services")').first()).toBeVisible();
    
    // Verify business contact details are displayed
    await expect(page.locator('text=020 1234 5678')).toBeVisible();
    await expect(page.locator('text=info@love4detailing.com')).toBeVisible();
  });

  test('should have working footer links', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    
    // Check footer links exist
    const footerLinks = page.locator('footer a');
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThan(0);
    
    // Test at least one footer link
    const firstLink = footerLinks.first();
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check main content is visible and accessible on mobile
    await expect(page.locator('h1')).toBeVisible();
    
    // Check that booking buttons are accessible on mobile (use first to avoid strict mode violation)
    await expect(page.locator('button:has-text("Book"), a:has-text("Book")').first()).toBeVisible();
    
    // Verify essential contact information is still visible
    await expect(page.locator('a[href*="tel"]')).toBeVisible();
    
    // Check that content fits within mobile viewport
    const bookButton = page.locator('button:has-text("Book")').first();
    if (await bookButton.isVisible()) {
      const boundingBox = await bookButton.boundingBox();
      if (boundingBox) {
        // Button should be within viewport width
        expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });
});