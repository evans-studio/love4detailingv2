import { Page, expect } from '@playwright/test';
import { ADMIN_CREDENTIALS, SELECTORS, TestUser, TestVehicle, TestBooking } from './test-data';

export class TestHelpers {
  constructor(private page: Page) {}

  // Authentication helpers
  async login(email: string, password: string) {
    await this.page.goto('/auth/sign-in');
    await this.page.fill(SELECTORS.emailInput, email);
    await this.page.fill(SELECTORS.passwordInput, password);
    await this.page.click(SELECTORS.loginButton);
    await this.page.waitForURL('/dashboard');
  }

  async loginAsAdmin() {
    await this.page.goto('/auth/sign-in');
    
    // Use admin credentials from setup script
    const testEmail = 'zell@love4detailing.com';
    const testPassword = 'Love4Detailing2025!';
    
    await this.page.fill(SELECTORS.emailInput, testEmail);
    await this.page.fill(SELECTORS.passwordInput, testPassword);
    await this.page.click(SELECTORS.loginButton);
    await this.page.waitForURL('/admin', { timeout: 15000 });
  }

  async registerUser(user: TestUser) {
    await this.page.goto('/auth/sign-up');
    
    // Split the full name into first and last name
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await this.page.fill(SELECTORS.firstNameInput, firstName);
    await this.page.fill(SELECTORS.lastNameInput, lastName);
    await this.page.fill(SELECTORS.emailInput, user.email);
    await this.page.fill(SELECTORS.passwordInput, user.password);
    await this.page.fill('input[name="confirmPassword"]', user.password);
    await this.page.click(SELECTORS.signUpButton);
    await this.page.waitForURL('/auth/verify-email', { timeout: 10000 });
  }

  async logout() {
    // Look for user menu or logout button
    await this.page.click('.user-menu-button');
    await this.page.click('text=Logout');
    await this.page.waitForURL('/');
  }

  // Navigation helpers
  async navigateToBooking() {
    await this.page.click(SELECTORS.bookNowButton);
    await this.page.waitForURL('/booking');
  }

  async navigateToDashboard() {
    await this.page.click(SELECTORS.dashboardLink);
    await this.page.waitForURL('/dashboard');
  }

  async navigateToMyBookings() {
    await this.page.click(SELECTORS.myBookingsLink);
    await this.page.waitForURL('/dashboard/bookings');
  }

  async navigateToMyVehicles() {
    await this.page.click(SELECTORS.myVehiclesLink);
    await this.page.waitForURL('/dashboard/vehicles');
  }

  async navigateToProfile() {
    await this.page.click(SELECTORS.profileLink);
    await this.page.waitForURL('/dashboard/profile');
  }

  async navigateToRewards() {
    await this.page.click(SELECTORS.rewardsLink);
    await this.page.waitForURL('/dashboard/rewards');
  }

  // Vehicle management helpers
  async addVehicle(vehicle: TestVehicle) {
    await this.navigateToMyVehicles();
    await this.page.click('text=Add Vehicle');
    
    await this.page.fill(SELECTORS.registrationInput, vehicle.registration);
    await this.page.fill(SELECTORS.makeInput, vehicle.make);
    await this.page.fill(SELECTORS.modelInput, vehicle.model);
    await this.page.fill(SELECTORS.yearInput, vehicle.year);
    await this.page.fill(SELECTORS.colorInput, vehicle.color);
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForSelector(SELECTORS.successMessage);
  }

  async deleteVehicle(registration: string) {
    await this.navigateToMyVehicles();
    await this.page.click(`[data-registration="${registration}"] .delete-button`);
    await this.page.click('text=Confirm');
    await this.page.waitForSelector(SELECTORS.successMessage);
  }

