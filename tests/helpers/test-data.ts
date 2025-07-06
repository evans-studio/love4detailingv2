import { faker } from '@faker-js/faker';

export interface TestUser {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface TestVehicle {
  registration: string;
  make: string;
  model: string;
  year: string;
  color: string;
}

export interface TestBooking {
  serviceType: string;
  notes?: string;
  date: string;
  time: string;
}

export function generateUser(): TestUser {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }) + 'Aa1!',
    phone: faker.phone.number({ style: 'human' }),
  };
}

export function generateVehicle(): TestVehicle {
  const makes = ['BMW', 'Audi', 'Mercedes', 'Ford', 'Toyota', 'Honda', 'Volkswagen', 'Nissan', 'Mazda', 'Hyundai'];
  
  return {
    registration: `${faker.string.alpha(2).toUpperCase()}${faker.number.int({ min: 10, max: 99 })}${faker.string.alpha(3).toUpperCase()}`,
    make: faker.helpers.arrayElement(makes),
    model: faker.vehicle.model(),
    year: faker.date.past({ years: 10 }).getFullYear().toString(),
    color: faker.color.human(),
  };
}

export function generateBooking(): TestBooking {
  // Updated to match new service configuration - only "Full Valet & Detail" service available
  const services = ['Full Valet & Detail'];
  
  // Generate a future date within the next 30 days
  const futureDate = faker.date.future({ years: 1 });
  
  return {
    serviceType: faker.helpers.arrayElement(services),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
    date: futureDate.toISOString().split('T')[0],
    time: faker.helpers.arrayElement(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']),
  };
}

export function generateUKPostcode(): string {
  const areas = ['SW1', 'EC1', 'W1', 'NW1', 'SE1', 'N1', 'E1', 'WC1'];
  const area = faker.helpers.arrayElement(areas);
  const district = faker.number.int({ min: 1, max: 9 });
  const sector = faker.number.int({ min: 1, max: 9 });
  const unit = faker.string.alpha(2).toUpperCase();
  
  return `${area}${district} ${sector}${unit}`;
}

export function generateAddress() {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    postcode: generateUKPostcode(),
    country: 'United Kingdom',
  };
}

// Test credentials for admin access
export const ADMIN_CREDENTIALS = {
  email: 'zell@love4detailing.com',
  password: process.env.ADMIN_PASSWORD || 'admin-password', // Should be set in env
};

// Common test selectors
export const SELECTORS = {
  // Authentication - Updated to match actual form structure
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  firstNameInput: 'input[name="firstName"]',
  lastNameInput: 'input[name="lastName"]',
  nameInput: 'input[name="firstName"]', // Fallback for single name tests
  phoneInput: 'input[name="phone"]',
  loginButton: 'button[type="submit"]',
  signUpButton: 'button[type="submit"]',
  
  // Navigation
  bookNowButton: 'button:has-text("Book"), a:has-text("Book")',
  dashboardLink: 'text=Dashboard, a[href="/dashboard"]',
  myBookingsLink: 'text=My Bookings, a[href*="bookings"]',
  myVehiclesLink: 'text=My Vehicles, a[href*="vehicles"]',
  profileLink: 'text=Profile, a[href*="profile"]',
  rewardsLink: 'text=Rewards, a[href*="rewards"]',
  
  // Vehicle form - Updated for react-hook-form nested names
  registrationInput: 'input[name="vehicle.registration"]',
  makeSelect: '[data-testid="vehicle-make-select"], button[role="combobox"]:has-text("Select make")',
  modelSelect: '[data-testid="vehicle-model-select"], button[role="combobox"]:has-text("Select model")',
  yearInput: 'input[name="vehicle.year"]',
  colorInput: 'input[name="vehicle.color"]',
  
  // Booking flow - Updated to match actual components
  serviceCard: '[data-testid^="service-card-"]',
  fullValetServiceCard: '[data-testid="service-card-full-valet"]',
  serviceSelect: 'select[name="service"]',
  calendarTile: 'button.react-calendar__tile',
  timeSlotButton: '.time-slot-button',
  bookingForm: '.booking-form',
  bookingSummary: '.booking-summary',
  confirmButton: 'button:has-text("Confirm")',
  nextButton: 'button:has-text("Next")',
  
  // Dashboard
  vehicleCard: '.vehicle-card',
  bookingCard: '.booking-card',
  rewardsSection: '.rewards-section',
  pointsBalance: '.points-balance',
  
  // Admin
  bookingsTable: '.bookings-table',
  usersTable: '.users-table',
  statusFilter: 'select[name="status"]',
  searchInput: 'input[name="search"]',
  bookingDetails: '.booking-details',
  userDetails: '.user-details',
  
  // Mobile
  mobileMenuButton: '.mobile-menu-button',
  mobileSidebarButton: '.mobile-sidebar-button',
  
  // Common
  successMessage: '.success-message',
  errorMessage: '.error-message',
  loadingSpinner: '.loading-spinner',
};