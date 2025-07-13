'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell,
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
  Filter,
  MarkAsRead
} from 'lucide-react'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    handleNotificationClick,
    getNotificationIcon,
    formatTimeAgo,
    markAllAsRead
  } = useNotifications()

  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Icon component mapping
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Calendar,
      CheckCircle,
      XCircle,
      DollarSign,
      Users,
      AlertTriangle,
      TrendingUp,
      Clock,
      Bell
    }
    return icons[iconName] || Bell
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read_at)
    : notifications

  const handleRefresh = () => {
    fetchNotifications(filter === 'unread')
  }

  return (
    <AdminLayout title="Notifications" subtitle="Manage system notifications and alerts">
      <div className="p-4 lg:p-6 space-y-6">
        
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : 'border-white/20 text-white/70 hover:text-white'}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'bg-purple-600 hover:bg-purple-700' : 'border-white/20 text-white/70 hover:text-white'}
            >
              Unread ({unreadCount})
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
              >
                <MarkAsRead className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-white/70">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white/70 mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-white/50">
                  {filter === 'unread' 
                    ? 'All notifications have been read' 
                    : 'You\'re all caught up! New notifications will appear here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const IconComponent = getIconComponent(getNotificationIcon(notification))
              const isUnread = !notification.read_at
              
              return (
                <Card 
                  key={notification.id}
                  className={`bg-gray-800/40 border-purple-500/20 cursor-pointer transition-all hover:bg-gray-700/40 ${
                    isUnread ? 'ring-1 ring-purple-500/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        notification.priority === 'high' || notification.priority === 'urgent'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-white truncate">
                            {notification.title}
                          </h3>
                          {isUnread && (
                            <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                          )}
                          <Badge 
                            className={`text-xs px-2 py-1 ${
                              notification.priority === 'urgent' 
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : notification.priority === 'high'
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {notification.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-white/70 mb-3">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>{formatTimeAgo(notification.created_at)}</span>
                          <span className="capitalize">{notification.category}</span>
                        </div>
                      </div>

                      {/* Action Indicator */}
                      {notification.action_url && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Load More */}
        {filteredNotifications.length >= 20 && (
          <div className="text-center">
            <Button
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
              onClick={handleRefresh}
            >
              Load More Notifications
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}