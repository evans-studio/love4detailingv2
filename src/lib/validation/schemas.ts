import { z } from 'zod';

// Regex patterns
const PHONE_REGEX = /^(?:(?:\+44)|(?:0))(?:(?:(?:\d{10})|(?:\d{9})|(?:\d{8})|(?:\d{7})|(?:\d{6})|(?:\d{5})))$/;
const VEHICLE_REG_REGEX = /^[A-Z0-9]{2,8}$/;
const POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

// Vehicle schemas
export const vehicleDetailsSchema = z.object({
  registration: z.string().regex(VEHICLE_REG_REGEX, 'Invalid vehicle registration'),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  color: z.string().min(2, 'Color is required'),
  size_id: z.string().uuid('Invalid vehicle size ID'),
});

// Personal details schema
export const personalDetailsSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(PHONE_REGEX, 'Invalid UK phone number'),
  address_line1: z.string().min(5, 'Address line 1 is required'),
  address_line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  postcode: z.string().regex(POSTCODE_REGEX, 'Invalid UK postcode'),
});

// Booking schemas
export const bookingSchema = z.object({
  vehicle: vehicleDetailsSchema,
  customer: personalDetailsSchema,
  vehicle_size_id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
  price_snapshot_pence: z.number(),
});

// Time slot schema
export const timeSlotSchema = z.object({
  id: z.string().uuid(),
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  slot_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  is_available: z.boolean(),
});

// Vehicle size schema
export const vehicleSizeSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(2, 'Label is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price_pence: z.number().min(0, 'Price cannot be negative'),
});

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

// Profile schemas
export const profileUpdateSchema = personalDetailsSchema.extend({
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    marketing: z.boolean(),
  }),
});

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  email: z.object({
    bookingConfirmations: z.boolean(),
    reminders: z.boolean(),
    statusUpdates: z.boolean(),
    marketing: z.boolean(),
  }),
  sms: z.object({
    bookingConfirmations: z.boolean(),
    reminders: z.boolean(),
    statusUpdates: z.boolean(),
  }),
});

// Helper function to create form error messages
export const getFieldErrorMessage = (error: z.ZodError, field: string): string | undefined => {
  return error.errors.find(err => err.path[0] === field)?.message;
};

// Vehicle Registration Schema
export const vehicleRegistrationSchema = z.object({
  registration: z.string()
    .min(2, 'Registration number is required')
    .max(10, 'Registration number is too long')
    .regex(/^[A-Z0-9]+$/, 'Registration must contain only uppercase letters and numbers'),
});

// User Contact Schema
export const userContactSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[0-9+\s-()]+$/, 'Invalid phone number format'),
});

// Service Schema
export const serviceSchema = z.object({
  name: z.string().min(2, 'Service name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  duration: z.number().min(30, 'Duration must be at least 30 minutes'),
  basePrice: z.number().min(0, 'Base price cannot be negative'),
  priceMultipliers: z.object({
    small: z.number().min(0),
    medium: z.number().min(0),
    large: z.number().min(0),
    xl: z.number().min(0),
  }),
}); 