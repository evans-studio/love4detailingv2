/**
 * Enhanced Schedule State Management
 * Enterprise-grade implementation with proper state synchronization patterns
 * Addresses critical toggle state management issues
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Types for enhanced state management
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

export interface MutationState {
  isLoading: boolean
  error: string | null
  operation: string | null
  targetId: string | null
}

export interface ScheduleState {
  // Data state
  weekOverview: DayOverview[]
  daySlots: DaySlot[]
  selectedDate: string | null
  currentWeekStart: string
  
  // UI state
  mutations: Record<string, MutationState>
  lastSync: number
  optimisticUpdates: Record<string, any>
  
  // Actions for data loading
  loadWeekOverview: (weekStart?: string) => Promise<void>
  loadDaySlots: (date: string) => Promise<void>
  setSelectedDate: (date: string) => void
  
  // Enhanced mutation actions
  toggleWorkingDayEnhanced: (date: string, isWorking: boolean) => Promise<void>
  addSlotEnhanced: (slotData: any) => Promise<void>
  deleteSlotEnhanced: (slotId: string) => Promise<void>
  
  // State management utilities
  setMutationState: (key: string, state: Partial<MutationState>) => void
  clearMutationState: (key: string) => void
  addOptimisticUpdate: (key: string, update: any) => void
  clearOptimisticUpdate: (key: string) => void
  revertOptimisticUpdate: (key: string) => void
  
  // Synchronization utilities
  refreshData: () => Promise<void>
  subscribeToChanges: (callback: (state: ScheduleState) => void) => () => void
}

// Create enhanced store with proper middleware
export const useScheduleStore: any = create<ScheduleState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      weekOverview: [],
      daySlots: [],
      selectedDate: null,
      currentWeekStart: '',
      mutations: {},
      lastSync: 0,
      optimisticUpdates: {},

      // Data loading actions
      loadWeekOverview: async (weekStart?: string) => {
        const state = get()
        const startDate = weekStart || state.currentWeekStart || getMonday(new Date()).toISOString().split('T')[0]
        
        set((draft) => {
          draft.mutations.loadWeekOverview = {
            isLoading: true,
            error: null,
            operation: 'loadWeekOverview',
            targetId: startDate
          }
        })

        try {
          const response = await fetch(`/api/admin/schedule?action=get_week_overview&week_start=${startDate}`)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const data = await response.json()
          
          if (data.error) {
            throw new Error(data.error)
          }

          set((draft) => {
            draft.weekOverview = data.data || []
            draft.currentWeekStart = startDate
            draft.lastSync = Date.now()
            draft.mutations.loadWeekOverview = {
              isLoading: false,
              error: null,
              operation: null,
              targetId: null
            }
          })
        } catch (error) {
          set((draft) => {
            draft.mutations.loadWeekOverview = {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load week overview',
              operation: null,
              targetId: null
            }
          })
          throw error
        }
      },

      loadDaySlots: async (date: string) => {
        set((draft) => {
          draft.mutations.loadDaySlots = {
            isLoading: true,
            error: null,
            operation: 'loadDaySlots',
            targetId: date
          }
        })

        try {
          const response = await fetch(`/api/admin/schedule?action=get_day_slots&date=${date}`)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const data = await response.json()
          
          if (data.error) {
            throw new Error(data.error)
          }

          set((draft) => {
            draft.daySlots = data.data || []
            draft.lastSync = Date.now()
            draft.mutations.loadDaySlots = {
              isLoading: false,
              error: null,
              operation: null,
              targetId: null
            }
          })
        } catch (error) {
          set((draft) => {
            draft.mutations.loadDaySlots = {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load day slots',
              operation: null,
              targetId: null
            }
          })
          throw error
        }
      },

      setSelectedDate: (date: string) => {
        set((draft) => {
          draft.selectedDate = date
        })
      },

      // Enhanced toggle working day with enterprise patterns
      toggleWorkingDayEnhanced: async (date: string, isWorking: boolean) => {
        const state = get()
        const mutationKey = `toggle_${date}`
        
        // Phase 1: Immediate optimistic update
        set((draft) => {
          // Set loading state
          draft.mutations[mutationKey] = {
            isLoading: true,
            error: null,
            operation: 'toggleWorkingDay',
            targetId: date
          }
          
          // Store optimistic update for potential rollback
          const dayIndex = draft.weekOverview.findIndex(day => day.day_date === date)
          if (dayIndex !== -1) {
            draft.optimisticUpdates[mutationKey] = {
              original: { ...draft.weekOverview[dayIndex] },
              updated: { ...draft.weekOverview[dayIndex], is_working_day: isWorking }
            }
            
            // Apply optimistic update
            draft.weekOverview[dayIndex].is_working_day = isWorking
            if (!isWorking) {
              draft.weekOverview[dayIndex].total_slots = 0
              draft.weekOverview[dayIndex].available_slots = 0
              draft.weekOverview[dayIndex].booked_slots = 0
            }
          }
        })

        try {
          // Phase 2: Execute API call
          const response = await fetch('/api/admin/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'toggle_working_day',
              date,
              is_working: isWorking
            })
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()

          if (data.error) {
            throw new Error(data.error)
          }

          // Phase 3: Selective refresh to prevent cascading updates
          // Use fresh state reference to avoid stale closures
          const freshState = get()
          const refreshPromises = []
          
          // Always refresh week overview
          refreshPromises.push(freshState.loadWeekOverview())
          
          // Only refresh day slots if this date is currently selected
          if (freshState.selectedDate === date) {
            refreshPromises.push(freshState.loadDaySlots(date))
          }
          
          await Promise.all(refreshPromises)

          // Phase 4: Clear optimistic update and loading state
          set((draft) => {
            delete draft.optimisticUpdates[mutationKey]
            draft.mutations[mutationKey] = {
              isLoading: false,
              error: null,
              operation: null,
              targetId: null
            }
          })

        } catch (error) {
          // Phase 5: Rollback optimistic update on failure
          set((draft) => {
            const optimisticUpdate = draft.optimisticUpdates[mutationKey]
            if (optimisticUpdate) {
              const dayIndex = draft.weekOverview.findIndex(day => day.day_date === date)
              if (dayIndex !== -1 && optimisticUpdate.original) {
                draft.weekOverview[dayIndex] = optimisticUpdate.original
              }
            }
            
            // Set error state
            draft.mutations[mutationKey] = {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to toggle working day',
              operation: null,
              targetId: null
            }
            
            // Clear optimistic update
            delete draft.optimisticUpdates[mutationKey]
          })
          
          throw error
        }
      },

      addSlotEnhanced: async (slotData: any) => {
        const mutationKey = `add_slot_${Date.now()}`
        const tempSlotId = `temp_${Date.now()}`
        
        set((draft) => {
          draft.mutations[mutationKey] = {
            isLoading: true,
            error: null,
            operation: 'addSlot',
            targetId: tempSlotId
          }
          
          // Optimistic update for new slot
          if (draft.selectedDate === slotData.slot_date) {
            const endTime = new Date(`2000-01-01T${slotData.start_time}`)
            endTime.setMinutes(endTime.getMinutes() + slotData.duration_minutes)
            
            const optimisticSlot: DaySlot = {
              slot_id: tempSlotId,
              start_time: slotData.start_time,
              end_time: endTime.toTimeString().slice(0, 8),
              duration_minutes: slotData.duration_minutes,
              max_bookings: slotData.max_bookings,
              current_bookings: 0,
              is_available: true
            }
            
            draft.optimisticUpdates[mutationKey] = { slot: optimisticSlot }
            draft.daySlots.push(optimisticSlot)
            draft.daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
          }
        })

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

          if (data.error || !data.data?.success) {
            throw new Error(data.error || data.data?.message || 'Failed to add slot')
          }

          // Selective refresh to prevent cascading updates
          // Use fresh state reference to avoid stale closures
          const freshState = get()
          const refreshPromises = []
          
          // Always refresh week overview
          refreshPromises.push(freshState.loadWeekOverview())
          
          // Only refresh day slots if a date is selected
          if (freshState.selectedDate) {
            refreshPromises.push(freshState.loadDaySlots(freshState.selectedDate))
          }
          
          await Promise.all(refreshPromises)

          set((draft) => {
            delete draft.optimisticUpdates[mutationKey]
            draft.mutations[mutationKey] = {
              isLoading: false,
              error: null,
              operation: null,
              targetId: null
            }
          })

        } catch (error) {
          // Rollback optimistic update
          set((draft) => {
            const optimisticUpdate = draft.optimisticUpdates[mutationKey]
            if (optimisticUpdate?.slot) {
              draft.daySlots = draft.daySlots.filter(slot => slot.slot_id !== tempSlotId)
            }
            
            draft.mutations[mutationKey] = {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to add slot',
              operation: null,
              targetId: null
            }
            
            delete draft.optimisticUpdates[mutationKey]
          })
          
          throw error
        }
      },

      deleteSlotEnhanced: async (slotId: string) => {
        const state = get()
        const mutationKey = `delete_slot_${slotId}`
        const slot = state.daySlots.find(s => s.slot_id === slotId)
        
        if (!slot) {
          throw new Error('Slot not found')
        }

        set((draft) => {
          draft.mutations[mutationKey] = {
            isLoading: true,
            error: null,
            operation: 'deleteSlot',
            targetId: slotId
          }
          
          // Store original slot for rollback
          draft.optimisticUpdates[mutationKey] = { slot }
          
          // Optimistic removal
          draft.daySlots = draft.daySlots.filter(s => s.slot_id !== slotId)
        })

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

          if (data.error || !data.data?.success) {
            throw new Error(data.error || data.data?.message || 'Failed to delete slot')
          }

          // Selective refresh to prevent cascading updates
          const freshState = get()
          const refreshPromises = []
          
          // Always refresh week overview
          refreshPromises.push(freshState.loadWeekOverview())
          
          // Only refresh day slots if a date is selected
          if (freshState.selectedDate) {
            refreshPromises.push(freshState.loadDaySlots(freshState.selectedDate))
          }
          
          await Promise.all(refreshPromises)

          set((draft) => {
            delete draft.optimisticUpdates[mutationKey]
            draft.mutations[mutationKey] = {
              isLoading: false,
              error: null,
              operation: null,
              targetId: null
            }
          })

        } catch (error) {
          // Rollback optimistic update
          set((draft) => {
            const optimisticUpdate = draft.optimisticUpdates[mutationKey]
            if (optimisticUpdate?.slot) {
              draft.daySlots.push(optimisticUpdate.slot)
              draft.daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
            }
            
            draft.mutations[mutationKey] = {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to delete slot',
              operation: null,
              targetId: null
            }
            
            delete draft.optimisticUpdates[mutationKey]
          })
          
          throw error
        }
      },

      // State management utilities
      setMutationState: (key: string, state: Partial<MutationState>) => {
        set((draft) => {
          draft.mutations[key] = { ...draft.mutations[key], ...state }
        })
      },

      clearMutationState: (key: string) => {
        set((draft) => {
          delete draft.mutations[key]
        })
      },

      addOptimisticUpdate: (key: string, update: any) => {
        set((draft) => {
          draft.optimisticUpdates[key] = update
        })
      },

      clearOptimisticUpdate: (key: string) => {
        set((draft) => {
          delete draft.optimisticUpdates[key]
        })
      },

      revertOptimisticUpdate: (key: string) => {
        // This would contain specific rollback logic based on update type
        console.warn(`Reverting optimistic update: ${key}`)
      },

      // Synchronization utilities
      refreshData: async () => {
        // Selective refresh to prevent cascading updates
        const freshState = get()
        const refreshPromises = []
        
        // Always refresh week overview
        refreshPromises.push(freshState.loadWeekOverview())
        
        // Only refresh day slots if a date is selected
        if (freshState.selectedDate) {
          refreshPromises.push(freshState.loadDaySlots(freshState.selectedDate))
        }
        
        await Promise.all(refreshPromises)
      },

      subscribeToChanges: (callback: (state: ScheduleState) => void) => {
        return useScheduleStore.subscribe(callback)
      }
    }))
  )
)

// Utility function to get Monday of current week
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Stable selector cache to prevent infinite loops
const selectorCache = new Map()

// Memoized selectors to fix getSnapshot caching warnings
const createMemoizedSelector = <T>(selector: (state: ScheduleState) => T) => {
  let lastState: ScheduleState | undefined
  let lastResult: T
  
  return (state: ScheduleState): T => {
    if (state === lastState) {
      return lastResult
    }
    
    lastState = state
    lastResult = selector(state)
    return lastResult
  }
}

// Selectors for optimized component subscriptions
// Using stable selectors to prevent infinite loops and getSnapshot warnings
export const scheduleSelectors = {
  weekOverview: createMemoizedSelector((state: ScheduleState) => state.weekOverview),
  daySlots: createMemoizedSelector((state: ScheduleState) => state.daySlots),
  selectedDate: createMemoizedSelector((state: ScheduleState) => state.selectedDate),
  mutations: createMemoizedSelector((state: ScheduleState) => state.mutations),
  
  isLoading: (state: ScheduleState) => {
    const loadingStates = Object.values(state.mutations).map(m => m.isLoading)
    const cacheKey = `isLoading_${loadingStates.join('_')}`
    const cached = selectorCache.get(cacheKey)
    
    if (cached !== undefined) return cached
    
    const result = loadingStates.some(Boolean)
    selectorCache.set(cacheKey, result)
    
    // Clean cache periodically to prevent memory leaks
    if (selectorCache.size > 100) {
      selectorCache.clear()
    }
    
    return result
  },
  
  errors: (state: ScheduleState) => {
    const errorStates = Object.values(state.mutations).map(m => m.error || null)
    const cacheKey = `errors_${errorStates.join('_')}`
    const cached = selectorCache.get(cacheKey)
    
    if (cached !== undefined) return cached
    
    const errors = errorStates.filter(Boolean)
    const result = errors.length > 0 ? errors : []
    selectorCache.set(cacheKey, result)
    
    // Clean cache periodically to prevent memory leaks
    if (selectorCache.size > 100) {
      selectorCache.clear()
    }
    
    return result
  },
  
  getMutationState: (key: string) => (state: ScheduleState) => state.mutations[key],
  getDayMutationState: (date: string) => (state: ScheduleState) => state.mutations[`toggle_${date}`]
}