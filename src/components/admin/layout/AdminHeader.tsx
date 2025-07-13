'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PortalDropdown from '@/components/ui/PortalDropdown'
import { 
  Menu, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Search,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'

interface AdminHeaderProps {
  onMenuClick?: () => void
  title?: string
  subtitle?: string
}

export default function AdminHeader({ onMenuClick, title, subtitle }: AdminHeaderProps) {
  const { profile, signOut } = useAuth()
  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    handleNotificationClick,
    getNotificationIcon,
    formatTimeAgo,
    markAllAsRead
  } = useNotifications()
  
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  
  // Refs for portal dropdown positioning
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null)
  const profileTriggerRef = useRef<HTMLButtonElement>(null)

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

  const handleSignOut = async () => {
    try {
      setProfileDropdownOpen(false)
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  return (
    <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-[100]">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">
                {title || 'Love4Detailing Admin'}
              </h1>
              {subtitle && (
                <p className="text-xs text-white/60">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Center Section - Date/Time (Desktop only) */}
        <div className="hidden lg:flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-sm text-white/70">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span>{getCurrentDate()}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-white/70">
            <Clock className="h-4 w-4 text-purple-400" />
            <span>{getCurrentTime()}</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Search Button (Mobile) */}
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              ref={notificationsTriggerRef}
              variant="outline"
              size="sm"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10"
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {/* Notification Badge */}
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-red-500 text-white text-xs"
                  aria-label={`${unreadCount} unread notifications`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>

            {/* Portal-based Notifications Dropdown */}
            <PortalDropdown
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
              triggerRef={notificationsTriggerRef}
              align="right"
              className="w-80"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
                    <p className="text-xs text-white/60 mt-2">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center">
                    <Bell className="h-8 w-8 text-white/30 mx-auto mb-2" />
                    <p className="text-sm text-white/60">No notifications</p>
                    <p className="text-xs text-white/40">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const IconComponent = getIconComponent(getNotificationIcon(notification))
                    const isUnread = !notification.read_at
                    
                    return (
                      <button
                        key={notification.id}
                        onClick={() => {
                          handleNotificationClick(notification)
                          setNotificationsOpen(false)
                        }}
                        className={`w-full p-3 text-left border-b border-white/5 hover:bg-white/5 focus:bg-white/10 focus:outline-none transition-colors ${
                          isUnread ? 'bg-purple-500/5' : ''
                        }`}
                        role="menuitem"
                        tabIndex={0}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 p-1 rounded-md ${
                            notification.priority === 'high' || notification.priority === 'urgent'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">
                                {notification.title}
                              </p>
                              {isUnread && (
                                <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            <p className="text-xs text-white/70 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-white/50 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-3 border-t border-white/10">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-purple-500/20 text-purple-300 hover:bg-purple-600/10"
                    onClick={() => {
                      window.location.href = '/admin/notifications'
                      setNotificationsOpen(false)
                    }}
                  >
                    View All Notifications
                  </Button>
                </div>
              )}
            </PortalDropdown>
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <Button
              ref={profileTriggerRef}
              variant="outline"
              size="sm"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10"
              aria-expanded={profileDropdownOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{profile?.full_name || 'Admin'}</span>
            </Button>

            {/* Portal-based Profile Dropdown */}
            <PortalDropdown
              isOpen={profileDropdownOpen}
              onClose={() => setProfileDropdownOpen(false)}
              triggerRef={profileTriggerRef}
              align="right"
              className="w-48"
            >
              <div className="p-3 border-b border-white/10">
                <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                <p className="text-xs text-white/60">{profile?.role}</p>
              </div>
              
              <div className="p-2">
                <button 
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors focus:bg-white/10 focus:outline-none"
                  role="menuitem"
                  tabIndex={0}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-red-500/20 rounded-md transition-colors focus:bg-red-500/20 focus:outline-none"
                  role="menuitem"
                  tabIndex={0}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </PortalDropdown>
          </div>
        </div>
      </div>

      {/* Mobile Date/Time Bar */}
      <div className="lg:hidden px-4 py-2 bg-black/20 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{getCurrentDate()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{getCurrentTime()}</span>
          </div>
        </div>
      </div>

    </header>
  )
}