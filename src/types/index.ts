import type { Database } from './supabase';
import type { ComponentType } from 'react';

// Database Types
export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type EmailLog = Database['public']['Tables']['email_logs']['Row'];

// Form Types
export interface BookingFormData {
  date: string;
  timeSlot: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  make: string;
  model: string;
  registration: string;
  size: 'small' | 'medium' | 'large';
  notes?: string;
}

export interface PaymentFormData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  name: string;
  email: string;
}

// Payment Types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  clientSecret: string;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export interface PaymentError {
  code: string;
  message: string;
  declineCode?: string;
}

export interface PaymentResult {
  success: boolean;
  error?: PaymentError;
  paymentIntent?: PaymentIntent;
}

export interface PaymentMethodDetails {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface RefundResult {
  success: boolean;
  error?: string;
  amount?: number;
  currency?: string;
  status?: 'succeeded' | 'pending' | 'failed';
}

// Extended Types
export interface BookingWithPayment extends Booking {
  payment?: Payment;
}

export interface UserProfile extends User {
  rewards?: {
    points: number;
    tier: 'bronze' | 'silver' | 'gold';
  };
}

// Navigation Types
export type NavItem = {
  label: string;
  href: string;
  icon?: ComponentType;
  children?: NavItem[];
};

// Route Types
export type AppRoute = typeof import('../lib/constants/routes').ROUTES[keyof typeof import('../lib/constants/routes').ROUTES];

// Theme Types
export type ThemeColor = typeof import('../lib/theme/tokens').COLORS;
export type Typography = typeof import('../lib/theme/tokens').TYPOGRAPHY;
export type Breakpoint = typeof import('../lib/theme/tokens').BREAKPOINTS;
export type Spacing = typeof import('../lib/theme/tokens').SPACING;

// Vehicle Types
export type Vehicle = {
  id?: string;
  registration: string;
  make: string;
  model: string;
  year: string;
  color: string;
  size: 'small' | 'medium' | 'large' | 'xl';
};

// Service Types
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number; // in pence
  duration: string;
  includes: string[];
  vehicleSizes: ('small' | 'medium' | 'large')[];
  image?: string;
}

// Rewards Types
export interface RewardsTier {
  name: string;
  points: number;
  benefits: string[];
  icon: any; // Replace with proper icon type when using specific icon library
  color: string;
  bgColor: string;
}

export interface UserRewards {
  userId: string;
  points: number;
  tier: string;
  history: RewardTransaction[];
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  booking_id: string;
  points: number;
  type: 'earned' | 'redeemed';
  description: string;
  created_at: string;
}

// Navigation Types
export interface NavigationItem {
  name: string;
  href: string;
  icon?: any; // Replace with proper icon type when using specific icon library
  current?: boolean;
}

// Theme Types
export interface ThemeColors {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  state: {
    error: string;
    success: string;
    warning: string;
    info: string;
  };
}

// Database Types (for Supabase)
export type Tables = {
  users: User;
  vehicles: Vehicle;
  bookings: Booking;
  rewards: UserRewards;
  reward_transactions: RewardTransaction;
}

// Utility Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'; 