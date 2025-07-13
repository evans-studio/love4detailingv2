import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Types
export interface DayOverview {
  day_date: string
  day_name: string
  is_working_day: boolean
  total_slots: number
  available_slots: number
  booked_slots: number
}

export interface DaySlot {
  slot_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  max_bookings: number
  current_bookings: number
  is_available: boolean
}

export interface AddSlotForm {
  slot_date: string
  start_time: string
  duration_minutes: number
  max_bookings: number
}

export interface Booking {
  booking_id: string
  booking_reference: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  slot_date: string
  slot_time: string
  service_name: string
  vehicle_registration: string
  vehicle_make: string
  vehicle_model: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  total_price_pence: number
  created_at: string
  updated_at: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Permissions {
  can_manage_schedule: boolean
  can_manage_bookings: boolean
  can_manage_customers: boolean
  can_view_analytics: boolean
  can_manage_users: boolean
  is_admin: boolean
}

// Store interface
export interface AppStore {
  // Schedule state
  schedule: {
    isLoading: boolean
    error: string | null
    lastUpdated: number
  }
  weekOverview: DayOverview[]
  selectedDate: string
  daySlots: DaySlot[]
  currentWeekStart: string
  
  // Booking state
  bookings: {
    isLoading: boolean
    error: string | null
    lastUpdated: number
    data: Booking[]
    total: number
    page: number
    limit: number
  }
  selectedSlot: any | null
  
  // UI state
  ui: {
    isLoading: boolean
    error: string | null
    success: string | null
    toasts: Toast[]
    theme: 'light' | 'dark'
    preferences: {
      notifications: boolean
      autoRefresh: boolean
      compactMode: boolean
    }
  }
  
  // Auth state
  auth: {
    user: User | null
    profile: Profile | null
    permissions: Permissions | null
    isLoading: boolean
    error: string | null
  }
  
  // Schedule actions
  setSelectedDate: (date: string) => void
  loadWeekOverview: (weekStart?: string) => Promise<void>
  loadDaySlots: (date: string) => Promise<void>
  toggleWorkingDay: (date: string, isWorking: boolean) => Promise<void>
  addSlot: (slotData: AddSlotForm) => Promise<void>
  deleteSlot: (slotId: string) => Promise<void>
  
  // Booking actions
  setSelectedSlot: (slot: any) => void
  loadBookings: (page?: number, limit?: number) => Promise<void>
  createBooking: (bookingData: any) => Promise<{ data: any; error: string | null }>
  updateBookingStatus: (bookingId: string, status: string) => Promise<void>
  cancelBooking: (bookingId: string, reason: string) => Promise<void>
  
  // UI actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setSuccess: (success: string | null) => void
  clearSuccess: () => void
  addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void
  removeToast: (id: string) => void
  clearAllToasts: () => void
  setTheme: (theme: 'light' | 'dark') => void
  updatePreferences: (preferences: Partial<AppStore['ui']['preferences']>) => void
  
  // Auth actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setPermissions: (permissions: Permissions | null) => void
  logout: () => void
  
  // Internal actions
  setScheduleLoading: (loading: boolean) => void
  setScheduleError: (error: string | null) => void
  updateWeekOverview: (overview: DayOverview[]) => void
  updateDaySlots: (slots: DaySlot[]) => void
  optimisticallyToggleWorkingDay: (date: string, isWorking: boolean) => void
  optimisticallyAddSlot: (slotData: AddSlotForm & { slot_id: string }) => void
  optimisticallyDeleteSlot: (slotId: string) => void
  setBookingLoading: (loading: boolean) => void
  setBookingError: (error: string | null) => void
  updateBookingsData: (bookings: Booking[], total: number, page: number) => void
  optimisticallyUpdateBookingStatus: (bookingId: string, status: string) => void
  setAuthLoading: (loading: boolean) => void
  setAuthError: (error: string | null) => void
}

// Helper function to get current week start
const getCurrentWeekStart = () => {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(today.setDate(diff)).toISOString().split('T')[0]
}

// Create the main store
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        schedule: {
          isLoading: false,
          error: null,
          lastUpdated: 0,
        },
        weekOverview: [],
        selectedDate: '',
        daySlots: [],
        currentWeekStart: getCurrentWeekStart(),
        
        bookings: {
          isLoading: false,
          error: null,
          lastUpdated: 0,
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        },
        selectedSlot: null,
        
        ui: {
          isLoading: false,
          error: null,
          success: null,
          toasts: [],
          theme: 'dark',
          preferences: {
            notifications: true,
            autoRefresh: true,
            compactMode: false,
          },
        },
        
