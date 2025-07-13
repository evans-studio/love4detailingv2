'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface BookingUpdate {
  booking_id: string
  booking_reference: string
  status: string
  last_status_change: string
  status_change_reason?: string
  reschedule_count: number
  current_slot?: {
    id: string
    date: string
    time: string
    status: string
    formatted_date: string
    formatted_time: string
  }
  reschedule_request?: {
    id: string
    status: 'pending' | 'approved' | 'declined'
    requested_at: string
    responded_at?: string
    admin_notes?: string
    requested_slot?: {
      date: string
      time: string
      formatted_date: string
      formatted_time: string
    }
  }
  has_updates: boolean
}

interface StatusUpdatesSummary {
  total_bookings_checked: number
  bookings_with_updates: number
  pending_reschedule_requests: number
  recent_status_changes: number
  check_timestamp: string
}

interface UseBookingStatusUpdatesOptions {
  bookingIds?: string[]
  pollingInterval?: number // milliseconds
  enabled?: boolean
}

interface UseBookingStatusUpdatesReturn {
  updates: BookingUpdate[]
  summary: StatusUpdatesSummary | null
  loading: boolean
  error: string | null
  lastCheckTime: string | null
  hasNewUpdates: boolean
  markAsRead: () => void
  forceRefresh: () => Promise<void>
}

export function useBookingStatusUpdates({
  bookingIds = [],
  pollingInterval = 30000, // 30 seconds
  enabled = true
}: UseBookingStatusUpdatesOptions = {}): UseBookingStatusUpdatesReturn {
  const [updates, setUpdates] = useState<BookingUpdate[]>([])
  const [summary, setSummary] = useState<StatusUpdatesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null)
  const [hasNewUpdates, setHasNewUpdates] = useState(false)
  
  const lastCheckTimeRef = useRef<string | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  const fetchUpdates = useCallback(async (useLastCheckTime = true) => {
    if (isPollingRef.current) return // Prevent concurrent requests
    
    try {
      isPollingRef.current = true
      setError(null)
      
      // Build query parameters
      const params = new URLSearchParams()
      
      if (useLastCheckTime && lastCheckTimeRef.current) {
        params.append('last_check', lastCheckTimeRef.current)
      }
      
      if (bookingIds.length > 0) {
        params.append('booking_ids', bookingIds.join(','))
      }

      const url = `/api/customer/booking-status-updates?${params.toString()}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch updates: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        const newUpdates = result.data.updates || []
        const newSummary = result.data.summary || null
        const currentTime = result.data.last_check_time
        
        setUpdates(newUpdates)
        setSummary(newSummary)
        setLastCheckTime(currentTime)
        lastCheckTimeRef.current = currentTime
        
        // Check if there are new updates since last check
        if (useLastCheckTime && newSummary?.bookings_with_updates > 0) {
          setHasNewUpdates(true)
        }
      } else {
        throw new Error(result.error || 'Failed to fetch updates')
      }
    } catch (err) {
      console.error('Error fetching booking status updates:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch updates')
    } finally {
      setLoading(false)
      isPollingRef.current = false
    }
  }, [bookingIds])

  const forceRefresh = useCallback(async () => {
    setLoading(true)
    await fetchUpdates(false) // Don't use last check time for force refresh
  }, [fetchUpdates])

  const markAsRead = useCallback(() => {
    setHasNewUpdates(false)
  }, [])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchUpdates(false) // Initial fetch doesn't use last check time
    }
  }, [enabled, fetchUpdates])

  // Set up polling
  useEffect(() => {
    if (!enabled) return

    const startPolling = () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
      
      pollingTimeoutRef.current = setTimeout(() => {
        fetchUpdates(true).finally(() => {
          if (enabled) {
            startPolling() // Schedule next poll
          }
        })
      }, pollingInterval)
    }

    // Start polling after initial fetch
    if (!loading) {
      startPolling()
    }

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
    }
  }, [enabled, pollingInterval, loading, fetchUpdates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
    }
  }, [])

  return {
    updates,
    summary,
    loading,
    error,
    lastCheckTime,
    hasNewUpdates,
    markAsRead,
    forceRefresh
  }
}

// Helper hook for single booking status updates
export function useBookingStatus(bookingId: string, pollingInterval?: number) {
  const {
    updates,
    summary,
    loading,
    error,
    lastCheckTime,
    hasNewUpdates,
    markAsRead,
    forceRefresh
  } = useBookingStatusUpdates({
    bookingIds: [bookingId],
    pollingInterval,
    enabled: !!bookingId
  })

  const bookingUpdate = updates.find(update => update.booking_id === bookingId)

  return {
    booking: bookingUpdate || null,
    summary,
    loading,
    error,
    lastCheckTime,
    hasNewUpdates,
    markAsRead,
    forceRefresh
  }
}

// Helper hook for notification management
export function useBookingNotifications() {
  const {
    updates,
    summary,
    hasNewUpdates,
    markAsRead
  } = useBookingStatusUpdates({
    pollingInterval: 60000, // Check every minute for notifications
    enabled: true
  })

  const notifications = updates
    .filter(update => update.has_updates)
    .map(update => ({
      id: update.booking_id,
      title: `Booking ${update.booking_reference} Updated`,
      message: update.status_change_reason || `Status changed to ${update.status}`,
      type: update.status === 'reschedule_approved' ? 'success' : 
            update.status === 'reschedule_declined' ? 'error' : 'info',
      timestamp: update.last_status_change,
      booking_id: update.booking_id
    }))

  return {
    notifications,
    unreadCount: notifications.length,
    hasNewNotifications: hasNewUpdates,
    markAllAsRead: markAsRead,
    pendingRescheduleRequests: summary?.pending_reschedule_requests || 0,
    recentStatusChanges: summary?.recent_status_changes || 0
  }
}