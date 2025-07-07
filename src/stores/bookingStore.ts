import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { BookingDraft, BookingStep, BookingConfirmation, AvailableSlotRow } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'

interface BookingState {
  // State
  booking: BookingDraft | null
  availableSlots: AvailableSlotRow[]
  isLoading: boolean
  error: string | null
  
  // Actions
  initializeBooking: () => void
  updateBookingStep: (step: BookingStep, data: Partial<BookingDraft>) => void
  updateServiceSelection: (serviceId: string) => void
  updateVehicleData: (vehicleData: BookingDraft['vehicleData']) => void
  updateScheduleSelection: (slotId: string) => void
  updateCustomerDetails: (customerDetails: BookingDraft['customerDetails']) => void
  updatePricing: (pricing: BookingDraft['pricing']) => void
  calculatePrice: () => Promise<number>
  submitBooking: () => Promise<BookingConfirmation>
  clearBooking: () => void
  fetchAvailableSlots: (date: string) => Promise<void>
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useBookingStore = create<BookingState>()(
  devtools(
    (set, get) => ({
      // Initial state
      booking: null,
      availableSlots: [],
      isLoading: false,
      error: null,

      // Initialize a new booking flow
      initializeBooking: () => {
        set({
          booking: {
            step: 'services'
          },
          error: null
        })
      },

      // Update booking step and merge data
      updateBookingStep: (step: BookingStep, data: Partial<BookingDraft>) => {
        set((state) => ({
          booking: state.booking ? {
            ...state.booking,
            ...data,
            step
          } : {
            step,
            ...data
          },
          error: null
        }))
      },

      // Update service selection
      updateServiceSelection: (serviceId: string) => {
        set((state) => ({
          booking: state.booking ? {
            ...state.booking,
            serviceId
          } : {
            serviceId,
            step: 'services'
          },
          error: null
        }))
      },

      // Update vehicle data
      updateVehicleData: (vehicleData: BookingDraft['vehicleData']) => {
        set((state) => ({
          booking: state.booking ? {
            ...state.booking,
            vehicleData
          } : {
            vehicleData,
            step: 'vehicle'
          },
          error: null
        }))
      },

      // Update schedule selection
      updateScheduleSelection: (slotId: string) => {
        set((state) => ({
          booking: state.booking ? {
            ...state.booking,
            slotId
          } : {
            slotId,
            step: 'schedule'
          },
          error: null
        }))
      },

      // Update customer details
      updateCustomerDetails: (customerDetails: BookingDraft['customerDetails']) => {
        set((state) => ({
          booking: state.booking ? {
            ...state.booking,
            customerDetails
          } : {
            customerDetails,
            step: 'payment'
          },
          error: null
        }))
      },

      // Update pricing information
      updatePricing: (pricing: BookingDraft['pricing']) => {
        set((state) => ({
          booking: state.booking ? {
            ...state.booking,
            pricing
          } : {
            pricing,
            step: 'pricing'
          },
          error: null
        }))
      },

      // Calculate total price
      calculatePrice: async (): Promise<number> => {
        const { booking } = get()
        
        if (!booking?.serviceId || !booking?.vehicleData?.size) {
          throw new Error('Service and vehicle size required for pricing')
        }

        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          const { data, error } = await supabase
            .rpc('calculate_booking_price', {
              p_service_id: booking.serviceId,
              p_vehicle_size: booking.vehicleData.size
            })

          if (error) throw error

          const totalPrice = data || 0
          
          // Update booking with calculated pricing
          set((state) => ({
            booking: state.booking ? {
              ...state.booking,
              pricing: {
                basePrice: totalPrice,
                addOns: 0,
                total: totalPrice
              }
            } : null,
            isLoading: false
          }))

          return totalPrice

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to calculate price'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      // Submit the complete booking
      submitBooking: async (): Promise<BookingConfirmation> => {
        const { booking } = get()
        
        if (!booking) {
          throw new Error('No booking data available')
        }

        if (!booking.serviceId || !booking.slotId || !booking.customerDetails || !booking.vehicleData) {
          throw new Error('Incomplete booking data')
        }

        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          
          // Create the booking using the database function
          const { data, error } = await supabase
            .rpc('create_guest_booking', {
              p_service_id: booking.serviceId,
              p_slot_id: booking.slotId,
              p_customer_name: booking.customerDetails.fullName!,
              p_customer_email: booking.customerDetails.email!,
              p_customer_phone: booking.customerDetails.phone!,
              p_service_address: booking.customerDetails.serviceAddress!,
              p_vehicle_data: {
                registration: booking.vehicleData.registration,
                make: booking.vehicleData.make,
                model: booking.vehicleData.model,
                year: booking.vehicleData.year,
                color: booking.vehicleData.color,
                size: booking.vehicleData.size,
                special_notes: booking.vehicleData.specialNotes
              },
              p_total_price_pence: booking.pricing?.total ? booking.pricing.total * 100 : 0
            })

          if (error) throw error

          const confirmation: BookingConfirmation = {
            bookingId: data.booking_id,
            bookingReference: data.booking_reference,
            serviceDetails: {
              name: data.service_name,
              duration: data.duration_minutes,
              price: data.total_price_pence / 100
            },
            scheduledDateTime: data.scheduled_datetime,
            customerInstructions: data.customer_instructions || ''
          }

          set({ isLoading: false })
          return confirmation

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      // Fetch available slots for a date
      fetchAvailableSlots: async (date: string) => {
        try {
          set({ isLoading: true, error: null })
          
          const supabase = createClient()
          const { data, error } = await supabase
            .from('available_slots')
            .select(`
              *,
              bookings!inner(status)
            `)
            .eq('slot_date', date)
            .eq('is_blocked', false)
            .lt('current_bookings', 'max_bookings')
            .gte('slot_date', new Date().toISOString().split('T')[0])
            .order('start_time')

          if (error) throw error

          set({ 
            availableSlots: data || [],
            isLoading: false 
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch available slots'
          set({ error: errorMessage, isLoading: false })
        }
      },

      // Clear booking data
      clearBooking: () => {
        set({
          booking: null,
          availableSlots: [],
          error: null
        })
      },

      // Utility methods
      setError: (error: string | null) => {
        set({ error })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      }
    }),
    {
      name: 'booking-store',
      partialize: (state) => ({ 
        booking: state.booking 
      })
    }
  )
)