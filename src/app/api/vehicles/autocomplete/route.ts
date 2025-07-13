import { NextRequest, NextResponse } from 'next/server'
import vehicleSizeData from '@/data/vehicle-size-data.json'

interface VehicleDataEntry {
  make: string
  model: string
  trim: string
  size: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'makes', 'models', 'trims'
    const make = searchParams.get('make')
    const model = searchParams.get('model')
    const query = searchParams.get('q')?.toLowerCase() || ''

    const data = vehicleSizeData as VehicleDataEntry[]

    switch (type) {
      case 'makes':
        // Get unique makes, optionally filtered by query
        const makes = Array.from(new Set(data.map(v => v.make)))
          .filter(make => make.toLowerCase().includes(query))
          .sort()
        return NextResponse.json({ makes })

      case 'models':
        if (!make) {
          return NextResponse.json({ error: 'Make parameter required for models' }, { status: 400 })
        }
        // Get models for specific make, optionally filtered by query
        const models = Array.from(new Set(
          data
            .filter(v => v.make.toLowerCase() === make.toLowerCase())
            .map(v => v.model)
        ))
          .filter(model => model.toLowerCase().includes(query))
          .sort()
        return NextResponse.json({ models })

      case 'trims':
        if (!make || !model) {
          return NextResponse.json({ error: 'Make and model parameters required for trims' }, { status: 400 })
        }
        // Get trims for specific make/model, optionally filtered by query
        const trims = Array.from(new Set(
          data
            .filter(v => 
              v.make.toLowerCase() === make.toLowerCase() && 
              v.model.toLowerCase() === model.toLowerCase()
            )
            .map(v => v.trim)
            .filter(trim => trim && trim.toLowerCase().includes(query))
        ))
          .sort()
        return NextResponse.json({ trims })

      case 'vehicle-info':
        if (!make || !model) {
          return NextResponse.json({ error: 'Make and model parameters required for vehicle info' }, { status: 400 })
        }
        // Get vehicle info including size
        const vehicleInfo = data.find(v => 
          v.make.toLowerCase() === make.toLowerCase() && 
          v.model.toLowerCase() === model.toLowerCase()
        )
        
        if (vehicleInfo) {
          return NextResponse.json({
            make: vehicleInfo.make,
            model: vehicleInfo.model,
            trim: vehicleInfo.trim,
            size: vehicleInfo.size,
            sizeDescription: getSizeDescription(vehicleInfo.size)
          })
        } else {
          return NextResponse.json({
            make,
            model,
            size: 'M', // Default to medium
            sizeDescription: 'Medium (estimated)'
          })
        }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

  } catch (error) {
    console.error('Autocomplete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getSizeDescription(size: string): string {
  switch (size) {
    case 'S': return 'Small Vehicle'
    case 'M': return 'Medium Vehicle'
    case 'L': return 'Large Vehicle' 
    case 'XL': return 'Extra Large Vehicle'
    default: return 'Unknown Size'
  }
} 