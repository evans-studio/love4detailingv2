import { QueryClient, DefaultOptions } from '@tanstack/react-query'
import { useAppStore } from '../store'

// Default query options for the entire application
const queryConfig: DefaultOptions = {
  queries: {
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache data for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry failed requests 3 times with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry for 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Refetch on window focus for critical data
    refetchOnWindowFocus: true,
    // Don't refetch on reconnect to avoid unnecessary API calls
    refetchOnReconnect: false,
    // Background refetch interval for real-time data
    refetchInterval: (query) => {
      // Refetch schedule data every 30 seconds when focused
      if (query.queryKey[0] === 'schedule' && document.hasFocus()) {
        return 30 * 1000
      }
      // Refetch bookings every 60 seconds when focused
      if (query.queryKey[0] === 'bookings' && document.hasFocus()) {
        return 60 * 1000
      }
      return false
    },
  },
  mutations: {
    // Retry mutations once on network errors
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      return failureCount < 1
    },
    // Global error handler for mutations
    onError: (error: any) => {
      const store = useAppStore.getState()
      store.addToast({
        type: 'error',
        message: error?.message || 'An error occurred',
        duration: 5000,
      })
    },
  },
}

// Create the query client with our configuration
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
})

// Query key factories for consistent cache management
export const queryKeys = {
  // Schedule queries
  schedule: {
    all: ['schedule'] as const,
    weekOverview: (weekStart: string) => ['schedule', 'week-overview', weekStart] as const,
    daySlots: (date: string) => ['schedule', 'day-slots', date] as const,
    workingDays: () => ['schedule', 'working-days'] as const,
  },
  
  // Booking queries
  bookings: {
    all: ['bookings'] as const,
    list: (page: number, limit: number) => ['bookings', 'list', { page, limit }] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
    history: (filters?: any) => ['bookings', 'history', filters] as const,
    availableSlots: (params: {
      dateStart: string
      dateEnd: string
      serviceId?: string
      vehicleSize?: string
    }) => ['bookings', 'available-slots', params] as const,
  },
  
  // Vehicle queries
  vehicles: {
    all: ['vehicles'] as const,
    list: () => ['vehicles', 'list'] as const,
    detail: (id: string) => ['vehicles', 'detail', id] as const,
  },
  
  // User/Auth queries
  auth: {
    all: ['auth'] as const,
    profile: () => ['auth', 'profile'] as const,
    permissions: () => ['auth', 'permissions'] as const,
    session: () => ['auth', 'session'] as const,
  },
  
  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    revenue: (period: string) => ['analytics', 'revenue', period] as const,
    bookings: (period: string) => ['analytics', 'bookings', period] as const,
    customers: (period: string) => ['analytics', 'customers', period] as const,
  },
}

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate all schedule-related queries
  invalidateSchedule: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all })
  },
  
  // Invalidate all booking-related queries
  invalidateBookings: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
  },
  
  // Invalidate specific week overview
  invalidateWeekOverview: (weekStart: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule.weekOverview(weekStart) })
  },
  
  // Invalidate specific day slots
  invalidateDaySlots: (date: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule.daySlots(date) })
  },
  
  // Update booking in cache optimistically
  updateBookingInCache: (bookingId: string, updates: Partial<any>) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.bookings.all },
      (oldData: any) => {
        if (!oldData?.data) return oldData
        
        const updatedData = oldData.data.map((booking: any) =>
          booking.booking_id === bookingId ? { ...booking, ...updates } : booking
        )
        
        return { ...oldData, data: updatedData }
      }
    )
  },
  
  // Add new booking to cache optimistically
  addBookingToCache: (newBooking: any) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.bookings.all },
      (oldData: any) => {
        if (!oldData?.data) return oldData
        
        return {
          ...oldData,
          data: [newBooking, ...oldData.data],
          total: oldData.total + 1,
        }
      }
    )
  },
  
  // Remove booking from cache optimistically
  removeBookingFromCache: (bookingId: string) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.bookings.all },
      (oldData: any) => {
        if (!oldData?.data) return oldData
        
        const filteredData = oldData.data.filter((booking: any) => booking.booking_id !== bookingId)
        
        return {
          ...oldData,
          data: filteredData,
          total: Math.max(0, oldData.total - 1),
        }
      }
    )
  },
  
  // Prefetch next page of bookings
  prefetchNextBookings: (currentPage: number, limit: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.bookings.list(currentPage + 1, limit),
      queryFn: async () => {
        const params = new URLSearchParams({
          page: (currentPage + 1).toString(),
          limit: limit.toString(),
        })
        
        const response = await fetch(`/api/bookings/history?${params}`)
        if (!response.ok) throw new Error('Failed to fetch bookings')
        
        return response.json()
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  },
  
  // Clear all cached data (useful for logout)
  clearAllCache: () => {
    queryClient.clear()
  },
  
  // Get cached data without triggering a fetch
  getCachedBookings: () => {
    return queryClient.getQueryData(queryKeys.bookings.all)
  },
  
  getCachedWeekOverview: (weekStart: string) => {
    return queryClient.getQueryData(queryKeys.schedule.weekOverview(weekStart))
  },
}

// Error handling utilities
export const errorUtils = {
  // Extract error message from various error types
  getErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.error) return error.error
    if (error?.response?.data?.error) return error.response.data.error
    return 'An unexpected error occurred'
  },
  
  // Check if error is a network error
  isNetworkError: (error: any): boolean => {
    return error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR'
  },
  
  // Check if error is a server error (5xx)
  isServerError: (error: any): boolean => {
    return error?.status >= 500 && error?.status < 600
  },
  
  // Check if error is a client error (4xx)
  isClientError: (error: any): boolean => {
    return error?.status >= 400 && error?.status < 500
  },
  
  // Handle authentication errors
  handleAuthError: (error: any) => {
    if (error?.status === 401) {
      const store = useAppStore.getState()
      store.logout()
      store.addToast({
        type: 'warning',
        message: 'Session expired. Please log in again.',
        duration: 5000,
      })
    }
  },
}

// Performance monitoring utilities
export const performanceUtils = {
  // Log slow queries for monitoring
  logSlowQuery: (queryKey: any, duration: number) => {
    if (duration > 2000) { // Log queries taking more than 2 seconds
      console.warn(`Slow query detected:`, {
        queryKey,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
    }
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: JSON.stringify(cache).length,
    }
  },
}

// Real-time synchronization utilities
export const realtimeUtils = {
  // Sync schedule changes across components
  syncScheduleUpdate: (date: string, updates: any) => {
    // Update week overview cache
    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    
    cacheUtils.invalidateWeekOverview(weekStartStr)
    cacheUtils.invalidateDaySlots(date)
    
    // Update Zustand store
    const store = useAppStore.getState()
    store.loadWeekOverview(weekStartStr)
    if (store.selectedDate === date) {
      store.loadDaySlots(date)
    }
  },
  
  // Sync booking changes across components
  syncBookingUpdate: (bookingId: string, updates: any) => {
    // Update cache optimistically
    cacheUtils.updateBookingInCache(bookingId, updates)
    
    // Update Zustand store
    const store = useAppStore.getState()
    store.optimisticallyUpdateBookingStatus(bookingId, updates.status)
    
    // Invalidate related queries
    cacheUtils.invalidateBookings()
    
    // If booking affects schedule, update schedule too
    if (updates.status === 'cancelled' || updates.status === 'completed') {
      if (updates.slot_date) {
        realtimeUtils.syncScheduleUpdate(updates.slot_date, {})
      }
    }
  },
} 