'use client'

/**
 * Enhanced Customer Dashboard Layout - Premium Love4Detailing Experience
 * Provides beautiful, mobile-first layout with purple theme for customer dashboard
 * Features: Glass morphism, purple accent colors, real-time updates, touch-optimized
 */

import React from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  User, 
  Car, 
  Calendar, 
  Gift, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Heart,
  Star,
  Sparkles,
  ChevronRight,
  Home,
  History,
  Plus,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface EnhancedCustomerDashboardLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Book Service', href: '/booking', icon: Plus },
  { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'My Vehicles', href: '/dashboard/vehicles', icon: Car },
  { name: 'Rewards', href: '/dashboard/rewards', icon: Gift },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Support', href: '/dashboard/support', icon: Heart },
]

function EnhancedCustomerSidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-gray-900/95 backdrop-blur-md border-r border-purple-500/20
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Love4Detailing</h2>
                <p className="text-sm text-purple-300">Customer Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white/70 hover:text-white"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* User Profile */}
          <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                <User className="w-4 h-4 text-purple-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.full_name || 'Customer'}
                </p>
                <p className="text-xs text-purple-300 truncate">
                  {profile?.email}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                Active
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-purple-400" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-purple-500/20">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-red-500/10"
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  )
}

export default function EnhancedCustomerDashboardLayout({ 
  title, 
  subtitle,
  children 
}: EnhancedCustomerDashboardLayoutProps) {
  const { profile, isLoading, user, isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/70">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800/40 border-purple-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 mb-4">Please sign in to access your dashboard.</p>
            <Button 
              asChild
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <div className="flex h-screen">
        {/* Enhanced Sidebar */}
        <EnhancedCustomerSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Enhanced Header */}
          <header className="bg-gray-800/50 backdrop-blur-md border-b border-purple-500/20 p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden text-white/70 hover:text-white"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-white/70 mt-1">{subtitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Search */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:flex text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Search className="w-5 h-5" />
                </Button>
                
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
                </Button>

                {/* Profile */}
                <div className="hidden lg:flex items-center space-x-3 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {profile.full_name || 'Customer'}
                    </p>
                    <p className="text-xs text-purple-300">Premium Member</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Enhanced Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="h-full relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(151,71,255,0.1),transparent_50%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(151,71,255,0.05),transparent_50%)] pointer-events-none" />
              
              {/* Content */}
              <div className="relative h-full">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}