import { NextRequest, NextResponse } from 'next/server';

// Configure route as dynamic
export const dynamic = 'force-dynamic';

// HQ postcode for distance calculation
const HQ_POSTCODE = 'AL1 1AA'; // Replace with actual HQ postcode
const MAX_DISTANCE_MILES = 10;

interface PostcodeData {
  latitude: number;
  longitude: number;
  postcode: string;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get postcode data from postcodes.io
async function getPostcodeData(postcode: string): Promise<PostcodeData | null> {
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (data.status === 200 && data.result) {
      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
        postcode: data.result.postcode,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching postcode data:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = searchParams.get('postcode');

    if (!postcode) {
      return NextResponse.json(
        { error: 'Postcode parameter is required' },
        { status: 400 }
      );
    }

    // Get HQ coordinates
    const hqData = await getPostcodeData(HQ_POSTCODE);
    if (!hqData) {
      return NextResponse.json(
        { error: 'Unable to get HQ location data' },
        { status: 500 }
      );
    }

    // Get customer postcode coordinates
    const customerData = await getPostcodeData(postcode);
    if (!customerData) {
      return NextResponse.json(
        { error: 'Invalid postcode or unable to get location data' },
        { status: 400 }
      );
    }

    // Calculate distance
    const distance = calculateDistance(
      hqData.latitude,
      hqData.longitude,
      customerData.latitude,
      customerData.longitude
    );

    const isOverLimit = distance > MAX_DISTANCE_MILES;
    
    return NextResponse.json({
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      isOverLimit,
      warning: isOverLimit 
        ? `Your location is ${Math.round(distance)} miles from our base. Additional travel charges may apply.`
        : undefined,
    });

  } catch (error) {
    console.error('Distance check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}