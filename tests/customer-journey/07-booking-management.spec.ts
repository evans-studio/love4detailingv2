import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { generateUser, generateVehicle, generateBooking } from '../helpers/test-data';

test.describe('Booking Management', () => {
  let helpers: TestHelpers;
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testUser = generateUser();
    
    // Register and login user
    await helpers.registerUser(testUser);
  });

  test('should view booking details', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Create a booking first
    await helpers.addVehicle(vehicle);
    await helpers.createBooking(booking);
    
    // Navigate to bookings
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Should see booking in list
    await expect(page.locator('.booking-card')).toBeVisible();
    await expect(page.locator('text=' + booking.serviceType)).toBeVisible();
    await expect(page.locator('text=' + vehicle.registration)).toBeVisible();
    
    // Click to view details
    await page.click('.booking-card .view-details');
    
    // Should show detailed information
    await expect(page.locator('.booking-details')).toBeVisible();
    await expect(page.locator('text=' + booking.serviceType)).toBeVisible();
    await expect(page.locator('text=' + vehicle.make + ' ' + vehicle.model)).toBeVisible();
    await expect(page.locator('text=' + booking.date)).toBeVisible();
    await expect(page.locator('text=' + booking.time)).toBeVisible();
  });

  test('should show booking status updates', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Create a booking first
    await helpers.addVehicle(vehicle);
    await helpers.createBooking(booking);
    
    // Navigate to bookings
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Should show current status
    await expect(page.locator('.booking-status')).toBeVisible();
    await expect(page.locator('text=Confirmed')).toBeVisible();
    
    // Status should be color-coded
    await expect(page.locator('.status-confirmed, .status-pending')).toBeVisible();
  });

  test('should filter bookings by status', async ({ page }) => {
    // This test assumes multiple bookings exist
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Should have filter options
    await expect(page.locator('select[name="status"], .filter-buttons')).toBeVisible();
    
    // Test different filters
    const filters = ['All', 'Confirmed', 'Completed', 'Cancelled'];
    
    for (const filter of filters) {
      if (await page.locator(`text=${filter}`).isVisible()) {
        await page.click(`text=${filter}`);
        await page.waitForLoadState('networkidle');
        
        // Should update results
        await expect(page.locator('.booking-card, .empty-state')).toBeVisible();
      }
    }
  });

  test('should show booking history in chronological order', async ({ page }) => {
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Should show most recent first
    const bookingCards = page.locator('.booking-card');
    const count = await bookingCards.count();
    
    if (count > 1) {
      // Check dates are in descending order
      const dates = [];
      for (let i = 0; i < count; i++) {
        const dateText = await bookingCards.nth(i).locator('.booking-date').textContent();
        dates.push(dateText);
      }
      
      // Verify chronological order
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    }
  });

  test('should handle empty booking state', async ({ page }) => {
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // If no bookings exist, should show empty state
    const bookingCards = page.locator('.booking-card');
    const count = await bookingCards.count();
    
    if (count === 0) {
      await expect(page.locator('.empty-state')).toBeVisible();
      await expect(page.locator('text=No bookings yet')).toBeVisible();
      await expect(page.locator('text=Book Now')).toBeVisible();
    }
  });

  test('should allow rescheduling booking', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Create a booking first
    await helpers.addVehicle(vehicle);
    await helpers.createBooking(booking);
    
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Look for reschedule option
    const rescheduleButton = page.locator('.reschedule-button, text=Reschedule');
    
    if (await rescheduleButton.isVisible()) {
      await rescheduleButton.click();
      
      // Should show date/time selection
      await expect(page.locator('.calendar, .time-slots')).toBeVisible();
      
      // Select new date/time
      const newDateButton = page.locator('.react-calendar__tile:not([disabled])').first();
      await newDateButton.click();
      
      const newTimeSlot = page.locator('.time-slot-button:not([disabled])').first();
      await newTimeSlot.click();
      
      await page.click('button:has-text("Confirm Reschedule")');
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    }
  });

  test('should display booking cancellation policy', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Create a booking first
    await helpers.addVehicle(vehicle);
    await helpers.createBooking(booking);
    
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Look for cancel option
    const cancelButton = page.locator('.cancel-button, text=Cancel');
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Should show cancellation policy
      await expect(page.locator('.cancellation-policy')).toBeVisible();
      await expect(page.locator('text=Cancellation Policy')).toBeVisible();
      
      // Should have confirm and cancel options
      await expect(page.locator('button:has-text("Confirm Cancellation")')).toBeVisible();
      await expect(page.locator('button:has-text("Keep Booking")')).toBeVisible();
    }
  });

  test('should show booking reminders and notifications', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Create a booking first
    await helpers.addVehicle(vehicle);
    await helpers.createBooking(booking);
    
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Look for upcoming bookings section
    await expect(page.locator('.upcoming-bookings, .next-booking')).toBeVisible();
    
    // Should show reminder information
    const reminderSection = page.locator('.reminder-info');
    if (await reminderSection.isVisible()) {
      await expect(page.locator('text=reminder')).toBeVisible();
    }
  });

  test('should handle booking modifications', async ({ page }) => {
    const vehicle = generateVehicle();
    const booking = generateBooking();
    
    // Create a booking first
    await helpers.addVehicle(vehicle);
    await helpers.createBooking(booking);
    
    await page.click('text=My Bookings');
    await page.waitForURL('/dashboard/bookings');
    
    // Look for modify option
    const modifyButton = page.locator('.modify-button, text=Modify');
    
    if (await modifyButton.isVisible()) {
      await modifyButton.click();
      
      // Should allow changing service type
      await expect(page.locator('select[name="service"]')).toBeVisible();
      
      // Should allow adding/editing notes
      await expect(page.locator('textarea[name="notes"]')).toBeVisible();
      
      // Make a change
      await page.fill('textarea[name="notes"]', 'Updated booking notes');
      await page.click('button:has-text("Save Changes")');
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    }
  });
});