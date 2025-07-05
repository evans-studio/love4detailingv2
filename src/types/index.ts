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

// Time Slot Enhancement Types
export interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  is_booked: boolean;
  created_at: string;
}

export interface DailyAvailability {
  id: string;
  date: string;
  available_slots: number;
  working_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyScheduleTemplate {
  id: string;
  day_of_week: number;
  max_slots: number;
  working_day: boolean;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface TimeSlotWithAvailability extends TimeSlot {
  slot_number: number;
  buffer_minutes: number;
  is_available: boolean;
  booking_count?: number;
}

export interface AvailabilityCalendarDay {
  date: string;
  dayName: string;
  dayNumber: number;
  isWorkingDay: boolean;
  availableSlots: number;
  maxSlots: number;
  slots: {
    slot_number: number;
    time: string;
    status: 'available' | 'booked' | 'unavailable';
    booking?: {
      id: string;
      customer_name: string;
      reference: string;
    };
  }[];
}

export interface SlotGenerationResult {
  generated_date: string;
  generated_slots: number;
  message: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 6=Saturday

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday', 
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

export const SLOT_TIMES: Record<number, { time: string; display: string }> = {
  1: { time: '10:00:00', display: '10:00 AM - 11:00 AM' },
  2: { time: '11:30:00', display: '11:30 AM - 12:30 PM' },
  3: { time: '13:00:00', display: '1:00 PM - 2:00 PM' },
  4: { time: '14:30:00', display: '2:30 PM - 3:30 PM' },
  5: { time: '16:00:00', display: '4:00 PM - 5:00 PM' }
}; 