'use client'

/**
 * Customer Dashboard Sidebar
 * Navigation for customer dashboard sections
 * 
 * Navigation Structure:
 * - My Bookings (existing)
 * - My Profile (Phase 1.2 target)
 * - My Vehicles (Phase 1.2 component)
 * - Book Again (quick booking)
 * - Settings (preferences, notifications)
 * - Support (help, contact)
 */

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import { 
  Calendar, 
  User, 
  Car, 
  RefreshCw, 
  Settings, 
  HelpCircle, 
  LogOut,
  Badge as BadgeIcon,
  Bell,
  CreditCard,
  Heart,
  Star,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Navigation items with status and upcoming features
const navigationItems = [
  {
    title: 'My Bookings',
    href: '/dashboard/bookings',
    icon: Calendar,
    description: 'View and manage your bookings',
    status: 'active',
    badge: null
  },
  {
    title: 'My Profile',
    href: '/dashboard/profile',
    icon: User,
    description: 'Personal details and account settings',
    status: 'active',
    badge: null
  },
  {
    title: 'My Vehicles',
    href: '/dashboard/vehicles',
    icon: Car,
    description: 'Manage your vehicle information',
    status: 'active',
    badge: null
  },
  {
    title: 'Book Again',
    href: '/dashboard/book-again',
    icon: RefreshCw,
    description: 'Quick rebooking from past services',
    status: 'coming-soon',
    badge: 'Soon'
  },
  {
    title: 'My Rewards',
    href: '/dashboard/rewards',
    icon: Star,
    description: 'Points, tiers, and loyalty benefits',
    status: 'coming-soon',
    badge: 'Phase 4'
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Preferences and notifications',
    status: 'coming-soon',
    badge: 'Soon'
  },
  {
    title: 'Support',
    href: '/dashboard/support',
    icon: HelpCircle,
    description: 'Help center and contact support',
    status: 'coming-soon',
    badge: 'Soon'
  }
]

// Quick actions for frequently used features
const quickActions = [
  {
    title: 'Book Service',
    href: '/booking',
    icon: Calendar,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    title: 'Emergency',
    href: '/dashboard/support?type=emergency',
    icon: Bell,
    color: 'bg-red-500 hover:bg-red-600'
  }
]

interface CustomerSidebarProps {
  className?: string
}

export default function CustomerSidebar({ className }: CustomerSidebarProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  
  console.log('CustomerSidebar: Current pathname:', pathname)
  console.log('CustomerSidebar: Profile data:', profile)

  const handleSignOut = async () => {
    try {
      console.log('CustomerSidebar: Starting sign out process')
      await signOut()
      console.log('CustomerSidebar: Sign out completed')
      // Redirect will be handled by the auth context
    } catch (error) {
      console.error('CustomerSidebar: Error signing out:', error)
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-card border-r border-border', className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Car className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Love4Detailing</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            My Account
          </h2>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              const isDisabled = item.status === 'coming-soon'
              
              const content = (
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive && !isDisabled && 'bg-primary text-primary-foreground',
                  !isActive && !isDisabled && 'hover:bg-accent hover:text-accent-foreground',
                  isDisabled && 'text-muted-foreground cursor-not-allowed opacity-60'
                )}>
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {!isDisabled && (
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  )}
                </div>
              )

              if (isDisabled) {
                return (
                  <div key={item.href} title={`${item.title} - ${item.description}`}>
                    {content}
                  </div>
                )
              }

              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  title={item.description}
                  onClick={() => console.log('Navigation clicked:', item.title, item.href)}
                >
                  {content}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-2 text-white',
                      action.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {action.title}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account Status</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Email Verified</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Profile Complete</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>2 Vehicles</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span>Gold Member</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          {/* User Info */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'Customer User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email || 'Loading...'}
              </p>
            </div>
          </div>

          {/* Sign Out */}
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}