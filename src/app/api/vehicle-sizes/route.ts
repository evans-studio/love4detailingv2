import { NextResponse } from 'next/server';

// Vehicle sizes are now determined dynamically from JSON detection
// Return the standard size categories with pricing
const VEHICLE_SIZES = [
  {
    id: 'small',
    label: 'Small',
    description: 'Compact cars, hatchbacks',
    price_pence: 3500, // £35
  },
  {
    id: 'medium', 
    label: 'Medium',
    description: 'Saloons, small SUVs',
    price_pence: 4500, // £45
  },
  {
    id: 'large',
    label: 'Large', 
    description: 'Large SUVs, estates',
    price_pence: 5500, // £55
  },
  {
    id: 'extra_large',
    label: 'Extra Large',
    description: 'Vans, large trucks',
    price_pence: 6500, // £65
  }
];

export async function GET() {
  try {
    // Return static vehicle sizes since we now use JSON-based detection
    return NextResponse.json(VEHICLE_SIZES);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}