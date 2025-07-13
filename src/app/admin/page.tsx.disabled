'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import TodayBookingsDashboard from '@/components/admin/TodayBookingsDashboard'
import BookingRealtimeManager from '@/components/admin/BookingRealtimeManager'
import PendingRescheduleWidget from '@/components/admin/PendingRescheduleWidget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Settings, 
  BarChart3, 
  Car, 
  Clock,
  AlertCircle,
  Plus,
  TrendingUp,
  Phone,
  CheckCircle,
  XCircle,
  PlayCircle
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user, profile, isLoading } = useAuth()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user?.id])

  const fetchDashboardData = async () => {
    if (!user?.id) return
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/admin/bookings/dashboard?admin_id=${user.id}&date=${today}`)
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }



  if (isLoading) {
    return (
      <AdminLayout title="Admin Dashboard" subtitle="Business overview and management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Business overview and management">
      <div className="p-4 lg:p-6 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
          <p className="text-white/60">Here's what's happening with your business today</p>
        </div>
        
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/admin/bookings/create">
              <Card className="bg-gray-800/40 border-purple-500/20 hover:bg-gray-800/60 transition-all cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Plus className="h-8 w-8 text-purple-400 mr-4" />
                  <div>
                    <h3 className="font-semibold text-white">Create Booking</h3>
                    <p className="text-sm text-white/60">Manual booking entry</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/schedule">
              <Card className="bg-gray-800/40 border-purple-500/20 hover:bg-gray-800/60 transition-all cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Clock className="h-8 w-8 text-purple-400 mr-4" />
                  <div>
                    <h3 className="font-semibold text-white">Manage Schedule</h3>
                    <p className="text-sm text-white/60">Time slots and availability</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/services">
              <Card className="bg-gray-800/40 border-purple-500/20 hover:bg-gray-800/60 transition-all cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Car className="h-8 w-8 text-purple-400 mr-4" />
                  <div>
                    <h3 className="font-semibold text-white">Manage Services</h3>
                    <p className="text-sm text-white/60">Services and pricing</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/settings">
              <Card className="bg-gray-800/40 border-purple-500/20 hover:bg-gray-800/60 transition-all cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Settings className="h-8 w-8 text-purple-400 mr-4" />
                  <div>
                    <h3 className="font-semibold text-white">System Settings</h3>
                    <p className="text-sm text-white/60">Configuration and setup</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Dashboard Widgets Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Today's Bookings - Takes up 2 columns */}
          <div className="xl:col-span-2">
            <TodayBookingsDashboard />
          </div>
          
          {/* Pending Reschedule Requests - Takes up 1 column */}
          <div className="xl:col-span-1">
            <PendingRescheduleWidget 
              className="h-fit"
              onRequestClick={(requestId) => {
                if (requestId === 'all') {
                  // Navigate to full reschedule management page
                  window.location.href = '/admin/reschedule-requests'
                } else {
                  // Navigate to specific request details
                  window.location.href = `/admin/reschedule-requests/${requestId}`
                }
              }}
              maxDisplay={3}
            />
          </div>
        </div>
        
        {/* Real-time Updates Manager */}
        <BookingRealtimeManager
          onBookingUpdate={fetchDashboardData}
          onNotification={(notification) => {
            console.log('📱 Dashboard notification:', notification)
          }}
        />
      </div>
    </AdminLayout>
  )
}