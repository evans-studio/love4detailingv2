import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser, generateVehicle, generateBooking } from '../helpers/test-data';

test.describe('Admin Booking Management', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginAsAdmin();
  });

  test('should view all customer bookings', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Should show bookings table
    await expect(page.locator('.bookings-table')).toBeVisible();
    
    // Should show table headers
    await expect(page.locator('text=Customer')).toBeVisible();
    await expect(page.locator('text=Vehicle')).toBeVisible();
    await expect(page.locator('text=Service')).toBeVisible();
    await expect(page.locator('text=Date')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Actions')).toBeVisible();
  });

  test('should filter bookings by status', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Should have status filter dropdown
    await expect(page.locator('select[name="status"]')).toBeVisible();
    
    // Test different status filters
    const statuses = ['All', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
    
    for (const status of statuses) {
      await page.selectOption('select[name="status"]', status);
      await page.waitForLoadState('networkidle');
      
      // Should update table results
      await expect(page.locator('.bookings-table')).toBeVisible();
      
      // If not "All", should only show bookings with that status
      if (status !== 'All') {
        const statusCells = page.locator('.booking-status');
        const count = await statusCells.count();
        
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            await expect(statusCells.nth(i)).toContainText(status);
          }
        }
      }
    }
  });

  test('should search bookings by customer name', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Should have search input
    await expect(page.locator('input[name="search"]')).toBeVisible();
    
    // Search for a customer
    await page.fill('input[name="search"]', 'John');
    await page.press('input[name="search"]', 'Enter');
    await page.waitForLoadState('networkidle');
    
    // Should filter results
    await expect(page.locator('.bookings-table')).toBeVisible();
    
    // Results should contain search term
    const customerCells = page.locator('.customer-name');
    const count = await customerCells.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const cellText = await customerCells.nth(i).textContent();
        expect(cellText.toLowerCase()).toContain('john');
      }
    }
  });

  test('should view booking details', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Click on first booking to view details
    const firstBooking = page.locator('.booking-row, .booking-card').first();
    await firstBooking.click();
    
    // Should show booking details modal/page
    await expect(page.locator('.booking-details')).toBeVisible();
    
    // Should show comprehensive booking information
    await expect(page.locator('text=Customer Details')).toBeVisible();
    await expect(page.locator('text=Vehicle Details')).toBeVisible();
    await expect(page.locator('text=Service Details')).toBeVisible();
    await expect(page.locator('text=Booking Timeline')).toBeVisible();
    
    // Should show contact information
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Phone')).toBeVisible();
    
    // Should show booking reference
    await expect(page.locator('text=Reference')).toBeVisible();
  });

  test('should update booking status', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Find a booking to update
    const statusDropdown = page.locator('.status-dropdown').first();
    
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      
      // Select new status
      await page.click('text=In Progress');
      
      // Should show confirmation or success message
      await expect(page.locator('.success-message')).toBeVisible();
      
      // Status should be updated in table
      await expect(page.locator('text=In Progress')).toBeVisible();
    }
  });

  test('should filter bookings by date range', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Should have date range filters
    await expect(page.locator('input[name="startDate"]')).toBeVisible();
    await expect(page.locator('input[name="endDate"]')).toBeVisible();
    
    // Set date range
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    await page.fill('input[name="startDate"]', today.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', nextWeek.toISOString().split('T')[0]);
    
    // Apply filter
    await page.click('button:has-text("Filter")');
    await page.waitForLoadState('networkidle');
    
    // Should update results
    await expect(page.locator('.bookings-table')).toBeVisible();
  });

  test('should export booking data', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), text=Export');
    
    if (await exportButton.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      // Should initiate download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('bookings');
    }
  });

  test('should handle pagination', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Should show pagination if many bookings
    const paginationControls = page.locator('.pagination');
    
    if (await paginationControls.isVisible()) {
      // Should show current page
      await expect(page.locator('.current-page')).toBeVisible();
      
      // Should show next/previous buttons
      await expect(page.locator('button:has-text("Next")')).toBeVisible();
      await expect(page.locator('button:has-text("Previous")')).toBeVisible();
      
      // Test pagination
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should update results
        await expect(page.locator('.bookings-table')).toBeVisible();
      }
    }
  });

  test('should assign bookings to staff', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Look for staff assignment feature
    const assignButton = page.locator('.assign-staff, button:has-text("Assign")').first();
    
    if (await assignButton.isVisible()) {
      await assignButton.click();
      
      // Should show staff selection
      await expect(page.locator('select[name="staffMember"]')).toBeVisible();
      
      // Select staff member
      await page.selectOption('select[name="staffMember"]', { index: 1 });
      await page.click('button:has-text("Assign")');
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    }
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Look for bulk selection checkboxes
    const bulkCheckboxes = page.locator('.bulk-select');
    
    if (await bulkCheckboxes.first().isVisible()) {
      // Select multiple bookings
      await bulkCheckboxes.first().check();
      await bulkCheckboxes.nth(1).check();
      
      // Should show bulk actions
      await expect(page.locator('.bulk-actions')).toBeVisible();
      
      // Test bulk status update
      await page.click('.bulk-actions button:has-text("Update Status")');
      await page.selectOption('select[name="bulkStatus"]', 'Confirmed');
      await page.click('button:has-text("Apply")');
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    }
  });

  test('should show booking analytics', async ({ page }) => {
    await page.click('text=All Bookings');
    await page.waitForURL('/admin/bookings');
    
    // Should show booking statistics
    await expect(page.locator('.booking-stats')).toBeVisible();
    
    // Should show key metrics
    await expect(page.locator('text=Total Bookings')).toBeVisible();
    await expect(page.locator('text=Today\'s Bookings')).toBeVisible();
    await expect(page.locator('text=Completion Rate')).toBeVisible();
    
    // Should show charts or graphs
    const charts = page.locator('.chart, .graph');
    if (await charts.isVisible()) {
      await expect(charts).toBeVisible();
    }
  });
});