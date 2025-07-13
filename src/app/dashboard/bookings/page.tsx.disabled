'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { 
  Calendar, 
  MapPin, 
  Car, 
  Clock, 
  Phone, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  X,
  RotateCcw,
  Repeat,
  Filter,
  ChevronDown,
  Eye,
  Star
} from 'lucide-react'
import EnhancedCustomerDashboardLayout from '@/components/dashboard/EnhancedCustomerDashboardLayout'
import RescheduleModal from '@/components/booking/RescheduleModal'

interface BookingData {
  id: string
  reference: string
  date: string
  time: string
  endTime?: string
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
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  customerName: string
  customerEmail: string
  customerPhone: string
  paymentMethod: string
  paymentStatus: string
  specialInstructions?: string
  serviceNotes?: string
  createdAt: string
  updatedAt: string
  canCancel: boolean
  canReschedule: boolean
  isPast: boolean
  isUpcoming: boolean
  rescheduleStatus?: 'none' | 'pending' | 'approved' | 'rejected'
  rescheduleRequestedAt?: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTime(timeString: string): string {
  return timeString.slice(0, 5) // Extract HH:MM
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'confirmed': return 'Confirmed'
    case 'pending': return 'Pending'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    default: return 'Unknown'
  }
}

type FilterStatus = 'all' | 'upcoming' | 'completed' | 'cancelled'

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Track reschedule requests (temporary until DB table is created)
  const [rescheduleRequests, setRescheduleRequests] = useState<Record<string, {
    status: 'pending' | 'approved' | 'rejected'
    requestedAt: string
    newDate?: string
    newTime?: string
  }>>(() => {
    // Load from localStorage to persist across sessions
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reschedule-requests')
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  // Update reschedule request status
  const updateRescheduleRequest = (bookingId: string, status: 'pending' | 'approved' | 'rejected', newDate?: string, newTime?: string) => {
    const updated = {
      ...rescheduleRequests,
      [bookingId]: {
        status,
        requestedAt: rescheduleRequests[bookingId]?.requestedAt || new Date().toISOString(),
        newDate,
        newTime
      }
    }
    setRescheduleRequests(updated)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('reschedule-requests', JSON.stringify(updated))
    }
  }

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/bookings?limit=50')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }
      
      setBookings(result.data || [])
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  // Filter bookings based on selected status
  useEffect(() => {
    let filtered = bookings
    
    switch (filterStatus) {
      case 'upcoming':
        filtered = bookings.filter(booking => booking.isUpcoming)
        break
      case 'completed':
        filtered = bookings.filter(booking => booking.status === 'completed')
        break
      case 'cancelled':
        filtered = bookings.filter(booking => booking.status === 'cancelled')
        break
      default:
        filtered = bookings
    }
    
    setFilteredBookings(filtered)
  }, [bookings, filterStatus])

  // Load bookings on component mount
  useEffect(() => {
    fetchBookings()
  }, [])

  // Poll for reschedule status updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('reschedule-requests')
        if (saved) {
          const updated = JSON.parse(saved)
          setRescheduleRequests(updated)
        }
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate statistics (memoized to prevent infinite re-renders)
  const statistics = useMemo(() => ({
    total: bookings.length,
    upcoming: bookings.filter(b => b.isUpcoming).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalValue: bookings.reduce((sum, b) => sum + b.service.price, 0)
  }), [bookings])

  const handleBookingClick = (bookingId: string) => {
    setSelectedBooking(prev => prev === bookingId ? null : bookingId)
  }

  const toggleDetails = (bookingId: string) => {
    setShowDetails(prev => prev === bookingId ? null : bookingId)
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel booking')
      }

      const result = await response.json()
      if (result.success) {
        alert('Booking cancelled successfully! You will receive a confirmation email shortly.')
        setShowCancelModal(null)
        setCancelReason('')
        await fetchBookings() // Refresh bookings
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel booking')
    } finally {
      setIsProcessing(false)
    }
  }


  return (
    <EnhancedCustomerDashboardLayout title="My Bookings" subtitle="View and manage your car detailing appointments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
            <p className="text-muted-foreground">
              Manage your service bookings and view history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {statistics.total} Total
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBookings}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your bookings...</p>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!loading && (
          <>
            {/* Filter Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({statistics.total})
                </button>
                <button
                  onClick={() => setFilterStatus('upcoming')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filterStatus === 'upcoming'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Upcoming ({statistics.upcoming})
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filterStatus === 'completed'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Completed ({statistics.completed})
                </button>
                <button
                  onClick={() => setFilterStatus('cancelled')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filterStatus === 'cancelled'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cancelled ({statistics.cancelled})
                </button>
              </div>
            </div>

            {/* Bookings List */}
            <div className="space-y-4">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <Card 
                    key={booking.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedBooking === booking.id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleBookingClick(booking.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <CardTitle className="text-lg">{booking.service.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Ref: {booking.reference}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(booking.status)}>
                            {getStatusText(booking.status)}
                          </Badge>
                          {rescheduleRequests[booking.id] && (
                            <Badge 
                              className={
                                rescheduleRequests[booking.id].status === 'pending'
                                  ? "bg-orange-100 text-orange-800 border-orange-200"
                                  : rescheduleRequests[booking.id].status === 'approved'
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                              }
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reschedule {rescheduleRequests[booking.id].status}
                            </Badge>
                          )}
                          <span className="text-lg font-semibold text-primary">
                            {booking.service.priceFormatted}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Quick Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">
                              {formatDate(booking.date)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(booking.time)} • {Math.round(booking.duration / 60)}h
                              {!booking.slotFound && (
                                <span className="ml-2 text-xs text-orange-400 bg-orange-500/20 px-1 rounded">
                                  Estimated Time
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">
                              {booking.vehicle.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.vehicle.registration}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium truncate">
                              {booking.location}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Mobile service
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {booking.status === 'confirmed' && (
                        <div className="flex items-center gap-2 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!booking.canCancel || isProcessing}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowCancelModal(booking.id)
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!booking.canReschedule || isProcessing || rescheduleRequests[booking.id]?.status === 'pending'}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowRescheduleModal(booking.id)
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {rescheduleRequests[booking.id]?.status === 'pending' ? 'Request Pending' : 'Reschedule'}
                          </Button>
                        </div>
                      )}

                      {booking.status === 'completed' && (
                        <div className="flex items-center gap-2 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/dashboard/book-again?id=${booking.id}`
                            }}
                          >
                            <Repeat className="h-4 w-4 mr-1" />
                            Book Again
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Rate Service
                          </Button>
                        </div>
                      )}

                      {/* Details Toggle */}
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDetails(booking.id)
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {showDetails === booking.id ? 'Hide' : 'Show'} Details
                          <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${
                            showDetails === booking.id ? 'rotate-180' : ''
                          }`} />
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Detailed Information */}
                      {showDetails === booking.id && (
                        <div className="pt-3 border-t border-dashed space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2">Customer Information</h4>
                              <div className="space-y-1 text-sm">
                                <p><span className="font-medium">Name:</span> {booking.customerName}</p>
                                <p><span className="font-medium">Email:</span> {booking.customerEmail}</p>
                                <p><span className="font-medium">Phone:</span> {booking.customerPhone}</p>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-2">Vehicle Details</h4>
                              <div className="space-y-1 text-sm">
                                <p><span className="font-medium">Year:</span> {booking.vehicle.year}</p>
                                <p><span className="font-medium">Color:</span> {booking.vehicle.color}</p>
                                <p><span className="font-medium">Size:</span> {booking.vehicle.size}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-2">Payment Information</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Method:</span> {booking.paymentMethod}</p>
                              <p><span className="font-medium">Status:</span> {booking.paymentStatus}</p>
                            </div>
                          </div>
                          
                          {booking.specialInstructions && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Special Instructions</h4>
                              <p className="text-sm text-muted-foreground">
                                {booking.specialInstructions}
                              </p>
                            </div>
                          )}
                          
                          {booking.serviceNotes && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Service Notes</h4>
                              <p className="text-sm text-muted-foreground">
                                {booking.serviceNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No bookings found</h3>
                    <p className="text-muted-foreground mb-4">
                      {filterStatus === 'all' 
                        ? "You haven't made any bookings yet" 
                        : `No ${filterStatus} bookings found`}
                    </p>
                    <Button onClick={() => window.location.href = '/booking'}>
                      Book a Service
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Statistics Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{statistics.total}</p>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{statistics.upcoming}</p>
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{statistics.completed}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">£{statistics.totalValue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Cancel Booking Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <X className="h-5 w-5 text-red-500" />
                  Cancel Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
                
                <div>
                  <Label htmlFor="cancelReason">Reason for cancellation *</Label>
                  <textarea
                    id="cancelReason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Please provide a reason for cancellation..."
                    className="w-full mt-1 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelModal(null)
                      setCancelReason('')
                    }}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    Keep Booking
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelBooking(showCancelModal)}
                    disabled={isProcessing || !cancelReason.trim()}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel Booking
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reschedule Booking Modal */}
        {showRescheduleModal && (
          <RescheduleModal
            booking={bookings.find(b => b.id === showRescheduleModal)!}
            isOpen={!!showRescheduleModal}
            onClose={() => {
              setShowRescheduleModal(null)
              setRescheduleReason('')
            }}
            onSuccess={() => {
              // Mark reschedule request as pending
              updateRescheduleRequest(showRescheduleModal, 'pending')
              fetchBookings()
            }}
          />
        )}
      </div>
    </EnhancedCustomerDashboardLayout>
  )
}