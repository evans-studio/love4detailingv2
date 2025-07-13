'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  X,
  Home,
  Calendar,
  Users,
  BookOpen,
  Settings,
  BarChart3,
  Car,
  Wrench,
  Clock,
  Package,
  Mail,
  Sparkles,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  children?: NavItem[]
  badge?: string | number
  isActive?: boolean
}

export default function AdminSidebar({ isOpen, onClose, className }: AdminSidebarProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard', 'bookings'])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleNavigation = (href: string) => {
    router.push(href)
    onClose() // Close mobile sidebar after navigation
  }

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/admin',
      isActive: pathname === '/admin'
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      children: [
        {
          id: 'schedule-overview',
          label: 'Schedule Overview',
          icon: Calendar,
          href: '/admin/schedule',
          isActive: isActiveRoute('/admin/schedule')
        },
        {
          id: 'time-slots',
          label: 'Time Slots',
          icon: Clock,
          href: '/admin/schedule/slots',
          isActive: isActiveRoute('/admin/schedule/slots')
        },
        {
          id: 'availability',
          label: 'Availability',
          icon: Calendar,
          href: '/admin/schedule/availability',
          isActive: isActiveRoute('/admin/schedule/availability')
        }
      ]
    },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: BookOpen,
      badge: '3',
      children: [
        {
          id: 'bookings-today',
          label: 'Today\'s Bookings',
          icon: BookOpen,
          href: '/admin/bookings',
          badge: '3',
          isActive: isActiveRoute('/admin/bookings')
        },
        {
          id: 'bookings-create',
          label: 'Create Booking',
          icon: BookOpen,
          href: '/admin/bookings/create',
          isActive: isActiveRoute('/admin/bookings/create')
        },
        {
          id: 'bookings-history',
          label: 'Booking History',
          icon: BookOpen,
          href: '/admin/bookings/history',
          isActive: isActiveRoute('/admin/bookings/history')
        }
      ]
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      children: [
        {
          id: 'customers-list',
          label: 'All Customers',
          icon: Users,
          href: '/admin/customers',
          isActive: isActiveRoute('/admin/customers')
        },
        {
          id: 'customers-analytics',
          label: 'Customer Analytics',
          icon: BarChart3,
          href: '/admin/customers/analytics',
          isActive: isActiveRoute('/admin/customers/analytics')
        }
      ]
    },
    {
      id: 'vehicles',
      label: 'Vehicle Management',
      icon: Car,
      children: [
        {
          id: 'vehicles-list',
          label: 'All Vehicles',
          icon: Car,
          href: '/admin/vehicles',
          isActive: isActiveRoute('/admin/vehicles')
        },
        {
          id: 'vehicles-unmatched',
          label: 'Unmatched Vehicles',
          icon: Car,
          href: '/admin/vehicles/unmatched',
          badge: '2',
          isActive: isActiveRoute('/admin/vehicles/unmatched')
        }
      ]
    },
    {
      id: 'services',
      label: 'Services',
      icon: Wrench,
      children: [
        {
          id: 'services-list',
          label: 'All Services',
          icon: Package,
          href: '/admin/services',
          isActive: isActiveRoute('/admin/services')
        },
        {
          id: 'services-create',
          label: 'Create Service',
          icon: Package,
          href: '/admin/services/create',
          isActive: isActiveRoute('/admin/services/create')
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/admin/analytics',
      isActive: isActiveRoute('/admin/analytics')
    },
    {
      id: 'emails',
      label: 'Email Analytics',
      icon: Mail,
      href: '/admin/emails',
      isActive: isActiveRoute('/admin/emails')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/admin/settings',
      isActive: isActiveRoute('/admin/settings')
    }
  ]

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.includes(item.id)
    const Icon = item.icon

    return (
      <div key={item.id}>
        {hasChildren ? (
          <button
            onClick={() => toggleSection(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
              level === 0 ? "text-white/70 hover:text-white hover:bg-white/10" : "text-white/60 hover:text-white/80 hover:bg-white/5",
              level > 0 && "ml-4"
            )}
          >
            <div className="flex items-center space-x-3">
              <Icon className={cn("h-4 w-4", level === 0 ? "text-purple-400" : "text-white/50")} />
              <span>{item.label}</span>
              {item.badge && (
                <Badge className="bg-red-500 text-white text-xs h-4 w-4 p-0 flex items-center justify-center">
                  {item.badge}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-white/50" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white/50" />
            )}
          </button>
        ) : (
          <button
            onClick={() => item.href && handleNavigation(item.href)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
              item.isActive 
                ? "bg-purple-600/20 text-purple-300 border-l-2 border-purple-400" 
                : level === 0 
                  ? "text-white/70 hover:text-white hover:bg-white/10" 
                  : "text-white/60 hover:text-white/80 hover:bg-white/5",
              level > 0 && "ml-4"
            )}
          >
            <div className="flex items-center space-x-3">
              <Icon className={cn(
                "h-4 w-4", 
                item.isActive ? "text-purple-400" : level === 0 ? "text-purple-400" : "text-white/50"
              )} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <Badge className="bg-red-500 text-white text-xs h-4 w-4 p-0 flex items-center justify-center">
                {item.badge}
              </Badge>
            )}
          </button>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-md border-r border-purple-500/20 transform transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Love4Detailing</h2>
              <p className="text-xs text-white/60">Admin Panel</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map(item => renderNavItem(item))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/50 text-center">
            <p>Logged in as</p>
            <p className="text-white/70 font-medium">{profile?.full_name}</p>
            <p className="text-purple-400">{profile?.role}</p>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:w-64 bg-gray-900/95 backdrop-blur-md border-r border-purple-500/20",
        className
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center h-16 px-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Love4Detailing</h2>
              <p className="text-xs text-white/60">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map(item => renderNavItem(item))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/50 text-center">
            <p>Logged in as</p>
            <p className="text-white/70 font-medium">{profile?.full_name}</p>
            <p className="text-purple-400">{profile?.role}</p>
          </div>
        </div>
      </div>
    </>
  )
} 