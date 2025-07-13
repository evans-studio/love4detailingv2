'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock,
  MapPin,
  User,
  Car,
  Phone,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Calendar,
  Activity,
  DollarSign,
  AlertCircle
} from 'lucide-react'

interface TodayBooking {
  id: string
  booking_reference: string
  scheduled_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  total_price_pence: number
  customer: {
    full_name: string
    email: string
    phone: string
  }
  service: {
    name: string
    duration_minutes: number
  }
  vehicle: {
    make: string
    model: string
    registration: string
    size: string
  }
  address: {
    full_address: string
    postcode: string
  }
  special_instructions?: string
  created_at: string
  updated_at: string
}

interface DashboardStats {
  total_bookings: number
  confirmed_bookings: number
  completed_bookings: number
  pending_bookings: number
  total_revenue_pence: number
  avg_booking_value_pence: number
}

export default function TodayBookingsDashboard() {
  const { user } = useAuth()
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    if (!user?.id) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      console.log('🔍 Fetching dashboard data for:', { user_id: user.id, date: today })
      
      const response = await fetch(`/api/admin/bookings/dashboard?admin_id=${user.id}&date=${today}`)
      
      console.log('📡 Dashboard API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Dashboard API error response:', errorText)
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('📊 Dashboard API result:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setTodayBookings(result.today_bookings || [])
      setStats(result.daily_stats || null)
      setError(null)

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user?.id])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDashboardData()
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    if (!user?.id) return

    setUpdatingBooking(bookingId)
    try {
      const response = await fetch('/api/admin/bookings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: user.id,
          booking_id: bookingId,
          new_status: newStatus,
          notes: `Status updated to ${newStatus} from today's dashboard`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update booking status')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update booking status')
      }

      // Refresh dashboard data
      await fetchDashboardData()

    } catch (error) {
      console.error('Error updating booking status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update booking')
    } finally {
      setUpdatingBooking(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Pending' },
      confirmed: { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Confirmed' },
      in_progress: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'In Progress' },
      completed: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'Completed' },
      cancelled: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Cancelled' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.color} border`}>{config.label}</Badge>
  }

  const getStatusActions = (booking: TodayBooking) => {
    const actions = []

    switch (booking.status) {
      case 'pending':
        actions.push(
          <Button
            key="confirm"
            size="sm"
            variant="outline"
            className="border-green-500/30 text-green-300 hover:bg-green-500/10"
            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
            disabled={updatingBooking === booking.id}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirm
          </Button>
        )
        break

      case 'confirmed':
        actions.push(
          <Button
            key="start"
            size="sm"
            variant="outline"
            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
            onClick={() => updateBookingStatus(booking.id, 'in_progress')}
            disabled={updatingBooking === booking.id}
          >
            <PlayCircle className="h-3 w-3 mr-1" />
            Start
          </Button>
        )
        break

      case 'in_progress':
        actions.push(
          <Button
            key="complete"
            size="sm"
            variant="outline"
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            onClick={() => updateBookingStatus(booking.id, 'completed')}
            disabled={updatingBooking === booking.id}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Button>
        )
        break
    }

    if (booking.status !== 'completed' && booking.status !== 'cancelled') {
      actions.push(
        <Button
          key="cancel"
          size="sm"
          variant="outline"
          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
          disabled={updatingBooking === booking.id}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      )
    }

    return actions
  }

  const formatTime = (timeString: string) => {
    return timeString?.slice(0, 5) || '00:00'
  }

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Today's Schedule</h2>
          <p className="text-white/60">
            {new Date().toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">{stats.total_bookings}</p>
              <p className="text-xs text-white/60">Total Today</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">{stats.completed_bookings}</p>
              <p className="text-xs text-white/60">Completed</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">{stats.pending_bookings}</p>
              <p className="text-xs text-white/60">Pending</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">{formatPrice(stats.total_revenue_pence)}</p>
              <p className="text-xs text-white/60">Revenue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Today's Appointments</h3>
        
        {todayBookings.length === 0 ? (
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-white/70 mb-2">No bookings today</h4>
              <p className="text-white/50">Enjoy your day off or use this time to prepare for upcoming bookings!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayBookings
              .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
              .map((booking) => (
                <Card 
                  key={booking.id} 
                  className={`bg-gray-800/40 border-purple-500/20 transition-all ${
                    booking.status === 'in_progress' ? 'ring-2 ring-blue-500/50' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Time & Status */}
                      <div className="flex items-center space-x-3 lg:w-48">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{formatTime(booking.scheduled_time)}</p>
                          <p className="text-xs text-white/60">{booking.service.name}</p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{booking.customer.full_name}</p>
                            <p className="text-white/60 text-xs">{booking.booking_reference}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{booking.vehicle.make} {booking.vehicle.model}</p>
                            <p className="text-white/60 text-xs">{booking.vehicle.registration}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">Service Address</p>
                            <p className="text-white/60 text-xs">{booking.address.full_address}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{booking.service.name}</p>
                            <p className="text-white/60 text-xs">{formatPrice(booking.total_price_pence)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{booking.customer.phone}</p>
                            <p className="text-white/60 text-xs">Contact</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 lg:w-auto">
                        {updatingBooking === booking.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                        ) : (
                          getStatusActions(booking)
                        )}
                      </div>
                    </div>

                    {/* Special Instructions */}
                    {booking.special_instructions && (
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-300">
                          <strong>Special Instructions:</strong> {booking.special_instructions}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}