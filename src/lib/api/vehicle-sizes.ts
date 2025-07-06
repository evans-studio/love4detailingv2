import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { VehicleSize } from '@/types';

export async function getVehicleSizes(): Promise<VehicleSize[]> {
  const supabase = createClientComponentClient<Database>();
  const { data, error } = await supabase
    .from('vehicle_sizes')
    .select('*')
    .order('price_pence');

  if (error) throw error;
  
  return data.map(size => ({
    id: size.id,
    label: size.label,
    price_pence: size.price_pence,
    description: size.description,
  }));
}

export async function getVehicleSizeById(id: string): Promise<VehicleSize> {
  const supabase = createClientComponentClient<Database>();
  const { data, error } = await supabase
    .from('vehicle_sizes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    label: data.label,
    price_pence: data.price_pence,
    description: data.description,
  };
}

export async function getVehicleSizeForType(vehicleType: 'Car' | 'Van' | 'Motorcycle'): Promise<VehicleSize> {
  const supabase = createClientComponentClient<Database>();
  // Map vehicle types to size categories
  const sizeMap = {
    'Car': 'Medium',
    'Van': 'Large',
    'Motorcycle': 'Small',
  };

  const { data, error } = await supabase
    .from('vehicle_sizes')
    .select('*')
    .eq('label', sizeMap[vehicleType])
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    label: data.label,
    price_pence: data.price_pence,
    description: data.description,
  };
} 