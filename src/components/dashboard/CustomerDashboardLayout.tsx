'use client'

/**
 * Customer Dashboard Layout
 * Provides consistent layout with sidebar navigation for all customer dashboard pages
 */

import React from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CustomerSidebar from './CustomerSidebar'

interface CustomerDashboardLayoutProps {
  children: React.ReactNode
}

export default function CustomerDashboardLayout({ children }: CustomerDashboardLayoutProps) {
  const { profile, isLoading, user, isAuthenticated } = useAuth()

  console.log('CustomerDashboardLayout: isLoading:', isLoading)
  console.log('CustomerDashboardLayout: isAuthenticated:', isAuthenticated)
  console.log('CustomerDashboardLayout: user:', user)
  console.log('CustomerDashboardLayout: profile:', profile)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to access your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <CustomerSidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-card border-b border-border shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-xl font-semibold">Welcome back, {profile.full_name}</h1>
                    <p className="text-sm text-muted-foreground">Manage your bookings and account</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">Gold Member</p>
                    <p className="text-xs text-muted-foreground">Since Jan 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}