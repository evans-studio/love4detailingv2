'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookingService } from '@/lib/services/booking.service'
import { VehicleService } from '@/lib/services/vehicle.service'
import { VehicleSize, PaymentMethod } from '@/types/database.types'

export interface BookingFlowData {
  // Step 1: Vehicle Details (No service selection needed - only Full Valet)
  vehicleId?: string
  vehicleRegistration?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleColor?: string
  vehicleSize?: VehicleSize
  
  // Step 2: Date & Time
  selectedDate?: string
  selectedSlotId?: string
  
  // Step 3: Contact Details
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  
  // Step 4: Payment
  paymentMethod?: PaymentMethod
  
  // Pricing (calculated from vehicle size)
  priceInPence?: number
  durationMinutes?: number
}

export interface BookingFlowState {
  currentStep: number
  bookingData: BookingFlowData
  loading: boolean
  error: string | null
  isSubmitting: boolean
}

export function useBookingFlow() {
  const router = useRouter()
  const [state, setState] = useState<BookingFlowState>({
    currentStep: 1,
    bookingData: {},
    loading: false,
    error: null,
    isSubmitting: false
  })

  const bookingService = new BookingService()
  const vehicleService = new VehicleService()

  const updateState = useCallback((updates: Partial<BookingFlowState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const setError = useCallback((error: string | null) => {
    updateState({ error })
  }, [updateState])

  const setLoading = useCallback((loading: boolean) => {
    updateState({ loading })
  }, [updateState])

  const updateBookingData = useCallback(async (data: Partial<BookingFlowData>) => {
    try {
      setLoading(true)
      setError(null)

      // If vehicle details are updated, calculate the price
      if (data.vehicleSize || (data.vehicleMake && data.vehicleModel)) {
        let vehicleSize = data.vehicleSize
        
        // If size not provided but make/model are, detect the size
        if (!vehicleSize && data.vehicleMake && data.vehicleModel) {
          vehicleSize = await vehicleService.detectVehicleSize(data.vehicleMake, data.vehicleModel)
        }

        if (vehicleSize) {
          const pricing = await vehicleService.getPricingBySize(vehicleSize)
          data.priceInPence = pricing.price_pence
          data.durationMinutes = pricing.duration_minutes
          data.vehicleSize = vehicleSize
        }
      }
      
      updateState({
        bookingData: { ...state.bookingData, ...data }
      })
    } catch (error) {
      console.error('Error updating booking data:', error)
      setError(error instanceof Error ? error.message : 'Failed to update booking data')
    } finally {
      setLoading(false)
    }
  }, [state.bookingData, vehicleService, updateState, setLoading, setError])

  const nextStep = useCallback(() => {
    if (state.currentStep < 4) {
      updateState({ currentStep: state.currentStep + 1 })
    }
  }, [state.currentStep, updateState])

  const previousStep = useCallback(() => {
    if (state.currentStep > 1) {
      updateState({ currentStep: state.currentStep - 1 })
    }
  }, [state.currentStep, updateState])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      updateState({ currentStep: step })
    }
  }, [updateState])

  const resetFlow = useCallback(() => {
    setState({
      currentStep: 1,
      bookingData: {},
      loading: false,
      error: null,
      isSubmitting: false
    })
  }, [])

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Vehicle Details
        return !!(
          state.bookingData.vehicleRegistration &&
          state.bookingData.vehicleMake &&
          state.bookingData.vehicleModel &&
          state.bookingData.vehicleSize
        )
      case 2: // Date & Time
        return !!(
          state.bookingData.selectedDate &&
          state.bookingData.selectedSlotId
        )
      case 3: // Contact Details
        return !!(
          state.bookingData.customerName &&
          state.bookingData.customerEmail &&
          state.bookingData.customerPhone
        )
      case 4: // Payment
        return !!state.bookingData.paymentMethod
      default:
        return false
    }
  }, [state.bookingData])

  const canProceedToStep = useCallback((step: number): boolean => {
    for (let i = 1; i < step; i++) {
      if (!validateStep(i)) {
        return false
      }
    }
    return true
  }, [validateStep])

  const submitBooking = useCallback(async (): Promise<string | null> => {
    if (state.isSubmitting) return null

    updateState({ isSubmitting: true, error: null })

    try {
      // Validate all required data
      if (!state.bookingData.selectedSlotId || 
          !state.bookingData.customerEmail || 
          !state.bookingData.customerName || 
          !state.bookingData.customerPhone) {
        throw new Error('Missing required booking information')
      }

      // Create or get vehicle if needed
      let vehicleId = state.bookingData.vehicleId
      if (!vehicleId && state.bookingData.vehicleRegistration) {
        // For anonymous bookings, we need to create a vehicle record
        const vehicleData = {
          userId: null, // Anonymous
          registration: state.bookingData.vehicleRegistration,
          make: state.bookingData.vehicleMake || 'Unknown',
          model: state.bookingData.vehicleModel || 'Unknown',
          year: state.bookingData.vehicleYear,
          color: state.bookingData.vehicleColor,
          size: state.bookingData.vehicleSize || 'medium'
        }
        
        const vehicle = await vehicleService.addVehicle(vehicleData)
        vehicleId = vehicle.id
      }

      // Create booking (service is always Full Valet)
      const result = await bookingService.createBooking({
        customerEmail: state.bookingData.customerEmail,
        customerName: state.bookingData.customerName,
        customerPhone: state.bookingData.customerPhone,
        slotId: state.bookingData.selectedSlotId,
        vehicleId,
        paymentMethod: state.bookingData.paymentMethod || 'cash'
      })

      // Navigate to confirmation page
      const confirmationUrl = `/booking/confirmation/${result.booking_reference}`
      router.push(confirmationUrl)
      
      return result.booking_reference
    } catch (error) {
      console.error('Error submitting booking:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
      setError(errorMessage)
      return null
    } finally {
      updateState({ isSubmitting: false })
    }
  }, [state.bookingData, state.isSubmitting, bookingService, vehicleService, router, updateState, setError])

  const getAvailableSlots = useCallback(async (date: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const slots = await bookingService.getAvailableSlots(date)
      return slots.filter(slot => slot.available)
    } catch (error) {
      console.error('Error fetching available slots:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch available slots')
      return []
    } finally {
      setLoading(false)
    }
  }, [bookingService, setLoading, setError])

  const getStepTitle = useCallback((step: number): string => {
    switch (step) {
      case 1:
        return 'Vehicle Details'
      case 2:
        return 'Date & Time'
      case 3:
        return 'Contact Details'
      case 4:
        return 'Payment & Confirmation'
      default:
        return 'Booking'
    }
  }, [])

  const getStepDescription = useCallback((step: number): string => {
    switch (step) {
      case 1:
        return 'Enter your vehicle details to get an accurate price'
      case 2:
        return 'Choose your preferred date and time'
      case 3:
        return 'Provide your contact information'
      case 4:
        return 'Review your booking and choose payment method'
      default:
        return ''
    }
  }, [])

  const getBookingSummary = useCallback(() => {
    const { bookingData } = state
    return {
      service: 'Full Valet',
      vehicle: bookingData.vehicleMake && bookingData.vehicleModel
        ? `${bookingData.vehicleMake} ${bookingData.vehicleModel}`
        : 'Vehicle details',
      registration: bookingData.vehicleRegistration,
      size: bookingData.vehicleSize,
      sizeLabel: bookingData.vehicleSize ? vehicleService.getSizeLabel(bookingData.vehicleSize) : '',
      price: bookingData.priceInPence,
      formattedPrice: bookingData.priceInPence ? bookingService.formatPrice(bookingData.priceInPence) : '',
      duration: bookingData.durationMinutes,
      date: bookingData.selectedDate,
      slotId: bookingData.selectedSlotId,
      customer: {
        name: bookingData.customerName,
        email: bookingData.customerEmail,
        phone: bookingData.customerPhone
      },
      paymentMethod: bookingData.paymentMethod
    }
  }, [state.bookingData, bookingService, vehicleService])

  return {
    // State
    currentStep: state.currentStep,
    bookingData: state.bookingData,
    loading: state.loading,
    error: state.error,
    isSubmitting: state.isSubmitting,
    
    // Actions
    updateBookingData,
    nextStep,
    previousStep,
    goToStep,
    resetFlow,
    submitBooking,
    getAvailableSlots,
    
    // Validation
    validateStep,
    canProceedToStep,
    
    // Helpers
    getStepTitle,
    getStepDescription,
    getBookingSummary,
    
    // Utilities
    setError,
    setLoading
  }
}