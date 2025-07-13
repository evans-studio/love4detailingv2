'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useSlotAvailability } from '@/lib/store/slotStore'
import { TimeSlot } from '@/components/booking/SlotPicker'

interface Slot {
  slot_id: string
  slot_date: string
  start_time: string
  end_time: string
  available_capacity: number
  max_capacity: number
  service_duration: number
  recommended: boolean
  peak_hours: boolean
  weather_dependent: boolean
  pricing_info: {
    base_price_pence: number
    duration_minutes: number
    vehicle_size: string
    peak_surcharge_pence: number
    total_price_pence: number
  }
}

interface BookingData {
  customer_email: string
  customer_name: string
  customer_phone?: string
  slot_id: string
  service_id: string
  vehicle_size: 'small' | 'medium' | 'large' | 'extra_large'
  vehicle_data?: any
  vehicle_id?: string
  payment_method?: string
  special_requests?: string
}

export function useBooking() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAvailableSlots = async (
    dateStart: string,
    dateEnd: string,
    serviceId?: string,
    vehicleSize?: 'small' | 'medium' | 'large' | 'extra_large'
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        date_start: dateStart,
        date_end: dateEnd,
      })

      if (serviceId) params.append('service_id', serviceId)
      if (vehicleSize) params.append('vehicle_size', vehicleSize)

      const response = await fetch(`/api/bookings/enhanced/available-slots?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch available slots')
      }

      const { data } = await response.json()
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch slots'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePricing = async (
    serviceId: string,
    vehicleSize: 'small' | 'medium' | 'large' | 'extra_large',
    slotDate?: string,
    isRepeatCustomer: boolean = false
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/bookings/enhanced/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          vehicleSize,
          slotDate,
          isRepeatCustomer,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to calculate pricing')
      }

      const { data } = await response.json()
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate pricing'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const createBooking = async (bookingData: BookingData) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/bookings/enhanced/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingData }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to create booking')
      }

      const { data } = await response.json()
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const getBookingHistory = async (limit: number = 50, offset: number = 0) => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      const response = await fetch(`/api/bookings/history?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking history')
      }

      const { data } = await response.json()
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch booking history'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const cancelBooking = async (bookingId: string, reason: string, refundAmount?: number) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, refundAmount }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to cancel booking')
      }

      const { data } = await response.json()
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    getAvailableSlots,
    calculatePricing,
    createBooking,
    getBookingHistory,
    cancelBooking,
  }
}

// Enhanced booking hook with slot store integration
export interface UseEnhancedBookingOptions {
  serviceId?: string
  vehicleSize?: 'small' | 'medium' | 'large' | 'extra_large'
  autoRefresh?: boolean
  refreshInterval?: number
  accessibilityMode?: boolean
}

export interface EnhancedBookingState {
  // Slot data
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  loading: boolean
  error: string | null
  
  // Date management
  selectedDate: string | null
  
  // Actions
  selectDate: (date: string) => void
  selectSlot: (slot: TimeSlot) => void
  deselectSlot: () => void
  refreshSlots: (forceRefresh?: boolean) => Promise<void>
  
  // Booking actions
  bookSlot: (bookingData: any) => Promise<{ success: boolean; error?: string }>
  
  // Utilities
  getAvailableSlots: () => TimeSlot[]
  getStandardSlots: () => TimeSlot[]
  getCustomSlots: () => TimeSlot[]
  isSlotAvailable: (slotId: string) => boolean
  canBookSlot: (slotId: string) => boolean
}

