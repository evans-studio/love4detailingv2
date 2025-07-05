import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import vehicleSizeData from '../../../vehicle-size-data.json';

// Size code to label mapping
const sizeMap = {
  'S': 'Small',
  'M': 'Medium',
  'L': 'Large',
  'XL': 'Extra Large'
} as const;

type VehicleSizeCode = keyof typeof sizeMap;
type VehicleSizeLabel = typeof sizeMap[VehicleSizeCode];

interface VehicleSizeResult {
  label: VehicleSizeLabel;
  id: string | null;
  price_pence: number;
  wasFound: boolean;
}

interface VehicleSizeEntry {
  make: string;
  model: string;
  trim: string;
  size: VehicleSizeCode;
}

interface VehicleSize {
  id: string;
  label: string;
  description: string | null;
  price_pence: number;
}

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

    let sizeLabel: VehicleSizeLabel = 'Medium'; // Default size
    let wasFound = false;

    if (matches.length > 0) {
      // If we have matches, use the most common size
      const sizeCounts = matches.reduce((acc, entry) => {
        const size = entry.size.toLowerCase() as VehicleSizeCode;
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {} as Record<VehicleSizeCode, number>);

      // Get the most common size
      const mostCommonSize = Object.entries(sizeCounts)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0] as VehicleSizeCode;

      sizeLabel = sizeMap[mostCommonSize];
      wasFound = true;
    } else {
      // Log the unmatched vehicle for review
      const { error: logError } = await supabase
        .from('missing_vehicle_models')
        .insert({
          make,
          model,
          registration
        });

      if (logError) {
        console.error('Failed to log missing vehicle:', logError);
      }
    }

    // Get the vehicle size ID and price from Supabase
    const { data: sizeData, error: sizeError } = await supabase
      .from('vehicle_sizes')
      .select('id, price_pence')
      .eq('label', sizeLabel)
      .single();

    if (sizeError) {
      console.error('Failed to fetch vehicle size:', sizeError);
      return {
        label: sizeLabel,
        id: null,
        price_pence: sizeLabel === 'Small' ? 4999 :
                     sizeLabel === 'Large' ? 7999 :
                     sizeLabel === 'Extra Large' ? 9999 :
                     5999, // Medium
        wasFound
      };
    }

    return {
      label: sizeLabel,
      id: sizeData.id,
      price_pence: sizeData.price_pence,
      wasFound
    };
  } catch (error) {
    console.error('Error determining vehicle size:', error);
    return {
      label: 'Medium',
      id: null,
      price_pence: 5999, // Default to Medium pricing
      wasFound: false
    };
  }
}

/**
 * Gets the vehicle size from Supabase for a given size label
 */
export async function getVehicleSize(supabase: any, sizeLabel: VehicleSizeLabel): Promise<VehicleSize> {
  const { data, error } = await supabase
    .from('vehicle_sizes')
    .select('id, label, description, price_pence')
    .eq('label', sizeLabel)
    .single();

  if (error) throw error;
  if (!data) throw new Error(`Vehicle size "${sizeLabel}" not found`);

  return data;
}

export async function calculateVehicleSize(
  make: string,
  model: string,
  registration?: string
): Promise<VehicleSize | null> {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Normalize make and model
    const normalizedMake = make.toLowerCase().trim();
    const normalizedModel = model.toLowerCase().trim();

    // Try to find matches in our reference data
    const matches = (vehicleSizeData as VehicleSizeEntry[]).filter(entry => 
      entry.make.toLowerCase() === normalizedMake &&
      entry.model.toLowerCase() === normalizedModel
    );

    // If no match found, log it and return medium size
    if (matches.length === 0) {
      // Log the unmatched vehicle
      await supabase
        .from('missing_vehicle_models')
        .insert({
          make,
          model,
          registration
        });

      // Get medium size
      const { data: mediumSize } = await supabase
        .from('vehicle_sizes')
        .select('id, label, description, price_pence')
        .eq('label', 'Medium')
        .single();

      return mediumSize;
    }

    // Find the most common size among matches
    const sizeCounts = matches.reduce<Record<VehicleSizeCode, number>>((acc, entry) => {
      acc[entry.size] = (acc[entry.size] || 0) + 1;
      return acc;
    }, {} as Record<VehicleSizeCode, number>);

    // Get the most common size
    const mostCommonSize = Object.entries(sizeCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0] as VehicleSizeCode;

    // Get the corresponding size from the database
    const { data: vehicleSize } = await supabase
      .from('vehicle_sizes')
      .select('id, label, description, price_pence')
      .eq('label', sizeMap[mostCommonSize])
      .single();

    return vehicleSize;
  } catch (error) {
    console.error('Error calculating vehicle size:', error);
    return null;
  }
} 