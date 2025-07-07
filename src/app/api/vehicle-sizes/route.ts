import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { getAllVehicleSizes } from '@/lib/utils/vehicle-size';

// Configure route as dynamic for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get vehicle sizes with pricing from the service_pricing table
    const vehicleSizes = await getAllVehicleSizes();
    
    // Format for API response with backward compatibility
    const formattedSizes = vehicleSizes.map(size => ({
      id: size.size,
      label: size.label,
      description: getVehicleDescription(size.size),
      price_pence: size.price_pence,
      duration_minutes: size.duration_minutes
    }));

    return NextResponse.json(formattedSizes);
  } catch (error) {
    console.error('API error:', error);
    
    // Fallback to static data if database query fails
    const fallbackSizes = [
      {
        id: 'small',
        label: 'Small',
        description: 'Compact cars, hatchbacks (e.g., Toyota Aygo, Peugeot 107)',
        price_pence: 3500,
        duration_minutes: 90
      },
      {
        id: 'medium', 
        label: 'Medium',
        description: 'Saloons, small SUVs (e.g., Ford Focus, VW Golf)',
        price_pence: 4500,
        duration_minutes: 120
      },
      {
        id: 'large',
        label: 'Large', 
        description: 'Large cars, SUVs (e.g., BMW 5 Series, Mercedes C-Class)',
        price_pence: 5500,
        duration_minutes: 150
      },
      {
        id: 'extra_large',
        label: 'Extra Large',
        description: 'Large SUVs, vans, commercial vehicles',
        price_pence: 6500,
        duration_minutes: 180
      }
    ];
    
    return NextResponse.json(fallbackSizes);
  }
}

function getVehicleDescription(size: string): string {
  const descriptions = {
    small: 'Compact cars, hatchbacks (e.g., Toyota Aygo, Peugeot 107)',
    medium: 'Saloons, small SUVs (e.g., Ford Focus, VW Golf)',
    large: 'Large cars, SUVs (e.g., BMW 5 Series, Mercedes C-Class)', 
    extra_large: 'Large SUVs, vans, commercial vehicles'
  };
  
  return descriptions[size as keyof typeof descriptions] || 'Standard vehicle';
}