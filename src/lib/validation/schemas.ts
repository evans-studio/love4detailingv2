import { z } from 'zod';

// Common validation patterns
const PHONE_REGEX = /^(?:\+44|0)[1-9]\d{8,9}$/;
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
const VEHICLE_REG_REGEX = /^[A-Z0-9]{2,7}$/i;

// User schemas
export const userSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(PHONE_REGEX, 'Invalid UK phone number'),
});

// Vehicle schemas
export const vehicleSchema = z.object({
  registration: z.string().regex(VEHICLE_REG_REGEX, 'Invalid vehicle registration'),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  color: z.string().min(2, 'Color is required'),
  size: z.enum(['small', 'medium', 'large']),
});

// Booking schemas
export const bookingSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(PHONE_REGEX, 'Invalid UK phone number'),
  registration: z.string().regex(VEHICLE_REG_REGEX, 'Invalid vehicle registration'),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  color: z.string().min(2, 'Color is required'),
  notes: z.string().optional(),
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
export const profileUpdateSchema = userSchema.extend({
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