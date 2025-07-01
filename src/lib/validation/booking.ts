import { z } from 'zod';
import { sizeMap } from '../utils/vehicle-data';

// Vehicle registration input
export const vehicleRegistrationSchema = z.object({
  registration: z.string().min(1, 'Registration is required'),
});

// Vehicle details from DVLA lookup
export const vehicleDetailsSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  registration: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
  fuelType: z.string().optional(),
  vehicleType: z.string().default('Car'),
});

// Personal details
export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postcode: z.string().min(1, 'Postcode is required'),
});

// Vehicle size
export const vehicleSizeSchema = z.object({
  id: z.string().uuid(),
  label: z.enum(['Small', 'Medium', 'Large', 'Extra Large'] as const),
  price_pence: z.number().int().positive(),
});

// Time slot
export const timeSlotSchema = z.object({
  date: z.string(),
  time: z.string(),
  isAvailable: z.boolean(),
});

// Complete booking data
export const bookingSchema = z.object({
  vehicle: vehicleDetailsSchema,
  customer: personalDetailsSchema,
  vehicle_size_id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
  price_snapshot_pence: z.number(),
});

// Types
export type VehicleRegistrationInput = z.infer<typeof vehicleRegistrationSchema>;
export type VehicleDetails = z.infer<typeof vehicleDetailsSchema>;
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;
export type VehicleSize = z.infer<typeof vehicleSizeSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type BookingData = z.infer<typeof bookingSchema>;

// Full booking type with relations
export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  time_slot_id: string;
  vehicle_size_id: string;
  booking_reference: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes?: string;
  created_at: string;
  updated_at: string;
  users?: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address_line1?: string;
    address_line2?: string;
    postcode?: string;
  };
  vehicles?: {
    registration: string;
    make: string;
    model: string;
    year: string;
    color: string;
    size: 'small' | 'medium' | 'large' | 'xl';
  };
  time_slots?: {
    slot_date: string;
    slot_time: string;
  };
  vehicle_sizes?: {
    label: string;
    price_pence: number;
    description: string;
  };
  total_price_pence: number;
} 