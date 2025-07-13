'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Car, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Download,
  Plus,
  MoreHorizontal,
  AlertCircle,
  DollarSign,
  Loader2,
  RotateCcw
} from 'lucide-react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import BookingDetailsModal from '@/components/admin/BookingDetailsModal'
import BookingRealtimeManager from '@/components/admin/BookingRealtimeManager'
import RescheduleRequestManager from '@/components/admin/RescheduleRequestManager'

interface BookingData {
  id: string
  reference: string
  date: string
  time: string
  endTime: string
  duration: number
  slotFound?: boolean // Track if time data came from actual slot or fallback
  service: {
    id: string
    name: string
    price: number
    priceFormatted: string
  }
  vehicle: {
    registration: string
    make: string
    model: string
    year: number
    color: string
    size: string
    displayName: string
  }
  location: string
  customerName: string
  customerEmail: string
  customerPhone: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'reschedule_requested'
  paymentMethod: string
  paymentStatus: string
  specialInstructions?: string
  serviceNotes?: string
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  confirmed: 'bg-green-500/20 text-green-300 border-green-400/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  completed: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-400/30',
  reschedule_requested: 'bg-orange-500/20 text-orange-300 border-orange-400/30'
}

const STATUS_ACTIONS = {
  pending: [
    { action: 'confirmed', label: 'Confirm', icon: CheckCircle, color: 'text-green-600' },
    { action: 'cancelled', label: 'Cancel', icon: XCircle, color: 'text-red-600' }
  ],
  confirmed: [
    { action: 'in_progress', label: 'Start Service', icon: PlayCircle, color: 'text-blue-600' },
    { action: 'cancelled', label: 'Cancel', icon: XCircle, color: 'text-red-600' }
  ],
  in_progress: [
    { action: 'completed', label: 'Complete', icon: CheckCircle, color: 'text-purple-600' },
    { action: 'confirmed', label: 'Pause', icon: PauseCircle, color: 'text-yellow-600' }
  ],
  completed: [],
  cancelled: [
    { action: 'pending', label: 'Reactivate', icon: RefreshCw, color: 'text-green-600' }
  ],
  reschedule_requested: [
    { action: 'confirmed', label: 'Approve Reschedule', icon: CheckCircle, color: 'text-green-600' },
    { action: 'cancelled', label: 'Reject Reschedule', icon: XCircle, color: 'text-red-600' }
  ]
}

function formatDate(dateString: string): string {
  if (!dateString) {
    return 'No date set'
  }
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString)
    return 'Invalid date'
  }
  
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatTime(timeString: string): string {
  return timeString.slice(0, 5) // Extract HH:MM
}

