import { createClient } from '@supabase/supabase-js';
import { Database, VehicleSize } from '@/types/database.types';
import vehicleSizeData from '@/data/vehicle-size-data.json';

// Size code to enum mapping (updated for new schema)
const sizeMap = {
  'S': 'small',
  'M': 'medium', 
  'L': 'large',
  'XL': 'extra_large'
} as const;

// Label mapping for display
const sizeLabelMap = {
  'small': 'Small',
  'medium': 'Medium',
  'large': 'Large', 
  'extra_large': 'Extra Large'
} as const;

type VehicleSizeCode = keyof typeof sizeMap;
type VehicleSizeEnum = VehicleSize;

interface VehicleSizeResult {
  size: VehicleSizeEnum;
  label: string;
  price_pence: number;
  duration_minutes: number;
  wasFound: boolean;
}

interface VehicleSizeEntry {
  make: string;
  model: string;
  trim: string;
  size: VehicleSizeCode;
}

interface VehiclePricing {
  price_pence: number;
  duration_minutes: number;
}

// Hardcoded pricing for each vehicle size (fallback if service_pricing query fails)
const DEFAULT_PRICING: Record<VehicleSizeEnum, VehiclePricing> = {
  small: { price_pence: 3500, duration_minutes: 90 },
  medium: { price_pence: 4500, duration_minutes: 120 },
  large: { price_pence: 5500, duration_minutes: 150 },
  extra_large: { price_pence: 6500, duration_minutes: 180 }
};

/**
 * Determine vehicle size based on make and model using our reference data
 * Updated for the new enterprise schema
 */
export async function determineVehicleSize(
  make: string,
  model: string,
  registration?: string
): Promise<VehicleSizeResult> {
  // Normalize input
  const normalizedMake = make.toLowerCase().trim();
  const normalizedModel = model.toLowerCase().trim();

  // Initialize Supabase client
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Find matching entries in the JSON data
    const matches = vehicleSizeData.filter(entry => 
      entry.make.toLowerCase() === normalizedMake &&
      entry.model.toLowerCase() === normalizedModel
    );

    let vehicleSize: VehicleSizeEnum = 'medium'; // Default size
    let wasFound = false;

    if (matches.length > 0) {
      // If we have matches, use the most common size
      const sizeCounts = matches.reduce((acc, entry) => {
        const sizeCode = entry.size as VehicleSizeCode;
        const enumSize = sizeMap[sizeCode];
        acc[enumSize] = (acc[enumSize] || 0) + 1;
        return acc;
      }, {} as Record<VehicleSizeEnum, number>);

      // Get the most common size
      const mostCommonSize = Object.entries(sizeCounts)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0] as VehicleSizeEnum;

      vehicleSize = mostCommonSize;
      wasFound = true;
    } else {
      // Log the unmatched vehicle to vehicle_model_registry for admin review
      try {
        await supabase
          .from('vehicle_model_registry')
          .insert({
            make,
            model,
            default_size: vehicleSize,
            verified: false
          })
          .onConflict('make,model')
          .ignoreDuplicates();
      } catch (logError) {
        console.error('Failed to log unmatched vehicle:', logError);
      }
    }

    // Get pricing from service_pricing table
    const { data: pricingData, error: pricingError } = await supabase
      .from('service_pricing')
      .select('price_pence, duration_minutes')
      .eq('vehicle_size', vehicleSize)
      .single();

    const pricing = pricingError ? DEFAULT_PRICING[vehicleSize] : pricingData;

    return {
      size: vehicleSize,
      label: sizeLabelMap[vehicleSize],
      price_pence: pricing.price_pence,
      duration_minutes: pricing.duration_minutes,
      wasFound
    };
  } catch (error) {
    console.error('Error determining vehicle size:', error);
    const defaultSize: VehicleSizeEnum = 'medium';
    return {
      size: defaultSize,
      label: sizeLabelMap[defaultSize],
      price_pence: DEFAULT_PRICING[defaultSize].price_pence,
      duration_minutes: DEFAULT_PRICING[defaultSize].duration_minutes,
      wasFound: false
    };
  }
}

/**
 * Get pricing for a specific vehicle size from service_pricing table
 */
export async function getVehicleSizePricing(size: VehicleSizeEnum): Promise<VehiclePricing> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { data, error } = await supabase
      .from('service_pricing')
      .select('price_pence, duration_minutes')
      .eq('vehicle_size', size)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Pricing for vehicle size "${size}" not found`);

    return data;
  } catch (error) {
    console.error(`Error fetching pricing for size ${size}:`, error);
    return DEFAULT_PRICING[size];
  }
}

/**
 * Get all available vehicle sizes with pricing
 */
export async function getAllVehicleSizes(): Promise<Array<{
  size: VehicleSizeEnum;
  label: string;
  price_pence: number;
  duration_minutes: number;
}>> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { data: pricingData, error } = await supabase
      .from('service_pricing')
      .select('vehicle_size, price_pence, duration_minutes')
      .eq('is_active', true)
      .order('price_pence');

    if (error) throw error;

    return pricingData.map(item => ({
      size: item.vehicle_size as VehicleSizeEnum,
      label: sizeLabelMap[item.vehicle_size as VehicleSizeEnum],
      price_pence: item.price_pence,
      duration_minutes: item.duration_minutes
    }));
  } catch (error) {
    console.error('Error fetching vehicle sizes:', error);
    // Return default sizes if database query fails
    return Object.entries(DEFAULT_PRICING).map(([size, pricing]) => ({
      size: size as VehicleSizeEnum,
      label: sizeLabelMap[size as VehicleSizeEnum],
      price_pence: pricing.price_pence,
      duration_minutes: pricing.duration_minutes
    }));
  }
}

/**
 * Calculate vehicle size from make/model and return full details
 * Updated for new enterprise schema
 */
export async function calculateVehicleSize(
  make: string,
  model: string,
  registration?: string
): Promise<VehicleSizeResult> {
  return determineVehicleSize(make, model, registration);
}

/**
 * Check if a vehicle exists in the model registry
 */
export async function checkVehicleInRegistry(
  make: string,
  model: string
): Promise<{ size: VehicleSizeEnum; verified: boolean } | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { data, error } = await supabase
      .from('vehicle_model_registry')
      .select('default_size, verified')
      .eq('make', make)
      .eq('model', model)
      .single();

    if (error) return null;

    return {
      size: data.default_size as VehicleSizeEnum,
      verified: data.verified
    };
  } catch (error) {
    console.error('Error checking vehicle registry:', error);
    return null;
  }
}

/**
 * Format vehicle size for display
 */
export function formatVehicleSize(size: VehicleSizeEnum): string {
  return sizeLabelMap[size];
}

/**
 * Format price for display
 */
export function formatPrice(pricePence: number): string {
  return `£${(pricePence / 100).toFixed(2)}`;
}

// Export the mapping objects for use in other components
export { sizeMap, sizeLabelMap, DEFAULT_PRICING };
export type { VehicleSizeResult, VehiclePricing, VehicleSizeEnum };