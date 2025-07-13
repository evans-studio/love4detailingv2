'use client'

/**
 * Unified Sidebar Component - Role-Aware Navigation
 * 
 * Smart Approach:
 * - Single sidebar component for all user roles
 * - Role-based rendering of menu items
 * - Consistent behavior and styling
 * - Conditional navigation based on user permissions
 * 
 * Supports:
 * - Admin users: Full admin dashboard navigation
 * - Customer users: Customer dashboard navigation
 * - Automatic role detection and menu switching
 * - Permission-based item visibility
 */

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  BarChart3,
  Settings,
  Car,
  Plus,
  LogOut,
  User,
  RefreshCw,
  HelpCircle,
  Star,
  ChevronRight
} from 'lucide-react'

interface SidebarItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  badge?: string
  description?: string
  status?: 'active' | 'coming-soon'
  roles: ('admin' | 'staff' | 'super_admin' | 'customer')[]
}

// Unified navigation items for all user roles
const navigationItems: SidebarItem[] = [
  // Admin Navigation
  {
    href: '/admin',
    label: 'Admin Dashboard',
    icon: LayoutDashboard,
    description: 'Administrative overview',
    roles: ['admin', 'staff', 'super_admin']
  },
  {
    href: '/admin/bookings',
    label: 'Manage Bookings',
    icon: Calendar,
    badge: 'hot',
    description: 'View and manage all bookings',
    roles: ['admin', 'staff', 'super_admin']
  },
  {
    href: '/admin/schedule',
    label: 'Schedule',
    icon: Clock,
    permission: 'can_manage_schedule',
    description: 'Manage working hours and availability',
    roles: ['admin', 'staff', 'super_admin']
  },
  {
    href: '/admin/customers',
    label: 'Customers',
    icon: Users,
    description: 'Customer management',
    roles: ['admin', 'staff', 'super_admin']
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
    permission: 'can_view_analytics',
    description: 'Business insights and reports',
    roles: ['admin', 'staff', 'super_admin']
  },
  {
    href: '/admin/services',
    label: 'Services',
    icon: Car,
    permission: 'can_manage_services',
    description: 'Service catalog management',
    roles: ['admin', 'staff', 'super_admin']
  },
  {
    href: '/admin/bookings/create',
    label: 'Create Booking',
    icon: Plus,
    permission: 'can_create_manual_bookings',
    description: 'Manual booking creation',
    roles: ['admin', 'staff', 'super_admin']
  },
  {
    href: '/admin/settings',
    label: 'System Settings',
    icon: Settings,
    permission: 'can_manage_system',
    description: 'System configuration',
    roles: ['admin', 'staff', 'super_admin']
  },
  
  // Customer Navigation
  {
    href: '/dashboard',
    label: 'My Dashboard',
    icon: LayoutDashboard,
    description: 'Customer dashboard overview',
    roles: ['customer']
  },
  {
    href: '/dashboard/bookings',
    label: 'My Bookings',
    icon: Calendar,
    description: 'View and manage your bookings',
    roles: ['customer']
  },
  {
    href: '/dashboard/profile',
    label: 'My Profile',
    icon: User,
    description: 'Personal details and account settings',
    roles: ['customer']
  },
  {
    href: '/dashboard/vehicles',
    label: 'My Vehicles',
    icon: Car,
    description: 'Manage your vehicle information',
    roles: ['customer']
  },
  {
    href: '/dashboard/book-again',
    label: 'Book Again',
    icon: RefreshCw,
    description: 'Quick rebooking from past services',
    status: 'active',
    badge: 'Popular',
    roles: ['customer']
  },
  {
    href: '/dashboard/rewards',
    label: 'My Rewards',
    icon: Star,
    description: 'Points, tiers, and loyalty benefits',
    status: 'active',
    roles: ['customer']
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Preferences and notifications',
    status: 'active',
    roles: ['customer']
  },
  {
    href: '/dashboard/support',
    label: 'Support',
    icon: HelpCircle,
    description: 'Help center and contact support',
    status: 'active',
    roles: ['customer']
  }
]


