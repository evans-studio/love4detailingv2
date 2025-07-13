/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-implicit-any */
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TimeSlot } from '@/components/booking/SlotPicker'

// Types for the enhanced slot system
export interface SlotAvailabilityState {
  selectedDate: string | null
  dateRange: {
    start: string
    end: string
  } | null
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  loading: boolean
  error: string | null
  lastUpdated: number
  filters: {
    serviceId?: string
    vehicleSize?: string
    showCapacity: boolean
    showPricing: boolean
    accessibilityMode: boolean
  }
  // Optimistic updates
  pendingSlots: Map<string, TimeSlot>
  // Real-time features
  subscriptions: Set<string>
  staleTime: number // Time in ms before data is considered stale
}

export interface SlotManagementState {
  templates: Array<{
    id: string
    name: string
    description?: string
    isActive: boolean
    isDefault: boolean
    slots: Array<{
      id: string
      dayOfWeek: number
      startTime: string
      endTime: string
      duration: number
      maxBookings: number
      isStandard: boolean
      customLabel?: string
      displayOrder: number
    }>
  }>
  loading: boolean
  error: string | null
}

export interface SlotStore extends SlotAvailabilityState, SlotManagementState {
  // Slot selection actions
  setSelectedDate: (date: string | null) => void
  setDateRange: (start: string, end: string) => void
  setSelectedSlot: (slot: TimeSlot | null) => void
  clearSelection: () => void
  
  // Slot data actions
  fetchAvailableSlots: (params?: {
    dateStart?: string
    dateEnd?: string
    serviceId?: string
    vehicleSize?: string
    forceRefresh?: boolean
  }) => Promise<void>
  refreshSlotStatus: (slotId: string) => Promise<void>
  
  // Optimistic updates
  optimisticallyUpdateSlot: (slotId: string, updates: Partial<TimeSlot>) => void
  optimisticallyBookSlot: (slotId: string, bookingData: any) => Promise<{ success: boolean; error?: string }>
  optimisticallyCancelSlot: (slotBookingId: string) => Promise<{ success: boolean; error?: string }>
  
  // Filter management
  updateFilters: (filters: Partial<SlotAvailabilityState['filters']>) => void
  
  // Cache management
  clearCache: () => void
  isDataStale: () => boolean
  
  // Template management (admin)
  fetchTemplates: () => Promise<void>
  createTemplate: (template: any) => Promise<{ success: boolean; data?: any; error?: string }>
  updateTemplate: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>
  deleteTemplate: (id: string) => Promise<{ success: boolean; error?: string }>
  generateSlotsFromTemplate: (templateId: string, startDate: string, endDate: string) => Promise<{ success: boolean; error?: string }>
  
  // Real-time subscriptions (future enhancement)
  subscribeToSlotUpdates: (slotIds: string[]) => void
  unsubscribeFromSlotUpdates: (slotIds: string[]) => void
  
  // Internal actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateSlots: (slots: TimeSlot[]) => void
  updateSingleSlot: (slot: TimeSlot) => void
  removeSlot: (slotId: string) => void
}

// Default state
const defaultState: Omit<SlotStore, keyof SlotStore> = {
  // Slot availability state
  selectedDate: null,
  dateRange: null,
  slots: [],
  selectedSlot: null,
  loading: false,
  error: null,
  lastUpdated: 0,
  filters: {
    showCapacity: true,
    showPricing: true,
    accessibilityMode: false
  },
  pendingSlots: new Map(),
  subscriptions: new Set(),
  staleTime: 5 * 60 * 1000, // 5 minutes
  
  // Slot management state
  templates: [],
}

