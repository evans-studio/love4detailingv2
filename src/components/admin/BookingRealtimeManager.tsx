'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, 
  WifiOff, 
  Activity,
  Bell,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface RealtimeNotification {
  id: string
  type: 'booking_created' | 'booking_updated' | 'booking_cancelled' | 'status_changed'
  title: string
  message: string
  timestamp: string
  booking_id?: string
  customer_name?: string
  booking_reference?: string
  read: boolean
}

interface BookingRealtimeManagerProps {
  onBookingUpdate?: () => void
  onNotification?: (notification: RealtimeNotification) => void
}

export default function BookingRealtimeManager({ 
  onBookingUpdate, 
  onNotification 
}: BookingRealtimeManagerProps) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Initialize Supabase client for real-time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const addNotification = useCallback((notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `notification-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    }

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]) // Keep only 10 notifications
    setUnreadCount(prev => prev + 1)
    
    // Call external notification handler
    onNotification?.(newNotification)

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/logo.png',
        tag: newNotification.id
      })
    }
  }, [onNotification])

  useEffect(() => {
    if (!user?.id) return

    console.log('🔌 Setting up real-time booking subscriptions...')

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Subscribe to bookings table changes
    const bookingsChannel = supabase
      .channel('admin_bookings_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('📊 Real-time booking change:', payload)
          
          const { eventType, new: newRecord, old: oldRecord } = payload
          
          // Trigger booking update callback
          onBookingUpdate?.()

          // Create appropriate notification based on event type
          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                addNotification({
                  type: 'booking_created',
                  title: 'New Booking Created',
                  message: `Booking ${newRecord.booking_reference} has been created`,
                  booking_id: newRecord.id,
                  booking_reference: newRecord.booking_reference
                })
              }
              break

            case 'UPDATE':
              if (newRecord && oldRecord) {
                // Check if status changed
                if (newRecord.status !== oldRecord.status) {
                  addNotification({
                    type: 'status_changed',
                    title: 'Booking Status Updated',
                    message: `Booking ${newRecord.booking_reference} status changed from ${oldRecord.status} to ${newRecord.status}`,
                    booking_id: newRecord.id,
                    booking_reference: newRecord.booking_reference
                  })
                } else {
                  addNotification({
                    type: 'booking_updated',
                    title: 'Booking Updated',
                    message: `Booking ${newRecord.booking_reference} has been modified`,
                    booking_id: newRecord.id,
                    booking_reference: newRecord.booking_reference
                  })
                }
              }
              break

            case 'DELETE':
              if (oldRecord) {
                addNotification({
                  type: 'booking_cancelled',
                  title: 'Booking Cancelled',
                  message: `Booking ${oldRecord.booking_reference} has been cancelled`,
                  booking_reference: oldRecord.booking_reference
                })
              }
              break
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Bookings subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Subscribe to admin activity log for other admin actions
    const activityChannel = supabase
      .channel('admin_activity_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_activity_log',
          filter: `admin_user_id.neq.${user.id}` // Don't show our own actions
        },
        (payload) => {
          console.log('👤 Admin activity detected:', payload)
          
          const activity = payload.new
          if (activity) {
            addNotification({
              type: 'booking_updated',
              title: 'Admin Action',
              message: `${activity.action_description} by another admin`,
              booking_id: activity.target_id
            })
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      console.log('🔌 Cleaning up real-time subscriptions')
      bookingsChannel.unsubscribe()
      activityChannel.unsubscribe()
      setIsConnected(false)
    }
  }, [user?.id, onBookingUpdate, addNotification])

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'booking_created':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'booking_updated':
        return <Activity className="h-4 w-4 text-blue-400" />
      case 'booking_cancelled':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'status_changed':
        return <Bell className="h-4 w-4 text-purple-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Connection Status */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg backdrop-blur-md transition-all ${
        isConnected 
          ? 'bg-green-500/20 border border-green-500/30' 
          : 'bg-red-500/20 border border-red-500/30'
      }`}>
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-400" />
        )}
        <span className={`text-sm font-medium ${
          isConnected ? 'text-green-300' : 'text-red-300'
        }`}>
          {isConnected ? 'Live Updates' : 'Disconnected'}
        </span>
        {unreadCount > 0 && (
          <Badge className="bg-red-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center">
            {unreadCount}
          </Badge>
        )}
      </div>

      {/* Recent Notifications (Show only if there are unread notifications) */}
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="max-w-sm bg-gray-900/95 backdrop-blur-md border border-purple-500/20 rounded-lg shadow-xl">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Live Updates</h4>
            <button
              onClick={markAllAsRead}
              className="text-xs text-purple-300 hover:text-purple-200"
            >
              Mark all read
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-purple-500/10' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      !notification.read ? 'text-white' : 'text-white/70'
                    }`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {notifications.length > 5 && (
            <div className="p-2 text-center border-t border-white/10">
              <span className="text-xs text-white/60">
                {notifications.length - 5} more notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}