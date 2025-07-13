import { NextRequest, NextResponse } from 'next/server'
import vehicleData from '@/data/vehicle-size-data.json'

interface VehicleDataEntry {
  make: string
  model: string
  trim?: string
  size: string
}

// Map JSON letter codes to database enum values
const sizeMapping = {
  'S': 'small',
  'M': 'medium',
  'L': 'large',
  'XL': 'extra_large'
} as const

function detectVehicleSize(make: string, model: string) {
  // Simple JSON lookup - find exact match
  const match = (vehicleData as VehicleDataEntry[]).find(v => 
    v.make.toLowerCase() === make.toLowerCase() && 
    v.model.toLowerCase() === model.toLowerCase()
  )
  
  if (match) {
    // Convert from JSON format (L) to database format (large)
    const databaseSize = sizeMapping[match.size as keyof typeof sizeMapping] || 'medium'
    return {
      size: databaseSize,
      confidence: "high",
      matched: true,
      message: `Found match for ${make} ${model}`
    }
  }
  
  // Clean fallback
  return {
    size: "medium",
    confidence: "low", 
    matched: false,
    message: 'No exact match found. Using default medium size.'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { make, model, year } = body

    if (!make || !model) {
      return NextResponse.json(
        { error: 'Make and model are required' },
        { status: 400 }
      )
    }

    // Simple vehicle size detection
    const result = detectVehicleSize(make, model)
    
    return NextResponse.json({ data: result })

  } catch (error) {
    console.error('Error in vehicle size detection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}