// @ts-ignore
export const useSlotStore = create<any>()( 
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...defaultState,
        
        // Slot selection actions
        setSelectedDate: (date: string | null) => {
          set((state: any) => {
            state.selectedDate = date
            // Clear slots when date changes to force refresh
            if (date !== state.selectedDate) {
              state.slots = []
              state.selectedSlot = null
            }
          })
        },
        
        setDateRange: (start: string, end: string) => {
          set((state: any) => {
            state.dateRange = { start, end }
            // Clear existing slots to force refresh for new range
            state.slots = []
            state.selectedSlot = null
          })
        },
        
        setSelectedSlot: (slot: TimeSlot | null) => {
          set((state: any) => {
            state.selectedSlot = slot
          })
        },
        
        clearSelection: () => {
          set((state: any) => {
            state.selectedSlot = null
          })
        },
        
        // Slot data actions
        fetchAvailableSlots: async (params: any = {}) => {
          const state = get()
          const {
            dateStart = state.selectedDate || new Date().toISOString().split('T')[0],
            dateEnd = dateStart,
            serviceId = state.filters.serviceId,
            vehicleSize = state.filters.vehicleSize,
            forceRefresh = false
          } = params
          
          // Check if data is still fresh
          if (!forceRefresh && !state.isDataStale() && state.slots.length > 0) {
            return
          }
          
          try {
            state.setLoading(true)
            state.setError(null)
            
            const searchParams = new URLSearchParams({
              date_start: dateStart,
              ...(dateEnd !== dateStart && { date_end: dateEnd }),
              ...(serviceId && { service_id: serviceId }),
              ...(vehicleSize && { vehicle_size: vehicleSize })
            })
            
            const response = await fetch(`/api/bookings/available-slots?${searchParams}`)
            const result = await response.json()
            
            if (result.error) {
              state.setError(result.error)
            } else {
              state.updateSlots(result.data || [])
            }
          } catch (error) {
            state.setError(error instanceof Error ? error.message : 'Failed to fetch slots')
          } finally {
            state.setLoading(false)
          }
        },
        
        refreshSlotStatus: async (slotId: string) => {
          try {
            const response = await fetch(`/api/bookings/slots/status?slot_id=${slotId}`)
            const result = await response.json()
            
            if (result.error) {
              console.error('Failed to refresh slot status:', result.error)
            } else if (result.data) {
              const slot = get().slots.find((s: any) => s.id === slotId)
              if (slot) {
                const updatedSlot: TimeSlot = {
                  ...slot,
                  availableCapacity: result.data.availableCapacity,
                  totalCapacity: result.data.totalCapacity,
                  status: result.data.status
                }
                get().updateSingleSlot(updatedSlot)
              }
            }
          } catch (error) {
            console.error('Failed to refresh slot status:', error)
          }
        },
        
        // Optimistic updates
        optimisticallyUpdateSlot: (slotId: string, updates: Partial<TimeSlot>) => {
          set((state: any) => {
            const slotIndex = state.slots.findIndex((s: any) => s.id === slotId)
            if (slotIndex !== -1) {
              state.slots[slotIndex] = { ...state.slots[slotIndex], ...updates }
            }
            
            // Update selected slot if it's the same one
            if (state.selectedSlot?.id === slotId) {
              state.selectedSlot = { ...state.selectedSlot, ...updates }
            }
          })
        },
        
        optimisticallyBookSlot: async (slotId: string, bookingData: any) => {
          const state = get()
          const slot = state.slots.find((s: any) => s.id === slotId)
          
          if (!slot) {
            return { success: false, error: 'Slot not found' }
          }
          
          // Optimistically update capacity
          state.optimisticallyUpdateSlot(slotId, {
            availableCapacity: Math.max(0, slot.availableCapacity - 1),
            status: slot.availableCapacity <= 1 ? 'booked' : slot.status
          })
          
          try {
            const response = await fetch('/api/bookings/slots/book', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slotId,
                bookingId: bookingData.bookingId,
                bookingDate: bookingData.date,
                sessionId: bookingData.sessionId
              })
            })
            
            const result = await response.json()
            
            if (result.error) {
              // Revert optimistic update
              state.optimisticallyUpdateSlot(slotId, {
                availableCapacity: slot.availableCapacity,
                status: slot.status
              })
              return { success: false, error: result.error }
            }
            
            // Update with actual server response
            state.optimisticallyUpdateSlot(slotId, {
              availableCapacity: result.availableCapacity
            })
            
            return { success: true }
          } catch (error) {
            // Revert optimistic update
            state.optimisticallyUpdateSlot(slotId, {
              availableCapacity: slot.availableCapacity,
              status: slot.status
            })
            return { success: false, error: error instanceof Error ? error.message : 'Booking failed' }
          }
        },
        
        optimisticallyCancelSlot: async (slotBookingId: string) => {
          try {
            const response = await fetch(`/api/bookings/slots/book?slot_booking_id=${slotBookingId}`, {
              method: 'DELETE'
            })
            
            const result = await response.json()
            
            if (result.error) {
              return { success: false, error: result.error }
            }
            
            // Refresh slots to get updated capacity
            await get().fetchAvailableSlots({ forceRefresh: true })
            
            return { success: true }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Cancellation failed' }
          }
        },
        
        // Filter management
        updateFilters: (newFilters: Partial<SlotAvailabilityState['filters']>) => {
          set((state) => {
            const hasServiceOrSizeChange = 
              (newFilters.serviceId !== undefined && newFilters.serviceId !== state.filters.serviceId) ||
              (newFilters.vehicleSize !== undefined && newFilters.vehicleSize !== state.filters.vehicleSize)
            
            state.filters = { ...state.filters, ...newFilters }
            
            // Clear slots if service or vehicle size changed (affects pricing)
            if (hasServiceOrSizeChange) {
              state.slots = []
            }
          })
        },
        
        // Cache management
        clearCache: () => {
          set((state) => {
            state.slots = []
            state.selectedSlot = null
            state.lastUpdated = 0
            state.pendingSlots.clear()
          })
        },
        
        isDataStale: () => {
          const state = get()
          return Date.now() - state.lastUpdated > state.staleTime
        },
        
        // Template management (admin)
        fetchTemplates: async () => {
          const state = get()
          
          try {
            state.setLoading(true)
            
            const response = await fetch('/api/admin/schedule-templates')
            const result = await response.json()
            
            if (result.error) {
              state.setError(result.error)
            } else {
              set((state) => {
                state.templates = result.data || []
              })
            }
          } catch (error) {
            state.setError(error instanceof Error ? error.message : 'Failed to fetch templates')
          } finally {
            state.setLoading(false)
          }
        },
        
        createTemplate: async (templateData: any) => {
          try {
            const response = await fetch('/api/admin/schedule-templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(templateData)
            })
            
            const result = await response.json()
            
            if (result.error) {
              return { success: false, error: result.error }
            }
            
            // Refresh templates
            await get().fetchTemplates()
            
            return { success: true, data: result.data }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed to create template' }
          }
        },
        
        updateTemplate: async (id: string, updates: any) => {
          try {
            const response = await fetch('/api/admin/schedule-templates', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, ...updates })
            })
            
            const result = await response.json()
            
            if (result.error) {
              return { success: false, error: result.error }
            }
            
            // Refresh templates
            await get().fetchTemplates()
            
            return { success: true }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed to update template' }
          }
        },
        
        deleteTemplate: async (id: string) => {
          try {
            const response = await fetch(`/api/admin/schedule-templates?id=${id}`, {
              method: 'DELETE'
            })
            
            const result = await response.json()
            
            if (result.error) {
              return { success: false, error: result.error }
            }
            
            // Refresh templates
            await get().fetchTemplates()
            
            return { success: true }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed to delete template' }
          }
        },
        
        generateSlotsFromTemplate: async (templateId: string, startDate: string, endDate: string) => {
          try {
            const response = await fetch('/api/admin/slots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'generate',
                templateId,
                startDate,
                endDate
              })
            })
            
            const result = await response.json()
            
            if (result.error) {
              return { success: false, error: result.error }
            }
            
            return { success: true }
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed to generate slots' }
          }
        },
        
        // Real-time subscriptions (placeholder for future enhancement)
        subscribeToSlotUpdates: (slotIds: string[]) => {
          set((state) => {
            slotIds.forEach(id => state.subscriptions.add(id))
          })
          // TODO: Implement WebSocket or Server-Sent Events
        },
        
        unsubscribeFromSlotUpdates: (slotIds: string[]) => {
          set((state) => {
            slotIds.forEach(id => state.subscriptions.delete(id))
          })
          // TODO: Implement WebSocket or Server-Sent Events cleanup
        },
        
        // Internal actions
        setLoading: (loading: boolean) => {
          set((state) => {
            state.loading = loading
          })
        },
        
        setError: (error: string | null) => {
          set((state) => {
            state.error = error
          })
        },
        
        updateSlots: (slots: TimeSlot[]) => {
          set((state) => {
            state.slots = slots
            state.lastUpdated = Date.now()
            state.error = null
          })
        },
        
        updateSingleSlot: (updatedSlot: TimeSlot) => {
          set((state) => {
            const index = state.slots.findIndex(s => s.id === updatedSlot.id)
            if (index !== -1) {
              state.slots[index] = updatedSlot
            }
            
            if (state.selectedSlot?.id === updatedSlot.id) {
              state.selectedSlot = updatedSlot
            }
          })
        },
        
        removeSlot: (slotId: string) => {
          set((state) => {
            state.slots = state.slots.filter(s => s.id !== slotId)
            
            if (state.selectedSlot?.id === slotId) {
              state.selectedSlot = null
            }
          })
        }
      }))
    ),
    {
      name: 'slot-store'
    }
  )
)