        auth: {
          user: null,
          profile: null,
          permissions: null,
          isLoading: false,
          error: null,
        },

        // Schedule actions
        setSelectedDate: (date: string) => {
          set((state) => {
            state.selectedDate = date
          })
        },

        setScheduleLoading: (loading: boolean) => {
          set((state) => {
            state.schedule.isLoading = loading
          })
        },

        setScheduleError: (error: string | null) => {
          set((state) => {
            state.schedule.error = error
            if (error) {
              state.ui.toasts.push({
                id: Date.now().toString(),
                type: 'error',
                message: error,
                duration: 5000,
              })
            }
          })
        },

        updateWeekOverview: (overview: DayOverview[]) => {
          set((state) => {
            state.weekOverview = overview
            state.schedule.lastUpdated = Date.now()
          })
        },

        updateDaySlots: (slots: DaySlot[]) => {
          set((state) => {
            state.daySlots = slots
            state.schedule.lastUpdated = Date.now()
          })
        },

        optimisticallyToggleWorkingDay: (date: string, isWorking: boolean) => {
          set((state) => {
            const dayIndex = state.weekOverview.findIndex(day => day.day_date === date)
            if (dayIndex !== -1) {
              state.weekOverview[dayIndex].is_working_day = isWorking
              if (!isWorking) {
                state.weekOverview[dayIndex].total_slots = 0
                state.weekOverview[dayIndex].available_slots = 0
                state.weekOverview[dayIndex].booked_slots = 0
              }
            }
          })
        },

        optimisticallyAddSlot: (slotData: AddSlotForm & { slot_id: string }) => {
          set((state) => {
            if (state.selectedDate === slotData.slot_date) {
              const endTime = new Date(`2000-01-01T${slotData.start_time}`)
              endTime.setMinutes(endTime.getMinutes() + slotData.duration_minutes)
              
              state.daySlots.push({
                slot_id: slotData.slot_id,
                start_time: slotData.start_time,
                end_time: endTime.toTimeString().slice(0, 5),
                duration_minutes: slotData.duration_minutes,
                max_bookings: slotData.max_bookings,
                current_bookings: 0,
                is_available: true,
              })
            }

            const dayIndex = state.weekOverview.findIndex(day => day.day_date === slotData.slot_date)
            if (dayIndex !== -1) {
              state.weekOverview[dayIndex].total_slots += 1
              state.weekOverview[dayIndex].available_slots += 1
            }
          })
        },

        optimisticallyDeleteSlot: (slotId: string) => {
          set((state) => {
            const slotIndex = state.daySlots.findIndex(slot => slot.slot_id === slotId)
            if (slotIndex !== -1) {
              const slot = state.daySlots[slotIndex]
              state.daySlots.splice(slotIndex, 1)

              const dayIndex = state.weekOverview.findIndex(day => day.day_date === state.selectedDate)
              if (dayIndex !== -1) {
                state.weekOverview[dayIndex].total_slots -= 1
                if (slot.is_available) {
                  state.weekOverview[dayIndex].available_slots -= 1
                } else {
                  state.weekOverview[dayIndex].booked_slots -= 1
                }
              }
            }
          })
        },

        loadWeekOverview: async (weekStart?: string) => {
          const state = get()
          
          try {
            state.setScheduleLoading(true)
            state.setScheduleError(null)

            const currentWeek = weekStart || state.currentWeekStart
            const response = await fetch(`/api/admin/schedule?action=get_week_overview&week_start=${currentWeek}`)
            const data = await response.json()

            if (data.error) {
              state.setScheduleError(data.error)
            } else {
              state.updateWeekOverview(data.data || [])
              state.addToast({
                type: 'success',
                message: 'Schedule loaded successfully',
                duration: 3000,
              })
            }
          } catch (error) {
            state.setScheduleError('Failed to load week overview')
          } finally {
            state.setScheduleLoading(false)
          }
        },

        loadDaySlots: async (date: string) => {
          const state = get()
          
          try {
            state.setScheduleLoading(true)
            state.setScheduleError(null)

            const response = await fetch(`/api/admin/schedule?action=get_day_slots&date=${date}`)
            const data = await response.json()

            if (data.error) {
              state.setScheduleError(data.error)
            } else {
              state.updateDaySlots(data.data || [])
            }
          } catch (error) {
            state.setScheduleError('Failed to load day slots')
          } finally {
            state.setScheduleLoading(false)
          }
        },

