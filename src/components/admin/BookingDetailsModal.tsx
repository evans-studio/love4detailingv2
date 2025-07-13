'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Car, 
  MapPin, 
  DollarSign,
  FileText,
  AlertCircle,
  Navigation,
  Copy,
  Loader2
} from 'lucide-react'

interface BookingDetailsModalProps {
  bookingId: string | null
  onClose: () => void
}

interface BookingDetails {
  id: string
  reference: string
  date: string
  time: string
  endTime: string
  duration: number
  service: {
    name: string
    price: number
    priceFormatted: string
    description?: string
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
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  paymentMethod: string
  paymentStatus: string
  specialInstructions?: string
  serviceNotes?: string
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  completedAt?: string
  cancelledAt?: string
}

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  confirmed: 'bg-green-500/20 text-green-300 border-green-400/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  completed: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-400/30'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTime(timeString: string): string {
  return timeString.slice(0, 5)
}

function formatDateTime(dateTimeString: string): string {
  return new Date(dateTimeString).toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Extract postcode from address using UK postcode regex
function extractPostcode(address: string): string | null {
  const postcodeRegex = /([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})/i
  const match = address.match(postcodeRegex)
  return match ? match[1].toUpperCase() : null
}

// Calculate distance from SW9 (mock implementation)
function calculateDistance(address: string): string {
  const postcode = extractPostcode(address)
  if (!postcode) return 'Distance unknown'
  
  // Mock distance calculation - in real implementation, this would use a distance API
  const mockDistances: { [key: string]: number } = {
    'SW9': 0,
    'SW1': 2.1,
    'SW2': 1.8,
    'SW3': 3.2,
    'SW4': 2.5,
    'SW5': 3.8,
    'SW6': 4.2,
    'SW7': 3.5,
    'SW8': 1.2,
    'SW10': 4.8,
    'SW11': 2.9,
    'SW12': 5.1,
    'SW13': 6.2,
    'SW14': 7.1,
    'SW15': 4.6,
    'SW16': 3.9,
    'SW17': 5.8,
    'SW18': 4.4,
    'SW19': 6.7,
    'SW20': 8.2
  }
  
  const area = postcode.match(/([A-Z]{1,2}[0-9][A-Z0-9]?)/i)?.[1]
  const distance = area ? mockDistances[area] : Math.random() * 10 + 2
  
  return distance ? `${distance.toFixed(1)} miles from base` : 'Distance unknown'
}

export default function BookingDetailsModal({ bookingId, onClose }: BookingDetailsModalProps) {
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) return
    
    const fetchBookingDetails = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/admin/bookings/${bookingId}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        if (result.error) {
          throw new Error(result.error)
        }
        
        // Transform the data to match our interface
        const bookingData = result.data
        const transformedBooking: BookingDetails = {
          id: bookingData.booking_id || bookingData.id,
          reference: bookingData.booking_reference,
          date: bookingData.appointment_date || bookingData.service_date,
          time: bookingData.appointment_time?.slice(0, 5) || bookingData.service_time?.slice(0, 5) || '09:00',
          endTime: bookingData.slot_end_time?.slice(0, 5) || '11:00',
          duration: bookingData.service_duration || 120,
          service: {
            name: bookingData.service_name || 'Premium Valet Service',
            price: bookingData.total_price_pence || bookingData.service_price_pence || 7500,
            priceFormatted: `£${((bookingData.total_price_pence || bookingData.service_price_pence || 7500) / 100).toFixed(2)}`,
            description: bookingData.service_description || ''
          },
          vehicle: {
            registration: bookingData.vehicle_registration || '',
            make: bookingData.vehicle_make || '',
            model: bookingData.vehicle_model || '',
            year: bookingData.vehicle_year || new Date().getFullYear(),
            color: bookingData.vehicle_color || '',
            size: bookingData.vehicle_size || 'medium',
            displayName: bookingData.vehicle_display_name || `${bookingData.vehicle_year || ''} ${bookingData.vehicle_make || ''} ${bookingData.vehicle_model || ''}`.trim() || 'Vehicle'
          },
          location: bookingData.service_location || 'Service location not specified',
          customerName: bookingData.customer_name || '',
          customerEmail: bookingData.customer_email || '',
          customerPhone: bookingData.customer_phone || '',
          status: bookingData.booking_status || bookingData.status || 'pending',
          paymentMethod: bookingData.payment_method || 'cash',
          paymentStatus: bookingData.payment_status || 'pending',
          specialInstructions: bookingData.special_instructions || bookingData.customer_instructions || '',
          serviceNotes: bookingData.notes || '',
          createdAt: bookingData.created_at,
          updatedAt: bookingData.updated_at,
          confirmedAt: bookingData.confirmed_at,
          completedAt: bookingData.completed_at,
          cancelledAt: bookingData.cancelled_at
        }
        
        setBooking(transformedBooking)
      } catch (err) {
        console.error('Error fetching booking details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load booking details')
      } finally {
        setLoading(false)
      }
    }
    
    fetchBookingDetails()
  }, [bookingId])

  const handleNavigate = () => {
    if (!booking?.location) return
    
    const encodedAddress = encodeURIComponent(booking.location)
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    window.open(googleMapsUrl, '_blank')
  }

  const handleCopyAddress = async () => {
    if (!booking?.location) return
    
    try {
      await navigator.clipboard.writeText(booking.location)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  if (!bookingId) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/25">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Booking Details
              </h2>
              {booking && (
                <p className="text-white/70 text-sm">Reference: {booking.reference}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-full w-8 h-8 p-0 border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {booking && (
            <div className="space-y-6">
              {/* Status and Basic Info */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Calendar className="h-5 w-5 text-purple-400" />
                    Booking Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge className={`${STATUS_COLORS[booking.status]} capitalize`}>
                      {booking.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-white/60">
                      Created: {formatDateTime(booking.createdAt)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-white">Date & Time</p>
                      <p className="text-white/80">{formatDate(booking.date)}</p>
                      <p className="text-white/80">{formatTime(booking.time)} - {formatTime(booking.endTime)}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Duration</p>
                      <p className="text-white/80">{booking.duration} minutes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="h-5 w-5 text-purple-400" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-white">Name</p>
                      <p className="text-white/80">{booking.customerName}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Phone</p>
                      <div className="flex items-center gap-2">
                        <p className="text-white/80">{booking.customerPhone}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`tel:${booking.customerPhone}`)}
                          className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400/60 transition-all duration-200"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Email</p>
                      <div className="flex items-center gap-2">
                        <p className="text-white/80">{booking.customerEmail}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`mailto:${booking.customerEmail}`)}
                          className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400/60 transition-all duration-200"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service Location */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MapPin className="h-5 w-5 text-purple-400" />
                    Service Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-white">Address</p>
                    <p className="text-white/80">{booking.location}</p>
                    {extractPostcode(booking.location) && (
                      <p className="text-sm text-purple-300 mt-1 font-medium">
                        Postcode: {extractPostcode(booking.location)}
                      </p>
                    )}
                    <p className="text-sm text-white/60">
                      {calculateDistance(booking.location)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNavigate}
                      className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400/60 transition-all duration-200"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400/60 transition-all duration-200"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Address
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Car className="h-5 w-5 text-purple-400" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-white">Vehicle</p>
                      <p className="text-white/80">{booking.vehicle.displayName}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Registration</p>
                      <p className="text-white/80">{booking.vehicle.registration}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Color</p>
                      <p className="text-white/80">{booking.vehicle.color}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Size Category</p>
                      <p className="text-white/80 capitalize">{booking.vehicle.size}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service & Payment */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <DollarSign className="h-5 w-5 text-purple-400" />
                    Service & Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-white">Service</p>
                      <p className="text-white/80">{booking.service.name}</p>
                      {booking.service.description && (
                        <p className="text-sm text-white/60 mt-1">{booking.service.description}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Price</p>
                      <p className="text-purple-300 font-semibold">{booking.service.priceFormatted}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Payment Method</p>
                      <p className="text-white/80 capitalize">{booking.paymentMethod}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-white">Payment Status</p>
                      <p className="text-white/80 capitalize">{booking.paymentStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions & Notes */}
              {(booking.specialInstructions || booking.serviceNotes) && (
                <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileText className="h-5 w-5 text-purple-400" />
                      Instructions & Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {booking.specialInstructions && (
                      <div>
                        <p className="font-semibold text-white">Special Instructions</p>
                        <p className="text-white/80">{booking.specialInstructions}</p>
                      </div>
                    )}
                    
                    {booking.serviceNotes && (
                      <div>
                        <p className="font-semibold text-white">Service Notes</p>
                        <p className="text-white/80">{booking.serviceNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Clock className="h-5 w-5 text-purple-400" />
                    Status History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-white/80">
                    <p><strong className="text-white">Created:</strong> {formatDateTime(booking.createdAt)}</p>
                    {booking.confirmedAt && (
                      <p><strong className="text-white">Confirmed:</strong> {formatDateTime(booking.confirmedAt)}</p>
                    )}
                    {booking.completedAt && (
                      <p><strong className="text-white">Completed:</strong> {formatDateTime(booking.completedAt)}</p>
                    )}
                    {booking.cancelledAt && (
                      <p><strong className="text-white">Cancelled:</strong> {formatDateTime(booking.cancelledAt)}</p>
                    )}
                    <p><strong className="text-white">Last Updated:</strong> {formatDateTime(booking.updatedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}