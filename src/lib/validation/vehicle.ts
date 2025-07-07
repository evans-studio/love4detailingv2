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
    .number()
    .min(1950, 'Year must be after 1950')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future')
    .optional(),
  color: z
    .string()
    .min(1, 'Color is required')
    .max(30, 'Color is too long')
    .optional(),
  size: z
    .enum(['small', 'medium', 'large', 'extra_large'])
    .optional(),
  vehicle_type: z
    .string()
    .max(50, 'Vehicle type is too long')
    .optional(),
  special_requirements: z
    .string()
    .max(500, 'Special requirements text is too long')
    .optional(),
});

export const vehiclePhotoSchema = z.object({
  vehicle_id: z.string().uuid('Invalid vehicle ID'),
  photo_url: z.string().url('Invalid photo URL'),
  is_primary: z.boolean().optional().default(false),
});

export const vehicleUpdateSchema = vehicleSchema.partial();

export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type VehiclePhotoData = z.infer<typeof vehiclePhotoSchema>;
export type VehicleUpdateData = z.infer<typeof vehicleUpdateSchema>; 