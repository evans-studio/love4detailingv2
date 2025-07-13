'use client'

/**
 * Unified Dashboard Layout - Modern Glass-Morphism Design
 * 
 * Visual Transformation Features:
 * - Glass-morphism transparency effects and backdrop blur
 * - Mobile-first responsive design with touch-optimized interface
 * - Modern gradient backgrounds and depth perception
 * - Role-aware layout adaptation (admin/customer)
 * 
 * Design System:
 * - Transparent containers with backdrop blur effects
 * - Subtle depth through layered transparency
 * - Mobile-optimized navigation and content areas
 * - Professional glass-morphism aesthetic
 */

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import UnifiedSidebar from './UnifiedSidebar'

interface UnifiedDashboardLayoutProps {
  children: React.ReactNode
}

export default function UnifiedDashboardLayout({ children }: UnifiedDashboardLayoutProps) {
  const { profile, isLoading, user, isAuthenticated } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  console.log('UnifiedDashboardLayout: isLoading:', isLoading)
  console.log('UnifiedDashboardLayout: isAuthenticated:', isAuthenticated)
  console.log('UnifiedDashboardLayout: user:', user)
  console.log('UnifiedDashboardLayout: profile:', profile)

  // Determine user role
  const userRole = profile?.role || 'customer'
  const isAdmin = ['admin', 'staff', 'super_admin'].includes(userRole)
  const isCustomer = userRole === 'customer'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white/70 mx-auto"></div>
          <p className="text-white/80 text-center mt-4 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/80">Please sign in to access your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
      
      <div className="relative z-10 flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
          <UnifiedSidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="flex-shrink-0 w-full bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Sidebar */}
            <div className="absolute left-0 top-0 h-full w-64 transform animate-smooth-slide-in">
              <UnifiedSidebar />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header with Menu */}
          <div className="lg:hidden bg-black/20 backdrop-blur-xl border-b border-white/10 shadow-xl relative z-20">
            <div className="px-4 py-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:backdrop-blur-sm border border-transparent hover:border-white/20 rounded-xl"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold text-white truncate">Love4Detailing</h1>
              <div className="w-10" /> {/* Spacer for center alignment */}
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block bg-black/20 backdrop-blur-xl border-b border-white/10 shadow-xl">
            <div className="px-6 xl:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-xl xl:text-2xl font-bold text-white drop-shadow-sm">
                      Welcome back, {profile.full_name?.split(' ')[0] || 'User'}
                    </h1>
                    <p className="text-sm xl:text-base text-white/70 mt-1">
                      {isAdmin 
                        ? 'Manage your business operations and customer bookings'
                        : 'Manage your bookings and account preferences'
                      }
                    </p>
                  </div>
                </div>
                <div className="hidden xl:flex items-center gap-3">
                  <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                    <p className="text-sm font-medium text-white">
                      {isAdmin ? 'Administrator' : 'Gold Member'}
                    </p>
                    <p className="text-xs text-white/70">
                      {isAdmin ? 'Full Access' : 'Since Jan 2024'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 xl:p-8 space-y-6">
              <div className="animate-smooth-fade-in">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}