// Selector hooks for performance optimization
export const useSlotAvailability = () => useSlotStore((state) => ({
  selectedDate: state.selectedDate,
  dateRange: state.dateRange,
  slots: state.slots,
  selectedSlot: state.selectedSlot,
  loading: state.loading,
  error: state.error,
  filters: state.filters,
  setSelectedDate: state.setSelectedDate,
  setDateRange: state.setDateRange,
  setSelectedSlot: state.setSelectedSlot,
  clearSelection: state.clearSelection,
  fetchAvailableSlots: state.fetchAvailableSlots,
  updateFilters: state.updateFilters,
  optimisticallyBookSlot: state.optimisticallyBookSlot,
  refreshSlotStatus: state.refreshSlotStatus
}))

export const useSlotManagement = () => useSlotStore((state) => ({
  templates: state.templates,
  loading: state.loading,
  error: state.error,
  fetchTemplates: state.fetchTemplates,
  createTemplate: state.createTemplate,
  updateTemplate: state.updateTemplate,
  deleteTemplate: state.deleteTemplate,
  generateSlotsFromTemplate: state.generateSlotsFromTemplate
}))

export const useSlotOptimistic = () => useSlotStore((state) => ({
  optimisticallyUpdateSlot: state.optimisticallyUpdateSlot,
  optimisticallyBookSlot: state.optimisticallyBookSlot,
  optimisticallyCancelSlot: state.optimisticallyCancelSlot,
  refreshSlotStatus: state.refreshSlotStatus
}))