import { NextRequest, NextResponse } from 'next/server'

// SW9 base location coordinates (Stockwell, London)
const SW9_COORDINATES = {
  latitude: 51.4815,
  longitude: -0.1223
}

// Service area configuration
const SERVICE_CONFIG = {
  standardRadius: 10, // miles
  maxServiceRadius: 25, // miles
  travelChargeRates: {
    '10-15': 10, // £10 for 10-15 miles
    '15-20': 15, // £15 for 15-20 miles
    '20-25': 20, // £20 for 20-25 miles
  }
}

interface PostcodeCoordinates {
  latitude: number
  longitude: number
}

// Haversine formula for calculating distance between two points
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Calculate travel charge based on distance
function calculateTravelCharge(distance: number): number {
  if (distance <= SERVICE_CONFIG.standardRadius) {
    return 0
  } else if (distance <= 15) {
    return SERVICE_CONFIG.travelChargeRates['10-15']
  } else if (distance <= 20) {
    return SERVICE_CONFIG.travelChargeRates['15-20']
  } else if (distance <= 25) {
    return SERVICE_CONFIG.travelChargeRates['20-25']
  } else {
    return -1 // Outside service area
  }
}

// Validate UK postcode format
function isValidUKPostcode(postcode: string): boolean {
  const ukPostcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i
  return ukPostcodeRegex.test(postcode.replace(/\s/g, ''))
}

// Format postcode consistently
function formatPostcode(postcode: string): string {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  if (cleaned.length <= 4) return cleaned
  
  const outcode = cleaned.slice(0, -3)
  const incode = cleaned.slice(-3)
  return `${outcode} ${incode}`
}

// Get coordinates for a postcode using a free API
async function getPostcodeCoordinates(postcode: string): Promise<PostcodeCoordinates | null> {
  try {
    const formattedPostcode = formatPostcode(postcode)
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(formattedPostcode)}`
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (data.status === 200 && data.result) {
      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching postcode coordinates:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { postcode } = await request.json()
    
    if (!postcode || typeof postcode !== 'string') {
      return NextResponse.json(
        { error: 'Postcode is required' },
        { status: 400 }
      )
    }
    
    // Validate postcode format
    if (!isValidUKPostcode(postcode)) {
      return NextResponse.json(
        { 
          error: 'Invalid postcode format',
          valid: false,
          message: 'Please enter a valid UK postcode'
        },
        { status: 400 }
      )
    }
    
    // Get coordinates for the postcode
    const coordinates = await getPostcodeCoordinates(postcode)
    
    if (!coordinates) {
      return NextResponse.json(
        {
          error: 'Postcode not found',
          valid: false,
          message: 'This postcode could not be found. Please check and try again.'
        },
        { status: 404 }
      )
    }
    
    // Calculate distance from SW9
    const distance = calculateDistance(
      SW9_COORDINATES.latitude,
      SW9_COORDINATES.longitude,
      coordinates.latitude,
      coordinates.longitude
    )
    
    // Calculate travel charge
    const travelCharge = calculateTravelCharge(distance)
    
    // Determine service area status
    let serviceArea: 'standard' | 'extended' | 'outside'
    let serviceAvailable = true
    let message = ''
    
    if (distance <= SERVICE_CONFIG.standardRadius) {
      serviceArea = 'standard'
      message = '✓ Great! You\'re within our standard service area'
    } else if (distance <= SERVICE_CONFIG.maxServiceRadius) {
      serviceArea = 'extended'
      message = `✓ We can serve your area with additional travel charge`
    } else {
      serviceArea = 'outside'
      serviceAvailable = false
      message = 'Sorry, your location is outside our current service area'
    }
    
    const response = {
      valid: true,
      serviceAvailable,
      postcode: formatPostcode(postcode),
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      serviceArea,
      travelCharge: travelCharge >= 0 ? travelCharge : 0,
      message,
      coordinates,
      serviceConfig: {
        baseLocation: 'SW9',
        standardRadius: SERVICE_CONFIG.standardRadius,
        maxServiceRadius: SERVICE_CONFIG.maxServiceRadius
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Postcode distance calculation error:', error)
    return NextResponse.json(
      { 
        error: 'Service temporarily unavailable',
        valid: false,
        message: 'Unable to check service area. Please try again later.'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const postcode = searchParams.get('postcode')
  
  if (!postcode) {
    return NextResponse.json(
      { error: 'Postcode parameter is required' },
      { status: 400 }
    )
  }
  
  // Reuse POST logic for GET requests
  const mockRequest = {
    json: async () => ({ postcode })
  } as NextRequest
  
  return POST(mockRequest)
}