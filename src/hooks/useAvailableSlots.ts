import { useState, useEffect } from 'react'
import { VehicleSize } from '@/lib/utils/vehicle-size-detection'

export interface TimeSlot {
  id: number
  date: string
  startTime: string
  endTime: string
  duration: number
  availableCapacity: number
  totalCapacity: number
  status: 'available' | 'limited' | 'unavailable'
  category: string
  label?: string
  isStandard: boolean
  displayOrder: number
  templateName?: string
  pricing?: any
}

export interface UseAvailableSlotsOptions {
  dateStart?: string
  dateEnd?: string
  serviceId?: string
  vehicleSize?: VehicleSize
}

export function useAvailableSlots(options: UseAvailableSlotsOptions = {}) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        
        // Default to today if no date provided
        const today = new Date().toISOString().split('T')[0]
        params.append('date_start', options.dateStart || today)
        
        if (options.dateEnd) {
          params.append('date_end', options.dateEnd)
        }
        
        if (options.serviceId) {
          params.append('service_id', options.serviceId)
        }
        
        if (options.vehicleSize && String(options.vehicleSize) !== 'undefined') {
          // Convert frontend size format to database format
          const dbSizeMap = {
            'S': 'small',
            'M': 'medium', 
            'L': 'large',
            'XL': 'extra_large'
          }
          const mappedSize = dbSizeMap[options.vehicleSize as keyof typeof dbSizeMap]
          if (mappedSize) {
            params.append('vehicle_size', mappedSize)
          }
        }

        const response = await fetch(`/api/bookings/available-slots?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch available slots')
        }

        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }

        // Now using the same enhanced data source as admin schedule
        setSlots(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setSlots([])
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [options.dateStart, options.dateEnd, options.serviceId, options.vehicleSize])

  return { slots, loading, error, refetch: () => {
    const fetchSlots = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        
        const today = new Date().toISOString().split('T')[0]
        params.append('date_start', options.dateStart || today)
        
        if (options.dateEnd) {
          params.append('date_end', options.dateEnd)
        }
        
        if (options.serviceId) {
          params.append('service_id', options.serviceId)
        }
        
        if (options.vehicleSize && String(options.vehicleSize) !== 'undefined') {
          const dbSizeMap = {
            'S': 'small',
            'M': 'medium', 
            'L': 'large',
            'XL': 'extra_large'
          }
          const mappedSize = dbSizeMap[options.vehicleSize as keyof typeof dbSizeMap]
          if (mappedSize) {
            params.append('vehicle_size', mappedSize)
          }
        }

        const response = await fetch(`/api/bookings/available-slots?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch available slots')
        }

        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }

        // Now using the same enhanced data source as admin schedule
        setSlots(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setSlots([])
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }}
}