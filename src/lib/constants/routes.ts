export const ROUTES = {
  // Public Routes
  HOME: '/',
  BOOK: '/book',
  CONFIRMATION: '/confirmation',

  // Auth Routes
  SIGN_IN: '/auth/sign-in',
  SIGN_UP: '/auth/sign-up',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',

  // Dashboard Routes
  DASHBOARD: '/dashboard',
  DASHBOARD_BOOK: '/dashboard/book',
  DASHBOARD_BOOKINGS: '/dashboard/bookings',
  DASHBOARD_PROFILE: '/dashboard/profile',
  DASHBOARD_REWARDS: '/dashboard/rewards',

  // API Routes
  API_BOOKINGS: '/api/bookings',
} as const;

// Helper type for type-safe route access
export type AppRoutes = typeof ROUTES; 