        toggleWorkingDay: async (date: string, isWorking: boolean) => {
          const state = get()
          
          state.optimisticallyToggleWorkingDay(date, isWorking)

          try {
            const response = await fetch('/api/admin/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'toggle_working_day',
                date,
                is_working: isWorking
              })
            })

            const data = await response.json()

            if (data.error) {
              state.optimisticallyToggleWorkingDay(date, !isWorking)
              state.setScheduleError(data.error)
            } else {
              await Promise.all([
                state.loadWeekOverview(),
                state.selectedDate === date ? state.loadDaySlots(date) : Promise.resolve()
              ])

              state.addToast({
                type: 'success',
                message: `Working day ${isWorking ? 'enabled' : 'disabled'} successfully`,
                duration: 3000,
              })
            }
          } catch (error) {
            state.optimisticallyToggleWorkingDay(date, !isWorking)
            state.setScheduleError('Failed to toggle working day')
          }
        },

        addSlot: async (slotData: AddSlotForm) => {
          const state = get()
          const tempSlotId = `temp_${Date.now()}`
          
          state.optimisticallyAddSlot({ ...slotData, slot_id: tempSlotId })

          try {
            const response = await fetch('/api/admin/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add_slot',
                ...slotData
              })
            })

            const data = await response.json()

            if (data.error) {
              state.optimisticallyDeleteSlot(tempSlotId)
              state.setScheduleError(data.error)
            } else if (data.data?.success) {
              await Promise.all([
                state.loadWeekOverview(),
                state.selectedDate ? state.loadDaySlots(state.selectedDate) : Promise.resolve()
              ])

              state.addToast({
                type: 'success',
                message: 'Slot added successfully',
                duration: 3000,
              })
            } else {
              state.optimisticallyDeleteSlot(tempSlotId)
              state.setScheduleError(data.data?.message || 'Failed to add slot')
            }
          } catch (error) {
            state.optimisticallyDeleteSlot(tempSlotId)
            state.setScheduleError('Failed to add slot')
          }
        },

        deleteSlot: async (slotId: string) => {
          const state = get()
          const slot = state.daySlots.find(s => s.slot_id === slotId)
          if (!slot) return

          state.optimisticallyDeleteSlot(slotId)

          try {
            const response = await fetch('/api/admin/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'delete_slot',
                slot_id: slotId
              })
            })

            const data = await response.json()

            if (data.error) {
              set((state) => {
                state.daySlots.push(slot)
                const dayIndex = state.weekOverview.findIndex(day => day.day_date === state.selectedDate)
                if (dayIndex !== -1) {
                  state.weekOverview[dayIndex].total_slots += 1
                  if (slot.is_available) {
                    state.weekOverview[dayIndex].available_slots += 1
                  } else {
                    state.weekOverview[dayIndex].booked_slots += 1
                  }
                }
              })
              state.setScheduleError(data.error)
            } else if (data.data?.success) {
              await Promise.all([
                state.loadWeekOverview(),
                state.selectedDate ? state.loadDaySlots(state.selectedDate) : Promise.resolve()
              ])

              state.addToast({
                type: 'success',
                message: 'Slot deleted successfully',
                duration: 3000,
              })
            } else {
              set((state) => {
                state.daySlots.push(slot)
              })
              state.setScheduleError(data.data?.message || 'Failed to delete slot')
            }
          } catch (error) {
            set((state) => {
              state.daySlots.push(slot)
            })
            state.setScheduleError('Failed to delete slot')
          }
        },

        // Booking actions
        setSelectedSlot: (slot: any) => {
          set((state) => {
            state.selectedSlot = slot
          })
        },

        setBookingLoading: (loading: boolean) => {
          set((state) => {
            state.bookings.isLoading = loading
          })
        },

        setBookingError: (error: string | null) => {
          set((state) => {
            state.bookings.error = error
          })
        },

        updateBookingsData: (bookings: Booking[], total: number, page: number) => {
          set((state) => {
            state.bookings.data = bookings
            state.bookings.total = total
            state.bookings.page = page
            state.bookings.lastUpdated = Date.now()
          })
        },

        optimisticallyUpdateBookingStatus: (bookingId: string, status: string) => {
          set((state) => {
            const booking = state.bookings.data.find(b => b.booking_id === bookingId)
            if (booking) {
              booking.status = status as any
              booking.updated_at = new Date().toISOString()
            }
          })
        },

        loadBookings: async (page = 1, limit = 20) => {
          const state = get()
          
          try {
            state.setBookingLoading(true)
            state.setBookingError(null)

            const params = new URLSearchParams({
              page: page.toString(),
              limit: limit.toString(),
            })

            const response = await fetch(`/api/bookings/history?${params}`)
            const data = await response.json()

            if (data.error) {
              state.setBookingError(data.error)
            } else {
              state.updateBookingsData(data.data || [], data.total || 0, page)
            }
          } catch (error) {
            state.setBookingError('Failed to load bookings')
          } finally {
            state.setBookingLoading(false)
          }
        },

        createBooking: async (bookingData: any) => {
          const state = get()
          
          try {
            state.setBookingError(null)

            const response = await fetch('/api/bookings/enhanced/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ bookingData }),
            })

            if (!response.ok) {
              const { error } = await response.json()
              state.setBookingError(error || 'Failed to create booking')
              return { data: null, error: error || 'Failed to create booking' }
            }

            const { data } = await response.json()
            
            state.addToast({
              type: 'success',
              message: 'Booking created successfully!',
              duration: 5000,
            })

            return { data, error: null }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
            state.setBookingError(errorMessage)
            return { data: null, error: errorMessage }
          }
        },

        updateBookingStatus: async (bookingId: string, status: string) => {
          const state = get()
          const originalBooking = state.bookings.data.find(b => b.booking_id === bookingId)
          const originalStatus = originalBooking?.status

          state.optimisticallyUpdateBookingStatus(bookingId, status)

          try {
            const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status }),
            })

            const data = await response.json()

            if (data.error) {
              if (originalStatus) {
                state.optimisticallyUpdateBookingStatus(bookingId, originalStatus)
              }
              state.setBookingError(data.error)
            } else {
              await state.loadBookings(state.bookings.page, state.bookings.limit)
              
              state.addToast({
                type: 'success',
                message: `Booking status updated to ${status}`,
                duration: 3000,
              })
            }
          } catch (error) {
            if (originalStatus) {
              state.optimisticallyUpdateBookingStatus(bookingId, originalStatus)
            }
            state.setBookingError('Failed to update booking status')
          }
        },

        cancelBooking: async (bookingId: string, reason: string) => {
          const state = get()
          const originalBooking = state.bookings.data.find(b => b.booking_id === bookingId)
          const originalStatus = originalBooking?.status

          state.optimisticallyUpdateBookingStatus(bookingId, 'cancelled')

          try {
            const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ reason }),
            })

            const data = await response.json()

            if (data.error) {
              if (originalStatus) {
                state.optimisticallyUpdateBookingStatus(bookingId, originalStatus)
              }
              state.setBookingError(data.error)
            } else {
              await state.loadBookings(state.bookings.page, state.bookings.limit)
              
              state.addToast({
                type: 'success',
                message: 'Booking cancelled successfully',
                duration: 3000,
              })
            }
          } catch (error) {
            if (originalStatus) {
              state.optimisticallyUpdateBookingStatus(bookingId, originalStatus)
            }
            state.setBookingError('Failed to cancel booking')
          }
        },

        // UI actions
        setLoading: (loading: boolean) => {
          set((state) => {
            state.ui.isLoading = loading
          })
        },

        setError: (error: string | null) => {
          set((state) => {
            state.ui.error = error
            if (error) {
              const toast: Toast = {
                id: `error_${Date.now()}`,
                type: 'error',
                message: error,
                duration: 5000,
              }
              state.ui.toasts.push(toast)
            }
          })
        },

        clearError: () => {
          set((state) => {
            state.ui.error = null
          })
        },

        setSuccess: (success: string | null) => {
          set((state) => {
            state.ui.success = success
            if (success) {
              const toast: Toast = {
                id: `success_${Date.now()}`,
                type: 'success',
                message: success,
                duration: 3000,
              }
              state.ui.toasts.push(toast)
            }
          })
        },

        clearSuccess: () => {
          set((state) => {
            state.ui.success = null
          })
        },

        addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => {
          const newToast: Toast = {
            id: toast.id || `toast_${Date.now()}_${Math.random()}`,
            type: toast.type,
            message: toast.message,
            duration: toast.duration || 4000,
          }
          
          set((state) => {
            state.ui.toasts.push(newToast)
          })
          
          // Auto-remove toast after duration - capture the removeToast function reference
          if (newToast.duration && newToast.duration > 0) {
            const removeToastFn = get().removeToast
            setTimeout(() => {
              removeToastFn(newToast.id)
            }, newToast.duration)
          }
        },

        removeToast: (id: string) => {
          set((state) => {
            const index = state.ui.toasts.findIndex(toast => toast.id === id)
            if (index !== -1) {
              state.ui.toasts.splice(index, 1)
            }
          })
        },

        clearAllToasts: () => {
          set((state) => {
            state.ui.toasts = []
          })
        },

        setTheme: (theme: 'light' | 'dark') => {
          set((state) => {
            state.ui.theme = theme
          })
        },

        updatePreferences: (preferences: Partial<AppStore['ui']['preferences']>) => {
          set((state) => {
            state.ui.preferences = { ...state.ui.preferences, ...preferences }
          })
        },

        // Auth actions
        setUser: (user: User | null) => {
          set((state) => {
            state.auth.user = user
          })
        },

        setProfile: (profile: Profile | null) => {
          set((state) => {
            state.auth.profile = profile
          })
        },

        setPermissions: (permissions: Permissions | null) => {
          set((state) => {
            state.auth.permissions = permissions
          })
        },

        logout: () => {
          set((state) => {
            state.auth.user = null
            state.auth.profile = null
            state.auth.permissions = null
            state.auth.error = null
          })
          
          localStorage.removeItem('l4d-store')
          
          get().addToast({
            type: 'info',
            message: 'Logged out successfully',
            duration: 3000,
          })
        },

        setAuthLoading: (loading: boolean) => {
          set((state) => {
            state.auth.isLoading = loading
          })
        },

        setAuthError: (error: string | null) => {
          set((state) => {
            state.auth.error = error
          })
        },
      }))
    ),
    {
      name: 'love4detailing-store',
    }
  )
)

