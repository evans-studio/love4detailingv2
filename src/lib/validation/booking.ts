import { z } from 'zod';
import { sizeMap } from '../utils/vehicle-data';
import type { Booking } from '@/types';

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
  year: z.number().min(1950).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  size: z.enum(['small', 'medium', 'large', 'extra_large']).optional(),
  vehicle_type: z.string().optional(),
  special_requirements: z.string().optional(),
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

// Vehicle size (now simplified as enum)
export const vehicleSizeSchema = z.object({
  id: z.enum(['small', 'medium', 'large', 'extra_large']),
  label: z.string(),
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
  serviceId: z.string().uuid(),
  slotId: z.string().uuid(),
  vehicleData: vehicleDetailsSchema,
  customerDetails: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number is required'),
    serviceAddress: z.string().min(10, 'Service address is required'),
  }),
  totalPricePence: z.number().positive(),
  isAuthenticated: z.boolean().optional(),
});

// Types
export type VehicleRegistrationInput = z.infer<typeof vehicleRegistrationSchema>;
export type VehicleDetails = z.infer<typeof vehicleDetailsSchema>;
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;
export type VehicleSize = z.infer<typeof vehicleSizeSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type BookingData = z.infer<typeof bookingSchema>;

// Enhanced booking schemas for new database structure
export const bookingNoteSchema = z.object({
  booking_id: z.string().uuid(),
  author_id: z.string().uuid().optional(),
  note_type: z.enum(['internal', 'customer', 'system']),
  content: z.string().min(1, 'Note content is required'),
  is_visible_to_customer: z.boolean().default(false),
});

export const scheduleTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const scheduleSlotSchema = z.object({
  template_id: z.string().uuid(),
  day_of_week: z.number().min(0).max(6), // 0=Sunday, 6=Saturday
  start_time: z.string(), // HH:MM format
  end_time: z.string(), // HH:MM format
  max_bookings: z.number().min(1).default(1),
  is_active: z.boolean().default(true),
});

// Enhanced booking with new fields
export const enhancedBookingSchema = bookingSchema.extend({
  internal_notes: z.string().optional(),
  customer_instructions: z.string().optional(),
  estimated_duration_minutes: z.number().optional(),
  actual_duration_minutes: z.number().optional(),
  service_location: z.string().optional(),
});

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
    year: z.number().min(1950).max(new Date().getFullYear() + 1).optional(),
    color: z.string().optional(),
    size: z.enum(['small', 'medium', 'large', 'extra_large']),
    vehicle_type: z.string().optional(),
    special_requirements: z.string().optional(),
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

// New types for enhanced schemas
export type BookingNoteData = z.infer<typeof bookingNoteSchema>;
export type ScheduleTemplateData = z.infer<typeof scheduleTemplateSchema>;
export type ScheduleSlotData = z.infer<typeof scheduleSlotSchema>;
export type EnhancedBookingData = z.infer<typeof enhancedBookingSchema>;

// Individual step schemas for validation
export const serviceStepSchema = unifiedBookingSchema.pick({ service: true });
export const vehicleStepSchema = unifiedBookingSchema.pick({ vehicle: true });
export const personalDetailsStepSchema = unifiedBookingSchema.pick({ personalDetails: true });
export const dateTimeStepSchema = unifiedBookingSchema.pick({ dateTime: true });

// Vehicle data types aligned with new database structure
export interface VehicleData {
  make: string;
  model: string;
  trim?: string;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  vehicle_type?: string;
  special_requirements?: string;
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