  // Booking helpers
  async createBooking(booking: TestBooking, vehicle?: TestVehicle) {
    await this.navigateToBooking();
    
    // If vehicle provided, fill vehicle details
    if (vehicle) {
      await this.page.fill(SELECTORS.registrationInput, vehicle.registration);
      await this.page.fill(SELECTORS.makeInput, vehicle.make);
      await this.page.fill(SELECTORS.modelInput, vehicle.model);
      await this.page.fill(SELECTORS.yearInput, vehicle.year);
      await this.page.fill(SELECTORS.colorInput, vehicle.color);
    }
    
    // Select service
    await this.page.selectOption(SELECTORS.serviceSelect, booking.serviceType);
    
    // Select date
    await this.page.click(`text=${booking.date}`);
    
    // Select time
    await this.page.click(`text=${booking.time}`);
    
    // Add notes if provided
    if (booking.notes) {
      await this.page.fill('textarea[name="notes"]', booking.notes);
    }
    
    // Confirm booking
    await this.page.click(SELECTORS.confirmButton);
    await this.page.waitForSelector(SELECTORS.successMessage);
  }

  async cancelBooking(bookingId: string) {
    await this.navigateToMyBookings();
    await this.page.click(`[data-booking-id="${bookingId}"] .cancel-button`);
    await this.page.click('text=Confirm Cancellation');
    await this.page.waitForSelector(SELECTORS.successMessage);
  }

  // Validation helpers
  async expectToBeLoggedIn() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async expectToBeLoggedOut() {
    await expect(this.page).toHaveURL('/');
  }

  async expectSuccessMessage(message?: string) {
    await expect(this.page.locator(SELECTORS.successMessage)).toBeVisible();
    if (message) {
      await expect(this.page.locator(SELECTORS.successMessage)).toContainText(message);
    }
  }

  async expectErrorMessage(message?: string) {
    await expect(this.page.locator(SELECTORS.errorMessage)).toBeVisible();
    if (message) {
      await expect(this.page.locator(SELECTORS.errorMessage)).toContainText(message);
    }
  }

  async expectVehicleInList(vehicle: TestVehicle) {
    await this.navigateToMyVehicles();
    await expect(this.page.locator(`text=${vehicle.registration}`)).toBeVisible();
    await expect(this.page.locator(`text=${vehicle.make} ${vehicle.model}`)).toBeVisible();
  }

  async expectBookingInHistory(booking: TestBooking) {
    await this.navigateToMyBookings();
    await expect(this.page.locator(`text=${booking.serviceType}`)).toBeVisible();
    await expect(this.page.locator(`text=${booking.date}`)).toBeVisible();
  }

  // Admin helpers
  async viewAllBookings() {
    await this.page.click('text=All Bookings');
    await this.page.waitForSelector(SELECTORS.bookingsTable);
  }

  async searchBookings(query: string) {
    await this.page.fill(SELECTORS.searchInput, query);
    await this.page.press(SELECTORS.searchInput, 'Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterBookingsByStatus(status: string) {
    await this.page.selectOption(SELECTORS.statusFilter, status);
    await this.page.waitForLoadState('networkidle');
  }

  async updateBookingStatus(bookingId: string, status: string) {
    await this.page.click(`[data-booking-id="${bookingId}"] .status-dropdown`);
    await this.page.click(`text=${status}`);
    await this.page.waitForSelector(SELECTORS.successMessage);
  }

  // Mobile helpers
  async openMobileMenu() {
    await this.page.click(SELECTORS.mobileMenuButton);
    await this.page.waitForSelector('.mobile-menu');
  }

  async closeMobileMenu() {
    await this.page.click('.mobile-menu-close');
    await this.page.waitForSelector('.mobile-menu', { state: 'hidden' });
  }

  // Wait helpers
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForAnimation() {
    await this.page.waitForTimeout(500);
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `temp_docs/test-screenshots/${name}.png` });
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const start = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - start;
  }

  // Accessibility helpers
  async checkAccessibility() {
    // Check for alt text on images
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt) {
        console.warn('Image without alt text found');
      }
    }

    // Check for proper heading hierarchy
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    if (headings.length > 0) {
      const firstHeading = headings[0];
      const tagName = await firstHeading.evaluate(el => el.tagName);
      if (tagName !== 'H1') {
        console.warn('Page does not start with H1 heading');
      }
    }
  }
}