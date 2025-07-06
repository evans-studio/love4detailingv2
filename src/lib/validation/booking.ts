import { z } from 'zod';
import { sizeMap } from '../utils/vehicle-data';
import type { DbVehicleSize, DbBooking } from '@/types';

// Additional regex patterns for unified form
const PHONE_REGEX = /^(?:(?:\+44)|(?:0))(?:(?:(?:\d{10})|(?:\d{9})|(?:\d{8})|(?:\d{7})|(?:\d{6})|(?:\d{5})))$/;
const POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
// UK vehicle registration patterns (supports various formats including spaces)
const VEHICLE_REG_REGEX = /^[A-Z0-9\s]{2,10}$/i;

// Vehicle registration input
export const vehicleRegistrationSchema = z.object({
  registration: z.string().min(1, 'Registration is required'),
});

// Vehicle details
export const vehicleDetailsSchema = z.object({
  registration: z.string().min(1, 'Registration is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().min(1, 'Year is required'),
  color: z.string().min(1, 'Color is required'),
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
  label: z.enum(Object.values(sizeMap) as [string, ...string[]]),
  price_pence: z.number().int().positive(),
  description: z.string().optional(),
});

// Time slot
export const timeSlotSchema = z.object({
  id: z.string().uuid(),
  slot_date: z.string(),
  slot_time: z.string(),
  is_available: z.boolean(),
});

// Complete booking data
export const bookingSchema = z.object({
  vehicle: vehicleDetailsSchema,
  customer: personalDetailsSchema,
  vehicle_size_id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
  price_snapshot_pence: z.number(),
  isAuthenticated: z.boolean().optional(),
});

// Types
export type VehicleRegistrationInput = z.infer<typeof vehicleRegistrationSchema>;
export type VehicleDetails = z.infer<typeof vehicleDetailsSchema>;
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;
export type VehicleSize = DbVehicleSize;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type BookingData = z.infer<typeof bookingSchema>;

// Extended booking type with relations
export interface BookingWithRelations extends DbBooking {
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
}

// Unified booking form schema for single-form flow
export const unifiedBookingSchema = z.object({
  // Step 1: Service Selection
  service: z.object({
    serviceId: z.string().min(1, 'Service is required'),
    serviceName: z.string().min(1, 'Service name is required'),
  }),
  
  // Step 2: Vehicle Info
  vehicle: z.object({
    make: z.string().min(1, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    registration: z.string()
      .min(2, 'Registration is required')
      .max(10, 'Registration is too long')
      .regex(VEHICLE_REG_REGEX, 'Registration must contain only letters, numbers, and spaces'),
    year: z.string().optional(),
    color: z.string().optional(),
    sizeId: z.string().min(1, 'Vehicle size is required'),
    size: z.string().min(1, 'Vehicle size is required'),
  }),
  
  // Step 3: Personal Details
  personalDetails: z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(PHONE_REGEX, 'Invalid UK phone number'),
    postcode: z.string().regex(POSTCODE_REGEX, 'Invalid UK postcode'),
    photos: z.array(z.object({
      file: z.any(),
      preview: z.string(),
      id: z.string(),
    })).max(3, 'Maximum 3 photos allowed').optional(),
  }),
  
  // Step 4: Date & Time
  dateTime: z.object({
    timeSlotId: z.string().min(1, 'Time slot is required'),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
  }),
  
  // Internal fields
  currentStep: z.number().min(1).max(5).default(1),
  vehicleSizeId: z.string().optional(),
  totalPrice: z.number().optional(),
  distanceWarning: z.boolean().default(false),
});

export type UnifiedBookingForm = z.infer<typeof unifiedBookingSchema>;

// Individual step schemas for validation
export const serviceStepSchema = unifiedBookingSchema.pick({ service: true });
export const vehicleStepSchema = unifiedBookingSchema.pick({ vehicle: true });
export const personalDetailsStepSchema = unifiedBookingSchema.pick({ personalDetails: true });
export const dateTimeStepSchema = unifiedBookingSchema.pick({ dateTime: true });

// Vehicle data types from JSON
export interface VehicleData {
  make: string;
  model: string;
  trim: string;
  size: 'S' | 'M' | 'L' | 'XL';
}

// Photo upload type
export interface PhotoUpload {
  file: File;
  preview: string;
  id: string;
}

// Postcode distance response
export interface PostcodeDistanceResponse {
  distance: number;
  isOverLimit: boolean;
  warning?: string;
} 