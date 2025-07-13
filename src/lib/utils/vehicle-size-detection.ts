import vehicleSizeData from '@/data/vehicle-size-data.json'

// Type definitions for vehicle size detection
export type VehicleSize = 'S' | 'M' | 'L' | 'XL'

export interface VehicleSizeInfo {
  size: VehicleSize
  basePrice: number // Base price in pounds
  multiplier: number
  description: string
}

export interface VehicleDetectionResult {
  size: VehicleSize
  confidence: 'high' | 'medium' | 'low'
  matches: Array<{
    make: string
    model: string
    trim?: string
    exactMatch: boolean
  }>
  pricing: VehicleSizeInfo
}

// Size-based pricing configuration
const SIZE_PRICING: Record<VehicleSize, VehicleSizeInfo> = {
  'S': {
    size: 'S',
    basePrice: 25,
    multiplier: 0.8,
    description: 'Small vehicle (City cars, superminis)'
  },
  'M': {
    size: 'M',
    basePrice: 35,
    multiplier: 1.0,
    description: 'Medium vehicle (Hatchbacks, small SUVs)'
  },
  'L': {
    size: 'L',
    basePrice: 45,
    multiplier: 1.3,
    description: 'Large vehicle (Saloons, estates, large SUVs)'
  },
  'XL': {
    size: 'XL',
    basePrice: 60,
    multiplier: 1.6,
    description: 'Extra Large vehicle (Luxury cars, supercars, large vans)'
  }
}

/**
 * Detect vehicle size based on make and model
 */
export function detectVehicleSize(make: string, model: string, trim?: string): VehicleDetectionResult {
  const normalizedMake = make.trim().toLowerCase()
  const normalizedModel = model.trim().toLowerCase()
  const normalizedTrim = trim?.trim().toLowerCase()

  // Find exact matches in the database
  const exactMatches = vehicleSizeData.filter(vehicle => 
    vehicle.make.toLowerCase() === normalizedMake &&
    vehicle.model.toLowerCase() === normalizedModel
  )

  // Find partial matches (make + partial model)
  const partialMatches = vehicleSizeData.filter(vehicle =>
    vehicle.make.toLowerCase() === normalizedMake &&
    vehicle.model.toLowerCase().includes(normalizedModel)
  )

  // Find make-only matches for fallback
  const makeMatches = vehicleSizeData.filter(vehicle =>
    vehicle.make.toLowerCase() === normalizedMake
  )

  let detectedSize: VehicleSize = 'M' // Default to medium
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let matches: VehicleDetectionResult['matches'] = []

  if (exactMatches.length > 0) {
    // Exact match found - high confidence
    confidence = 'high'
    
    // If trim is provided, try to find trim-specific match
    let bestMatch = exactMatches[0]
    if (normalizedTrim) {
      const trimMatch = exactMatches.find(vehicle => 
        vehicle.trim.toLowerCase() === normalizedTrim
      )
      if (trimMatch) {
        bestMatch = trimMatch
      }
    }
    
    detectedSize = bestMatch.size as VehicleSize
    matches = exactMatches.map(vehicle => ({
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      exactMatch: true
    }))
  } else if (partialMatches.length > 0) {
    // Partial match found - medium confidence
    confidence = 'medium'
    
    // Use the most common size from partial matches
    const sizeCounts = partialMatches.reduce((acc, vehicle) => {
      acc[vehicle.size] = (acc[vehicle.size] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    detectedSize = Object.keys(sizeCounts).reduce((a, b) => 
      sizeCounts[a] > sizeCounts[b] ? a : b
    ) as VehicleSize
    
    matches = partialMatches.slice(0, 5).map(vehicle => ({
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      exactMatch: false
    }))
  } else if (makeMatches.length > 0) {
    // Make-only match - low confidence
    confidence = 'low'
    
    // Use the most common size for this make
    const sizeCounts = makeMatches.reduce((acc, vehicle) => {
      acc[vehicle.size] = (acc[vehicle.size] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    detectedSize = Object.keys(sizeCounts).reduce((a, b) => 
      sizeCounts[a] > sizeCounts[b] ? a : b
    ) as VehicleSize
    
    matches = makeMatches.slice(0, 3).map(vehicle => ({
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      exactMatch: false
    }))
  }

  return {
    size: detectedSize,
    confidence,
    matches,
    pricing: SIZE_PRICING[detectedSize]
  }
}

/**
 * Get all available makes from the database
 */
export function getAvailableMakes(): string[] {
  const makes = [...new Set(vehicleSizeData.map(vehicle => vehicle.make))]
  return makes.sort()
}

/**
 * Get models for a specific make
 */
export function getModelsForMake(make: string): string[] {
  const normalizedMake = make.trim().toLowerCase()
  const models = [...new Set(
    vehicleSizeData
      .filter(vehicle => vehicle.make.toLowerCase() === normalizedMake)
      .map(vehicle => vehicle.model)
  )]
  return models.sort()
}

/**
 * Get size information for a specific size category
 */
export function getSizeInfo(size: VehicleSize): VehicleSizeInfo {
  return SIZE_PRICING[size]
}

/**
 * Get all size categories with their information
 */
export function getAllSizes(): VehicleSizeInfo[] {
  return Object.values(SIZE_PRICING)
}

/**
 * Calculate service price based on vehicle size and service type
 */
export function calculateServicePrice(
  vehicleSize: VehicleSize,
  serviceMultiplier: number = 1,
  addOns: number = 0
): number {
  const sizeInfo = SIZE_PRICING[vehicleSize]
  return Math.round((sizeInfo.basePrice * serviceMultiplier * sizeInfo.multiplier) + addOns)
}