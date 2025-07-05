import { z } from 'zod';

export const vehicleSchema = z.object({
  registration: z
    .string()
    .min(2, 'Registration is required')
    .max(10, 'Registration is too long')
    .transform(val => val.toUpperCase()),
  make: z
    .string()
    .min(1, 'Make is required')
    .max(50, 'Make is too long'),
  model: z
    .string()
    .min(1, 'Model is required')
    .max(50, 'Model is too long'),
  year: z
    .string()
    .min(4, 'Year must be 4 digits')
    .max(4, 'Year must be 4 digits')
    .regex(/^\d{4}$/, 'Year must be a valid 4-digit year'),
  color: z
    .string()
    .min(1, 'Color is required')
    .max(30, 'Color is too long'),
}); 