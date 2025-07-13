// Service configuration
// This file contains the service IDs and configuration for the booking system
// Enhanced to support dynamic services from database

export const SERVICE_CONFIG = {
  FULL_VALET: {
    id: '6856143e-eb1d-4776-bf6b-3f6149f36901', // This should match the service ID in the database
    code: 'full_valet',
    name: 'Full Valet',
    description: 'Complete interior and exterior valet service',
    baseDurationMinutes: 120
  }
} as const

// Interface for dynamic service from database
export interface Service {
  id: string
  code: string
  name: string
  description: string
  short_description?: string
  base_duration_minutes: number
  is_active: boolean
  features?: string[]
  display_order?: number
  pricing: ServicePricing[]
  pricing_summary?: {
    range: { min: number; max: number }
    formatted_range: string
    vehicle_sizes: string[]
    total_pricing_records: number
    active_pricing_records: number
  }
  created_at?: string
  updated_at?: string
}

export interface ServicePricing {
  id: string
  service_id: string
  vehicle_size: string
  price_pence: number
  duration_minutes: number
  is_active: boolean
}

// Cache for loaded services
let servicesCache: Service[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper function to get service by code
export function getServiceByCode(code: string) {
  return Object.values(SERVICE_CONFIG).find(service => service.code === code)
}

// Helper function to get default service (Full Valet)
export function getDefaultService() {
  return SERVICE_CONFIG.FULL_VALET
}

// Fetch all active services from database
export async function fetchActiveServices(): Promise<Service[]> {
  try {
    // Check cache first
    if (servicesCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      return servicesCache
    }

    const response = await fetch('/api/admin/services', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

    if (!response.ok) {
      console.warn('Failed to fetch services from API, using fallback')
      return [getDefaultService() as unknown as Service]
    }

    const result = await response.json()
    const services = result.data || []
    
    // Filter for active services only
    const activeServices = services.filter((service: Service) => service.is_active)
    
    // Update cache
    servicesCache = activeServices
    cacheTimestamp = Date.now()
    
    console.log(`✅ Loaded ${activeServices.length} active services from database`)
    return activeServices
    
  } catch (error) {
    console.error('Error fetching active services:', error)
    // Return default service as fallback
    return [getDefaultService() as unknown as Service]
  }
}

// Get service by ID from cache or database
export async function getServiceById(serviceId: string): Promise<Service | null> {
  try {
    const services = await fetchActiveServices()
    return services.find(service => service.id === serviceId) || null
  } catch (error) {
    console.error('Error getting service by ID:', error)
    return null
  }
}

// Get pricing for a specific service and vehicle size
export function getServicePricing(service: Service, vehicleSize: string): ServicePricing | null {
  if (!service.pricing || service.pricing.length === 0) {
    return null
  }
  
  return service.pricing.find(p => p.vehicle_size === vehicleSize && p.is_active) || null
}

// Calculate total price including service and any additional costs
export function calculateTotalPrice(service: Service, vehicleSize: string, travelChargePence: number = 0): number {
  const pricing = getServicePricing(service, vehicleSize)
  if (!pricing) {
    return travelChargePence // Only travel charge if no service pricing found
  }
  
  return pricing.price_pence + travelChargePence
}

// Clear the services cache (useful for testing or forcing refresh)
export function clearServicesCache() {
  servicesCache = null
  cacheTimestamp = null
}