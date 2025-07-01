import { supabase } from '@/lib/api/supabase';
import type { VehicleSize } from '@/lib/validation/booking';

export async function getVehicleSizes(): Promise<VehicleSize[]> {
  const { data, error } = await supabase
    .from('vehicle_sizes')
    .select('*')
    .order('price_pence');

  if (error) throw error;
  
  return data.map(size => ({
    id: size.id,
    label: size.label,
    price_pence: size.price_pence,
  }));
}

export async function getVehicleSizeById(id: string): Promise<VehicleSize> {
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
  };
}

export async function getVehicleSizeForType(vehicleType: 'Car' | 'Van' | 'Motorcycle'): Promise<VehicleSize> {
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
  };
} 