export default function AdminBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null)


  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, statusFilter, dateFilter])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching admin bookings dashboard data...')
      
      // Get current date for dashboard filter
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch dashboard data from our stored procedure
      const response = await fetch(`/api/admin/bookings/dashboard?admin_id=${user?.id}&date=${today}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }
      
      // Extract bookings from dashboard response
      const todayBookings = result.today_bookings || []
      const upcomingBookings = result.upcoming_bookings || []
      const allBookings = [...todayBookings, ...upcomingBookings]
      
      console.log(`✅ Fetched ${allBookings.length} bookings from dashboard API`)
      console.log('📊 Sample booking data:', allBookings[0])
      
      // Transform API data to match component interface
      const transformedBookings = allBookings.map((booking: any) => ({
        id: booking.id,
        reference: booking.booking_reference,
        date: booking.scheduled_date || booking.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        time: booking.scheduled_time?.slice(0, 5) || '09:00',
        endTime: booking.scheduled_end_time?.slice(0, 5) || '11:00',
        duration: booking.service?.duration_minutes || 120,
        slotFound: booking.slot_found !== false, // Track if this came from actual slot data
        service: {
          id: booking.service?.id || 'service-1',
          name: booking.service?.name || 'Service',
          price: booking.total_price_pence || 7500,
          priceFormatted: `£${((booking.total_price_pence || 7500) / 100).toFixed(2)}`
        },
        vehicle: {
          registration: booking.vehicle?.registration || '',
          make: booking.vehicle?.make || '',
          model: booking.vehicle?.model || '',
          year: booking.vehicle?.year || new Date().getFullYear(),
          color: booking.vehicle?.color || '',
          size: booking.vehicle?.size || 'medium',
          displayName: `${booking.vehicle?.make || ''} ${booking.vehicle?.model || ''}`.trim() || 'Vehicle'
        },
        location: booking.address?.full_address || 'Service location not specified',
        customerName: booking.customer?.full_name || '',
        customerEmail: booking.customer?.email || '',
        customerPhone: booking.customer?.phone || '',
        status: booking.status || 'pending',
        paymentMethod: 'cash', // Default from system
        paymentStatus: 'pending',
        specialInstructions: booking.special_instructions || '',
        serviceNotes: '',
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      }))
      
      setBookings(transformedBookings)
      
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.vehicle.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.date)
        switch (dateFilter) {
          case 'today':
            return bookingDate.toDateString() === today.toDateString()
          case 'tomorrow':
            return bookingDate.toDateString() === tomorrow.toDateString()
          case 'upcoming':
            return bookingDate >= today
          case 'past':
            return bookingDate < today
          default:
            return true
        }
      })
    }

    setFilteredBookings(filtered)
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    if (!user?.id) return
    
    setUpdatingBooking(bookingId)
    try {
      console.log(`🔄 Updating booking ${bookingId} status to ${newStatus}`)
      
      // Use admin stored procedure for status update
      const response = await fetch('/api/admin/bookings/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: user.id,
          booking_id: bookingId,
          new_status: newStatus,
          notes: `Status updated to ${newStatus} from admin dashboard`
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update booking status: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update booking status')
      }

      console.log(`✅ Successfully updated booking ${bookingId} status to ${newStatus}`)
      
      // Refresh the bookings list to show updated data
      await fetchBookings()
      
    } catch (error) {
      console.error('Error updating booking status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update booking status')
    } finally {
      setUpdatingBooking(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-white/15 text-white border-white/30'
    return (
      <Badge className={`${colorClass} capitalize`}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getStatusActions = (booking: BookingData) => {
    const actions = STATUS_ACTIONS[booking.status] || []
    return actions.map(action => (
      <Button
        key={action.action}
        variant="outline"
        size="sm"
        className={`${action.color} border-current/20 hover:bg-current/10`}
        onClick={() => updateBookingStatus(booking.id, action.action)}
        disabled={updatingBooking === booking.id}
      >
        <action.icon className="h-4 w-4 mr-1" />
        {action.label}
      </Button>
    ))
  }

  const calculateStatistics = () => {
    const total = bookings.length
    const pending = bookings.filter(b => b.status === 'pending').length
    const confirmed = bookings.filter(b => b.status === 'confirmed').length
    const inProgress = bookings.filter(b => b.status === 'in_progress').length
    const completed = bookings.filter(b => b.status === 'completed').length
    const cancelled = bookings.filter(b => b.status === 'cancelled').length
    const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.service.price, 0)

    return { total, pending, confirmed, inProgress, completed, cancelled, totalRevenue }
  }

  const stats = calculateStatistics()

  if (loading) {
    return (
      <AdminLayout title="Bookings Management" subtitle="Manage customer bookings and appointments">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Bookings Management" subtitle="Manage customer bookings and appointments">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Today's Bookings</h1>
            <p className="text-white/60">View and manage customer appointments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/admin/bookings/create">
              <Button 
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">Total Bookings</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">In Progress</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">Revenue</p>
                  <p className="text-2xl font-bold text-green-400">£{(stats.totalRevenue / 100).toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="reschedule_requested">Reschedule Requested</option>
                </select>
                
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Reschedule Requests */}
        <RescheduleRequestManager 
          onRequestUpdate={(bookingId, status) => {
            console.log(`Reschedule request ${status} for booking ${bookingId}`)
            // Could refresh bookings here if needed
          }}
        />

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-lg">{booking.reference}</h3>
                        {getStatusBadge(booking.status)}
                        {updatingBooking === booking.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{formatDate(booking.date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(booking.time)} - {formatTime(booking.endTime)}
                              {!booking.slotFound && (
                                <span className="ml-2 text-xs text-orange-400 bg-orange-500/20 px-1 rounded">
                                  Estimated Time
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{booking.customerName}</p>
                            <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{booking.vehicle.displayName}</p>
                            <p className="text-sm text-muted-foreground">{booking.vehicle.registration}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{booking.location ? 'Service Address' : 'Service Location'}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.location || 'Address not specified'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{booking.service.priceFormatted}</p>
                            <p className="text-sm text-muted-foreground">{booking.service.name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{booking.customerPhone}</p>
                            <p className="text-sm text-muted-foreground">Contact</p>
                          </div>
                        </div>
                      </div>
                      
                      {booking.specialInstructions && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
                          <p className="text-sm text-yellow-700">{booking.specialInstructions}</p>
                        </div>
                      )}
                      
                      {booking.serviceNotes && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm font-medium text-blue-800">Service Notes:</p>
                          <p className="text-sm text-blue-700">{booking.serviceNotes}</p>
                        </div>
                      )}
                      
                      {booking.status === 'reschedule_requested' && (
                        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                          <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
                            <RotateCcw className="h-4 w-4" />
                            Reschedule Request:
                          </p>
                          <p className="text-sm text-orange-700 mt-1">
                            Customer has requested to reschedule this booking. Check booking notes for details.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:w-48">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`tel:${booking.customerPhone}`)}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedBooking(booking.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      <div className="flex gap-2 flex-1">
                        {getStatusActions(booking)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No bookings found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'No bookings have been created yet'
                  }
                </p>
                <Button onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setDateFilter('all')
                }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Booking Details Modal */}
      <BookingDetailsModal 
        bookingId={selectedBooking} 
        onClose={() => setSelectedBooking(null)} 
      />
      
      {/* Real-time Updates Manager */}
      <BookingRealtimeManager
        onBookingUpdate={fetchBookings}
        onNotification={(notification) => {
          console.log('📱 Real-time notification:', notification)
          // Could add toast notifications here if desired
        }}
      />
    </AdminLayout>
  )
}