export function UnifiedSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, permissions, signOut } = useAuth()

  console.log('UnifiedSidebar: Current pathname:', pathname)
  console.log('UnifiedSidebar: Profile data:', profile)
  console.log('UnifiedSidebar: User role:', profile?.role)

  const handleSignOut = async () => {
    try {
      console.log('UnifiedSidebar: Starting sign out process')
      await signOut()
      // Auth context handles the redirect to homepage automatically
      console.log('UnifiedSidebar: Sign out completed')
    } catch (error) {
      console.error('UnifiedSidebar: Error signing out:', error)
    }
  }

  // Determine user role and filter navigation items
  const userRole = profile?.role || 'customer'
  const isAdmin = ['admin', 'staff', 'super_admin'].includes(userRole)
  const isCustomer = userRole === 'customer'

  const filteredNavItems = navigationItems.filter(item => {
    // Check if item is available for user's role
    if (!item.roles.includes(userRole as any)) {
      return false
    }
    
    // Check permissions if required
    if (item.permission && permissions && !permissions[item.permission as keyof typeof permissions]) {
      return false
    }
    
    return true
  })

  const renderNavItem = (item: SidebarItem) => {
    const isActive = pathname === item.href
    const Icon = item.icon
    const isDisabled = item.status === 'coming-soon'
    
    const content = (
      <div className={cn(
        'flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden',
        'min-h-[44px] md:min-h-[40px]', // Touch-friendly minimum height
        isActive && !isDisabled && 
          'bg-white/20 text-white border border-white/30 backdrop-blur-sm shadow-lg',
        !isActive && !isDisabled && 
          'text-white/80 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm hover:shadow-md',
        isDisabled && 'text-white/40 cursor-not-allowed opacity-60'
      )}>
        <Icon className={cn(
          'h-4 w-4 transition-colors duration-200',
          isActive && !isDisabled ? 'text-white drop-shadow-sm' : 'text-white/70 group-hover:text-white'
        )} />
        <span className="flex-1 font-medium">{item.label}</span>
        {item.badge && (
          <Badge variant="secondary" className="text-xs bg-white/20 text-white/90 border-white/30 backdrop-blur-sm">
            {item.badge}
          </Badge>
        )}
        {!isDisabled && isCustomer && (
          <ChevronRight className="h-3 w-3 text-white/50 group-hover:text-white/70 transition-colors duration-200" />
        )}
      </div>
    )

    if (isDisabled) {
      return (
        <div key={item.href} title={`${item.label} - ${item.description}`}>
          {content}
        </div>
      )
    }

    return (
      <Link 
        key={item.href} 
        href={item.href} 
        title={item.description}
        onClick={() => console.log('Navigation clicked:', item.label, item.href)}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="h-full bg-black/20 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col relative overflow-hidden">
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-white/10 relative z-10">
        <div className="space-y-3">
          {/* Logo */}
          <div className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-lg overflow-hidden">
            <Image
              src="/logo.png"
              alt="Love4Detailing Logo"
              width={200}
              height={60}
              className="w-full h-auto object-contain"
            />
          </div>
          {/* Dashboard Info */}
          <div className="text-center">
            <p className="text-xs md:text-sm text-white/70">
              {isAdmin ? 'Admin Dashboard' : 'Customer Dashboard'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-2 relative z-10 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 px-1">
            {isAdmin ? 'Administration' : 'My Account'}
          </h2>
          <div className="space-y-1">
            {filteredNavItems.map(renderNavItem)}
          </div>
        </div>


        {/* Customer Account Status */}
        {isCustomer && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 space-y-2 border border-white/20 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Account Status</span>
              <Badge className="bg-green-500/20 text-green-100 border-green-400/30 backdrop-blur-sm">
                Active
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-sm" />
                <span className="text-white/80">Email Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-sm" />
                <span className="text-white/80">Profile Complete</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-400 rounded-full shadow-sm" />
                <span className="text-white/80">2 Vehicles</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-purple-400 rounded-full shadow-sm" />
                <span className="text-white/80">Gold Member</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* User info and logout */}
      <div className="p-3 md:p-4 border-t border-white/10 bg-black/10 backdrop-blur-sm relative z-10">
        <div className="space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-primary/80 to-primary rounded-full flex items-center justify-center border border-white/20 shadow-sm">
              <User className="h-4 w-4 text-white drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || 'Loading...'}
              </p>
              <p className="text-xs text-white/70 truncate">
                {profile?.email || 'Loading...'}
              </p>
            </div>
            <Badge className="ml-2 bg-primary/20 text-primary-100 border-primary/30 backdrop-blur-sm text-xs">
              {profile?.role || 'customer'}
            </Badge>
          </div>

          {/* Sign Out */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-red-500/20 hover:backdrop-blur-sm border border-transparent hover:border-red-400/30 rounded-xl min-h-[44px] md:min-h-[40px] transition-all duration-200"
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

export default UnifiedSidebar