// Selector hooks for performance optimization
export const useScheduleStore = () => useAppStore((state) => ({
  schedule: state.schedule,
  weekOverview: state.weekOverview,
  selectedDate: state.selectedDate,
  daySlots: state.daySlots,
  currentWeekStart: state.currentWeekStart,
  isLoading: state.schedule.isLoading,
  error: state.schedule.error,
  toggleWorkingDay: state.toggleWorkingDay,
  addSlot: state.addSlot,
  deleteSlot: state.deleteSlot,
  loadWeekOverview: state.loadWeekOverview,
  loadDaySlots: state.loadDaySlots,
  setSelectedDate: state.setSelectedDate,
}))

export const useBookingStore = () => useAppStore((state) => ({
  bookings: state.bookings,
  selectedSlot: state.selectedSlot,
  isLoading: state.bookings.isLoading,
  error: state.bookings.error,
  createBooking: state.createBooking,
  updateBookingStatus: state.updateBookingStatus,
  loadBookings: state.loadBookings,
  setSelectedSlot: state.setSelectedSlot,
  cancelBooking: state.cancelBooking,
}))

export const useUIStore = () => useAppStore((state) => ({
  ui: state.ui,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  setSuccess: state.setSuccess,
  clearSuccess: state.clearSuccess,
  addToast: state.addToast,
  removeToast: state.removeToast,
  clearAllToasts: state.clearAllToasts,
  setTheme: state.setTheme,
  updatePreferences: state.updatePreferences,
}))

