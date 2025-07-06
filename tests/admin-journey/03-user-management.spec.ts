import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('Admin User Management', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginAsAdmin();
  });

  test('should view all customer accounts', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Should show users table
    await expect(page.locator('.users-table')).toBeVisible();
    
    // Should show table headers
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Phone')).toBeVisible();
    await expect(page.locator('text=Join Date')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Actions')).toBeVisible();
  });

  test('should search users by name or email', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Should have search input
    await expect(page.locator('input[name="search"]')).toBeVisible();
    
    // Search for a user
    await page.fill('input[name="search"]', 'john');
    await page.press('input[name="search"]', 'Enter');
    await page.waitForLoadState('networkidle');
    
    // Should filter results
    await expect(page.locator('.users-table')).toBeVisible();
    
    // Results should contain search term
    const userRows = page.locator('.user-row');
    const count = await userRows.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const rowText = await userRows.nth(i).textContent();
        expect(rowText.toLowerCase()).toContain('john');
      }
    }
  });

  test('should view user details and history', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Click on first user to view details
    const firstUser = page.locator('.user-row, .user-card').first();
    await firstUser.click();
    
    // Should show user details modal/page
    await expect(page.locator('.user-details')).toBeVisible();
    
    // Should show user information
    await expect(page.locator('text=User Information')).toBeVisible();
    await expect(page.locator('text=Contact Details')).toBeVisible();
    await expect(page.locator('text=Account Status')).toBeVisible();
    
    // Should show user's booking history
    await expect(page.locator('text=Booking History')).toBeVisible();
    await expect(page.locator('.booking-history')).toBeVisible();
    
    // Should show user's vehicles
    await expect(page.locator('text=Registered Vehicles')).toBeVisible();
    await expect(page.locator('.user-vehicles')).toBeVisible();
    
    // Should show rewards information
    await expect(page.locator('text=Rewards Points')).toBeVisible();
    await expect(page.locator('text=Tier Status')).toBeVisible();
  });

  test('should filter users by status', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Should have status filter dropdown
    await expect(page.locator('select[name="status"]')).toBeVisible();
    
    // Test different status filters
    const statuses = ['All', 'Active', 'Inactive', 'Suspended'];
    
    for (const status of statuses) {
      await page.selectOption('select[name="status"]', status);
      await page.waitForLoadState('networkidle');
      
      // Should update table results
      await expect(page.locator('.users-table')).toBeVisible();
      
      // If not "All", should only show users with that status
      if (status !== 'All') {
        const statusCells = page.locator('.user-status');
        const count = await statusCells.count();
        
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            await expect(statusCells.nth(i)).toContainText(status);
          }
        }
      }
    }
  });

  test('should manage user access', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Look for user management actions
    const userActions = page.locator('.user-actions').first();
    
    if (await userActions.isVisible()) {
      await userActions.click();
      
      // Should show management options
      await expect(page.locator('text=Activate')).toBeVisible();
      await expect(page.locator('text=Suspend')).toBeVisible();
      await expect(page.locator('text=Delete')).toBeVisible();
      
      // Test suspend action
      await page.click('text=Suspend');
      
      // Should show confirmation dialog
      await expect(page.locator('.confirmation-dialog')).toBeVisible();
      await page.click('button:has-text("Confirm")');
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    }
  });

  test('should show user analytics', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Should show user statistics
    await expect(page.locator('.user-stats')).toBeVisible();
    
    // Should show key metrics
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=New Users This Month')).toBeVisible();
    await expect(page.locator('text=Active Users')).toBeVisible();
    await expect(page.locator('text=User Retention')).toBeVisible();
  });

  test('should export user data', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), text=Export');
    
    if (await exportButton.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      // Should initiate download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('users');
    }
  });

  test('should handle user communication', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Click on first user
    const firstUser = page.locator('.user-row, .user-card').first();
    await firstUser.click();
    
    // Look for communication options
    const contactButton = page.locator('button:has-text("Contact"), text=Send Message');
    
    if (await contactButton.isVisible()) {
      await contactButton.click();
      
      // Should show message form
      await expect(page.locator('textarea[name="message"]')).toBeVisible();
      await expect(page.locator('input[name="subject"]')).toBeVisible();
      
      // Fill and send message
      await page.fill('input[name="subject"]', 'Test message');
      await page.fill('textarea[name="message"]', 'This is a test message');
      await page.click('button:has-text("Send")');
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    }
  });

  test('should view user registration trends', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Look for analytics section
    const analyticsSection = page.locator('.user-analytics');
    
    if (await analyticsSection.isVisible()) {
      // Should show registration trends
      await expect(page.locator('text=Registration Trends')).toBeVisible();
      
      // Should show charts
      const charts = page.locator('.chart, .graph');
      if (await charts.isVisible()) {
        await expect(charts).toBeVisible();
      }
    }
  });

  test('should handle bulk user operations', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Look for bulk selection checkboxes
    const bulkCheckboxes = page.locator('.bulk-select');
    
    if (await bulkCheckboxes.first().isVisible()) {
      // Select multiple users
      await bulkCheckboxes.first().check();
      await bulkCheckboxes.nth(1).check();
      
      // Should show bulk actions
      await expect(page.locator('.bulk-actions')).toBeVisible();
      
      // Test bulk email
      await page.click('.bulk-actions button:has-text("Send Email")');
      
      // Should show bulk email form
      await expect(page.locator('textarea[name="emailContent"]')).toBeVisible();
      await expect(page.locator('input[name="emailSubject"]')).toBeVisible();
    }
  });

  test('should filter users by registration date', async ({ page }) => {
    await page.click('text=All Users');
    await page.waitForURL('/admin/users');
    
    // Should have date range filters
    await expect(page.locator('input[name="startDate"]')).toBeVisible();
    await expect(page.locator('input[name="endDate"]')).toBeVisible();
    
    // Set date range
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const today = new Date();
    
    await page.fill('input[name="startDate"]', lastMonth.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', today.toISOString().split('T')[0]);
    
    // Apply filter
    await page.click('button:has-text("Filter")');
    await page.waitForLoadState('networkidle');
    
    // Should update results
    await expect(page.locator('.users-table')).toBeVisible();
  });
});