export interface Service {
  id: string
  name: string
  description: string
  duration: string
  basePrice: number
  features: string[]
  available: boolean
  category?: string
  addOns?: ServiceAddOn[]
}

export interface ServiceAddOn {
  id: string
  name: string
  price: number
  duration?: string
}

export const SERVICES: Service[] = [
  {
    id: 'full-valet',
    name: 'Full Valet & Detail',
    description: 'Complete interior and exterior detailing service',
    duration: '45-60 minutes',
    basePrice: 55,
    available: true,
    features: [
      'Full exterior wash & dry',
      'Interior vacuum & wipe down', 
      'Window cleaning inside & out',
      'Tyre shine & wheel clean',
      'Dashboard UV protection',
      'Air freshener'
    ]
  }
]

export const SIZE_MULTIPLIERS = {
  small: 1.0,
  medium: 1.09,
  large: 1.18,
  xlarge: 1.27
} as const

export type VehicleSize = keyof typeof SIZE_MULTIPLIERS

export function calculateServicePrice(serviceId: string, vehicleSize: string): number {
  const service = SERVICES.find(s => s.id === serviceId)
  if (!service) return 0
  
  const normalizedSize = vehicleSize.toLowerCase() as VehicleSize
  const multiplier = SIZE_MULTIPLIERS[normalizedSize] || 1
  return Math.round(service.basePrice * multiplier)
}

export function getAvailableServices(): Service[] {
  return SERVICES.filter(service => service.available)
}

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find(service => service.id === id)
}

export function getServicePricesBySize(serviceId: string) {
  const service = getServiceById(serviceId)
  if (!service) return {}
  
  return {
    small: calculateServicePrice(serviceId, 'small'),
    medium: calculateServicePrice(serviceId, 'medium'),
    large: calculateServicePrice(serviceId, 'large'),
    xlarge: calculateServicePrice(serviceId, 'xlarge')
  }
}