'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  action_url?: string
  action_data?: any
  read_at?: string
  created_at: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string
  icon?: string
  metadata?: any
}

interface NotificationsResponse {
  success: boolean
  notifications: Notification[]
  unread_count: number
  message?: string
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        user_id: user.id,
        limit: '20',
        unread_only: unreadOnly.toString()
      })

      const response = await fetch(`/api/admin/notifications?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: NotificationsResponse = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch notifications')
      }

      setNotifications(result.notifications)
      setUnreadCount(result.unread_count)

    } catch (error) {
      console.error('Error fetching notifications:', error)
      setError(error instanceof Error ? error.message : 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return false

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          notification_id: notificationId,
          user_id: user.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      const result = await response.json()
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read_at: new Date().toISOString() }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        return true
      }

      return false
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }, [user?.id])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_all_read',
          user_id: user.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      const result = await response.json()
      
      if (result.success) {
        // Update local state
        const now = new Date().toISOString()
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read_at: now }))
        )
        setUnreadCount(0)
        return true
      }

      return false
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }, [user?.id])

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read_at) {
      await markAsRead(notification.id)
    }

    // Navigate to the action URL if provided
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }, [markAsRead])

  // Get notification icon component name
  const getNotificationIcon = useCallback((notification: Notification) => {
    if (notification.icon) return notification.icon

    // Default icons based on type
    switch (notification.type) {
      case 'new_booking': return 'Calendar'
      case 'booking_cancelled': return 'XCircle'
      case 'booking_completed': return 'CheckCircle'
      case 'payment_received': return 'DollarSign'
      case 'new_customer': return 'Users'
      case 'system_alert': return 'AlertTriangle'
      case 'revenue_milestone': return 'TrendingUp'
      case 'service_reminder': return 'Clock'
      default: return 'Bell'
    }
  }, [])

  // Format time ago
  const formatTimeAgo = useCallback((timestamp: string) => {
    const now = new Date()
    const notificationTime = new Date(timestamp)
    const diffMs = now.getTime() - notificationTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return notificationTime.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  // Auto-refresh notifications
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
      
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [user?.id, fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    getNotificationIcon,
    formatTimeAgo
  }
}