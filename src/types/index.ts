import type { Database } from './supabase';
import type { ComponentType } from 'react';

// Database Types
export type DbUser = Database['public']['Tables']['users']['Row'];
export type DbVehicle = Database['public']['Tables']['vehicles']['Row'];
export type DbBooking = Database['public']['Tables']['bookings']['Row'];
export type DbVehicleSize = Database['public']['Tables']['vehicle_sizes']['Row'];
export type DbTimeSlot = Database['public']['Tables']['time_slots']['Row'];
export type DbReward = Database['public']['Tables']['rewards']['Row'];
export type DbRewardTransaction = Database['public']['Tables']['reward_transactions']['Row'];
export type DbAdminNote = Database['public']['Tables']['admin_notes']['Row'];
export type DbMissingVehicleModel = Database['public']['Tables']['missing_vehicle_models']['Row'];

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

// Extended Types
export interface BookingWithPayment extends DbBooking {
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
  };
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
  | 'paid'
  | 'failed'
  | 'refunded';

export interface PaymentError {
  code: string;
  message: string;
  decline_code?: string;
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

// Rewards Types
export interface RewardsTier {
  id: string;
  name: string;
  points: number;
  benefits: string[];
  icon: string;
  color: string;
  bgColor: string;
}

export interface UserRewards {
  user_id: string;
  currentPoints: number;
  lifetimePoints: number;
  availableRewards: number;
  currentTier: RewardsTier;
  rewardsHistory: DbRewardTransaction[];
}

// User Types
export interface PersonalDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
}

export interface ExtendedUserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  created_at: string;
  updated_at: string;
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

// Form Types
export interface VehicleFormData {
  registration: string;
  make: string;
  model: string;
  year: string;
  color: string;
  size: 'small' | 'medium' | 'large' | 'xl';
}

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

// Navigation Types
export interface NavigationItem {
  name: string;
  href: string;
  icon?: any; // Replace with proper icon type when using specific icon library
  current?: boolean;
}

// Utility Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Vehicle Types
export interface VehicleDetails {
  registration: string;
  make: string;
  model: string;
  year: number;
  color: string;
  size_id: string;
}

export interface VehicleSize {
  id: string;
  label: string;
  description: string;
  price_pence: number;
}

// Booking Types
export interface Booking {
  id: string;
  user_id: string | null;
  vehicle_id: string;
  time_slot_id: string;
  vehicle_size_id: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  total_price_pence: number;
  booking_reference: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
  vehicles?: {
    make: string;
    model: string;
    registration: string;
    vehicle_sizes: {
      label: string;
      price_pence: number;
    };
  };
  time_slots?: {
    slot_date: string;
    slot_time: string;
  };
}

export interface BookingFormData {
  vehicle_id: string;
  time_slot_id: string;
  vehicle_size_id: string;
  date: string;
  timeSlot: string;
  price_snapshot_pence: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  isAuthenticated?: boolean;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'; 