export const useAuthStore = () => useAppStore((state) => ({
  auth: state.auth,
  setUser: state.setUser,
  setProfile: state.setProfile,
  setPermissions: state.setPermissions,
  logout: state.logout,
  setAuthLoading: state.setAuthLoading,
  setAuthError: state.setAuthError,
}))

// Store persistence
export const persistStore = () => {
  const state = useAppStore.getState()
  localStorage.setItem('l4d-store', JSON.stringify({
    auth: state.auth,
    ui: {
      theme: state.ui.theme,
      preferences: state.ui.preferences,
    }
  }))
}

export const loadPersistedState = () => {
  try {
    const persistedState = localStorage.getItem('l4d-store')
    if (persistedState) {
      const parsed = JSON.parse(persistedState)
      const store = useAppStore.getState()
      
      if (parsed.auth) {
        store.setUser(parsed.auth.user)
        store.setProfile(parsed.auth.profile)
        store.setPermissions(parsed.auth.permissions)
      }
      
      if (parsed.ui) {
        if (parsed.ui.theme) {
          store.setTheme(parsed.ui.theme)
        }
        if (parsed.ui.preferences) {
          store.updatePreferences(parsed.ui.preferences)
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load persisted state:', error)
  }
}

// Subscribe to store changes for persistence
useAppStore.subscribe(
  (state) => state.auth,
  () => persistStore()
)

useAppStore.subscribe(
  (state) => state.ui.theme,
  () => persistStore()
) 