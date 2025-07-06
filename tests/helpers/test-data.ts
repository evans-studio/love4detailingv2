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
  const services = ['Interior & Exterior Detail', 'Exterior Detail Only', 'Interior Detail Only', 'Mini Valet'];
  
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
  // Authentication
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  nameInput: 'input[name="name"]',
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
  
  // Vehicle form
  registrationInput: 'input[name="registration"]',
  makeInput: 'input[name="make"]',
  modelInput: 'input[name="model"]',
  yearInput: 'input[name="year"]',
  colorInput: 'input[name="color"]',
  
  // Booking flow
  serviceSelect: 'select[name="service"]',
  calendarTile: 'button.react-calendar__tile',
  timeSlotButton: '.time-slot-button',
  bookingForm: '.booking-form',
  bookingSummary: '.booking-summary',
  confirmButton: 'button:has-text("Confirm")',
  
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