export function useEnhancedBooking(options: UseEnhancedBookingOptions = {}): EnhancedBookingState {
  const {
    serviceId,
    vehicleSize,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    accessibilityMode = false
  } = options

  const {
    selectedDate,
    slots,
    selectedSlot,
    loading,
    error,
    filters,
    setSelectedDate,
    setSelectedSlot,
    clearSelection,
    fetchAvailableSlots,
    updateFilters,
    optimisticallyBookSlot,
    refreshSlotStatus
  } = useSlotAvailability()

  // Update filters when options change
  useEffect(() => {
    updateFilters({
      serviceId,
      vehicleSize,
      accessibilityMode,
      showCapacity: true,
      showPricing: true
    })
  }, [serviceId, vehicleSize, accessibilityMode])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !selectedDate) return

    const interval = setInterval(() => {
      fetchAvailableSlots({ forceRefresh: false })
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedDate, refreshInterval])

  // Auto-fetch slots when date or filters change
  useEffect(() => {
    if (selectedDate && (serviceId || vehicleSize)) {
      fetchAvailableSlots({
        dateStart: selectedDate,
        serviceId: filters.serviceId,
        vehicleSize: filters.vehicleSize
      })
    }
  }, [selectedDate, filters.serviceId, filters.vehicleSize])

  // Actions
  const selectDate = useCallback((date: string) => {
    setSelectedDate(date)
    clearSelection() // Clear slot selection when date changes
  }, [setSelectedDate, clearSelection])

  const selectSlot = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot)
  }, [setSelectedSlot])

  const deselectSlot = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const refreshSlots = useCallback(async (forceRefresh = true) => {
    if (!selectedDate) return
    
    await fetchAvailableSlots({
      dateStart: selectedDate,
      serviceId: filters.serviceId,
      vehicleSize: filters.vehicleSize,
      forceRefresh
    })
  }, [selectedDate, filters.serviceId, filters.vehicleSize, fetchAvailableSlots])

  const bookSlot = useCallback(async (bookingData: any) => {
    if (!selectedSlot) {
      return { success: false, error: 'No slot selected' }
    }

    const result = await optimisticallyBookSlot(selectedSlot.id, {
      bookingId: bookingData.bookingId,
      date: selectedDate,
      sessionId: bookingData.sessionId
    })

    if (result.success) {
      // Refresh specific slot status after booking
      setTimeout(() => {
        refreshSlotStatus(selectedSlot.id)
      }, 1000)
    }

    return result
  }, [selectedSlot, selectedDate])

  // Utilities
  const getAvailableSlots = useCallback(() => {
    return slots.filter((slot: any) => 
      slot.status === 'available' || slot.status === 'last_available'
    )
  }, [slots])

  const getStandardSlots = useCallback(() => {
    return slots.filter((slot: any) => slot.isStandard)
  }, [slots])

  const getCustomSlots = useCallback(() => {
    return slots.filter((slot: any) => !slot.isStandard)
  }, [slots])

  const isSlotAvailable = useCallback((slotId: string) => {
    const slot = slots.find((s: any) => s.id === slotId)
    return slot ? (slot.status === 'available' || slot.status === 'last_available') : false
  }, [slots])

  const canBookSlot = useCallback((slotId: string) => {
    const slot = slots.find((s: any) => s.id === slotId)
    return slot ? slot.availableCapacity > 0 && isSlotAvailable(slotId) : false
  }, [slots, isSlotAvailable])

  return {
    // Slot data
    slots,
    selectedSlot,
    loading,
    error,
    
    // Date management
    selectedDate,
    
    // Actions
    selectDate,
    selectSlot,
    deselectSlot,
    refreshSlots,
    
    // Booking actions
    bookSlot,
    
    // Utilities
    getAvailableSlots,
    getStandardSlots,
    getCustomSlots,
    isSlotAvailable,
    canBookSlot
  }
}

// Enhanced hook with real-time features
export interface UseBookingRealtimeOptions extends UseEnhancedBookingOptions {
  enableRealtimeUpdates?: boolean
  slotUpdateInterval?: number
}

export function useBookingRealtime(options: UseBookingRealtimeOptions = {}) {
  const {
    enableRealtimeUpdates = false,
    slotUpdateInterval = 10000, // 10 seconds
    ...bookingOptions
  } = options

  const booking = useEnhancedBooking(bookingOptions)
  const { refreshSlotStatus } = useSlotAvailability()

  // Real-time slot status updates
  useEffect(() => {
    if (!enableRealtimeUpdates || !booking.selectedSlot) return

    const interval = setInterval(() => {
      refreshSlotStatus(booking.selectedSlot!.id)
    }, slotUpdateInterval)

    return () => clearInterval(interval)
  }, [enableRealtimeUpdates, booking.selectedSlot, slotUpdateInterval])

  // Monitor capacity changes for all visible slots
  useEffect(() => {
    if (!enableRealtimeUpdates || booking.slots.length === 0) return

    const interval = setInterval(() => {
      // Only update slots that are currently available or last available
      const slotsToUpdate = booking.slots
        .filter(slot => slot.status === 'available' || slot.status === 'last_available')
        .slice(0, 5) // Limit to 5 slots to avoid too many requests

      slotsToUpdate.forEach(slot => {
        refreshSlotStatus(slot.id)
      })
    }, slotUpdateInterval * 2) // Less frequent for batch updates

    return () => clearInterval(interval)
  }, [enableRealtimeUpdates, booking.slots, slotUpdateInterval])

  return booking
}