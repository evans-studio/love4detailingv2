'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Car, Gift, User, Plus, History, ClipboardList, Loader2, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import EnhancedCustomerDashboardLayout from '@/components/dashboard/EnhancedCustomerDashboardLayout'

interface RecentBooking {
  id: string
  reference: string
  date: string
  service: {
    name: string
    priceFormatted: string
  }
  vehicle: {
    displayName: string
    registration: string
  }
  status: string
}

// Component for Recent Activity section
function RecentActivitySection() {
  const [recentActivity, setRecentActivity] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/user/bookings?limit=3')
      if (response.ok) {
        const result = await response.json()
        // Get all bookings sorted by creation date for activity
        const allBookings = result.data || []
        setRecentActivity(allBookings.slice(0, 3))
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatActivityDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  }

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'completed': return <Calendar className="h-4 w-4 text-blue-400" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-400" />
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-400" />
      default: return <Calendar className="h-4 w-4 text-white" />
    }
  }

  const getActivityText = (booking: RecentBooking): string => {
    switch (booking.status) {
      case 'confirmed': return `Booking confirmed for ${booking.vehicle.displayName}`
      case 'completed': return `Service completed for ${booking.vehicle.displayName}`
      case 'pending': return `Booking pending for ${booking.vehicle.displayName}`
      case 'cancelled': return `Booking cancelled for ${booking.vehicle.displayName}`
      default: return `Booking created for ${booking.vehicle.displayName}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (recentActivity.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-white/70">
        <div className="text-center">
          <History className="h-8 w-8 mx-auto mb-2 text-white" />
          <p>No recent activity</p>
          <Link href="/booking">
            <Button variant="outline" size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Book Your First Service
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recentActivity.map((booking) => (
        <div key={booking.id} className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
          {getActivityIcon(booking.status)}
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{getActivityText(booking)}</p>
            <p className="text-xs text-white/70">
              {formatActivityDate(booking.date)} • {booking.service.priceFormatted}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {booking.status}
          </Badge>
        </div>
      ))}
      <div className="text-center pt-2">
        <Link href="/dashboard/bookings">
          <Button variant="ghost" size="sm">
            View All Bookings
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// Component for Quick Book Again section
function QuickBookAgainSection() {
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentCompletedBookings()
  }, [])

  const fetchRecentCompletedBookings = async () => {
    try {
      const response = await fetch('/api/user/bookings?limit=5')
      if (response.ok) {
        const result = await response.json()
        // Get only completed bookings for "book again" - limit to 2 most recent
        const completedBookings = result.data?.filter((booking: any) => 
          booking.status === 'completed'
        ).slice(0, 2) || []
        setRecentBookings(completedBookings)
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card className="mb-8 ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Quick Book Again
          </CardTitle>
          <CardDescription>
            Loading your recent bookings...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recentBookings.length === 0) {
    // For authenticated users with no bookings, show Book Again interface instead of new customer flow
    return null // Don't show the Quick Book Again section if no bookings exist
  }

  return (
    <Card className="mb-8 ">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Quick Book Again
        </CardTitle>
        <CardDescription>
          Book your next service with just one click - all your details are already saved!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {recentBookings.map((booking) => (
            <Card 
              key={booking.id}
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => window.location.href = `/dashboard/book-again?id=${booking.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Car className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">{booking.vehicle.displayName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {booking.vehicle.registration} • Last cleaned {formatDate(booking.date)}
                    </p>
                    <p className="text-sm font-medium text-primary">{booking.service.priceFormatted}</p>
                  </div>
                </div>
                <Button className="w-full mt-3" size="sm">
                  Book Again
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Link href="/dashboard/book-again">
            <Button variant="outline" size="sm">
              View All Previous Bookings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CustomerDashboard() {
  const { profile, statistics, isLoading } = useAuth()

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
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              Unable to load your profile. Please try signing in again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <EnhancedCustomerDashboardLayout title="Welcome Back" subtitle="Your premium car detailing dashboard">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Quick Book Again - Dynamic Component */}
        <QuickBookAgainSection />

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/book-again">
              <Card className="cursor-pointer group hover:scale-[1.02] transition-all duration-200 bg-gray-800/40 border-purple-500/20 hover:border-purple-400/40">
                <CardContent className="flex items-center p-6">
                  <Calendar className="h-8 w-8 text-white mr-4 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-semibold text-white">Book Again</h3>
                    <p className="text-sm text-white/70">Book with your saved details</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/vehicles">
              <Card className="cursor-pointer group hover:scale-[1.02] transition-all duration-200 bg-gray-800/40 border-purple-500/20 hover:border-purple-400/40">
                <CardContent className="flex items-center p-6">
                  <Car className="h-8 w-8 text-white mr-4 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-semibold text-white">My Vehicles</h3>
                    <p className="text-sm text-white/70">Manage your vehicle profiles</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/bookings">
              <Card className="cursor-pointer group hover:scale-[1.02] transition-all duration-200 bg-gray-800/40 border-purple-500/20 hover:border-purple-400/40">
                <CardContent className="flex items-center p-6">
                  <ClipboardList className="h-8 w-8 text-white mr-4 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-semibold text-white">My Bookings</h3>
                    <p className="text-sm text-white/70">Manage your appointments</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/rewards">
              <Card className="cursor-pointer group hover:scale-[1.02] transition-all duration-200 bg-gray-800/40 border-purple-500/20 hover:border-purple-400/40">
                <CardContent className="flex items-center p-6">
                  <Gift className="h-8 w-8 text-white mr-4 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-semibold text-white">Rewards</h3>
                    <p className="text-sm text-white/70">View points and benefits</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{statistics?.total_bookings || 0}</div>
              <p className="text-xs text-white/70">
                {statistics?.completed_bookings || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <div className="h-4 w-4 text-white font-bold">£</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                £{((statistics?.total_spent_pence || 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-white/70">
                Lifetime value
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
              <Gift className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{statistics?.reward_points || 0}</div>
              <p className="text-xs text-white/70">
                {statistics?.reward_tier || 'Bronze'} tier
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
              <Car className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{statistics?.total_vehicles || 0}</div>
              <p className="text-xs text-white/70">
                Registered vehicles
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest bookings and account activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivitySection />
          </CardContent>
        </Card>
      </div>
    </EnhancedCustomerDashboardLayout>
  )
}