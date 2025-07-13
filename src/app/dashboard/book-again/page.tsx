'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookingFlow } from '@/components/booking/BookingFlow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Car } from 'lucide-react'
import EnhancedCustomerDashboardLayout from "@/components/dashboard/EnhancedCustomerDashboardLayout"

interface BookingData {
  id: string
  reference: string
  vehicle: {
    registration: string
    make: string
    model: string
    year: number
    color: string
    size: string
  }
  customerName: string
  customerEmail: string
  customerPhone: string
  location: string
  specialInstructions?: string
}

interface FullBookingData {
  id: string
  reference: string
  date: string
  time: string
  endTime?: string
  duration: number
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
}

// Component to select from previous bookings
function BookingSelectionView() {
  const [bookings, setBookings] = useState<FullBookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPreviousBookings()
  }, [])

  const fetchPreviousBookings = async () => {
    try {
      const response = await fetch('/api/user/bookings?limit=10')
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }
      
      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Show all bookings like the dashboard recent activity - user can rebook any booking
      const validBookings = result.data || []
      
      setBookings(validBookings)
    } catch (err) {
      console.error('Error fetching previous bookings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load previous bookings')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <EnhancedCustomerDashboardLayout title="Book Again" subtitle="Quick rebooking with your saved details">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your previous bookings...</p>
          </CardContent>
        </Card>
      </EnhancedCustomerDashboardLayout>
    )
  }

  if (error) {
    return (
      <EnhancedCustomerDashboardLayout title="Book Again" subtitle="Quick rebooking with your saved details">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </EnhancedCustomerDashboardLayout>
    )
  }

  return (
    <EnhancedCustomerDashboardLayout title="Book Again" subtitle="Quick rebooking with your saved details">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Book Again</h1>
          <p className="text-muted-foreground">
            Select a previous booking to quickly rebook with the same details
          </p>
        </div>

        {bookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map((booking) => (
              <Card 
                key={booking.id}
                className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50" 
                onClick={() => window.location.href = `/dashboard/book-again?id=${booking.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{booking.vehicle.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{booking.vehicle.registration}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Last cleaned:</span> {formatDate(booking.date)}</p>
                    <p><span className="font-medium">Location:</span> {booking.location}</p>
                    <p><span className="font-medium">Service:</span> {booking.service.name}</p>
                    <p><span className="font-medium">Price:</span> <span className="text-primary font-semibold">{booking.service.priceFormatted}</span></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Previous Bookings</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any bookings yet. Once you do, you'll be able to quickly book the same service again.
              </p>
              <button 
                onClick={() => window.location.href = '/booking'}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Make Your First Booking
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </EnhancedCustomerDashboardLayout>
  )
}

export default function BookAgainPage() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('id')
  
  const [previousBooking, setPreviousBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (bookingId) {
      fetchPreviousBooking(bookingId)
    } else {
      // No booking ID provided, show booking selection
      setLoading(false)
    }
  }, [bookingId])

  const fetchPreviousBooking = async (id: string) => {
    try {
      const response = await fetch(`/api/user/bookings/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch booking details')
      }
      
      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }
      
      setPreviousBooking(result.data)
    } catch (err) {
      console.error('Error fetching previous booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <EnhancedCustomerDashboardLayout title="Book Again" subtitle="Quick rebooking with your saved details">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading previous booking details...</p>
          </CardContent>
        </Card>
      </EnhancedCustomerDashboardLayout>
    )
  }

  if (error) {
    return (
      <EnhancedCustomerDashboardLayout title="Book Again" subtitle="Quick rebooking with your saved details">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </EnhancedCustomerDashboardLayout>
    )
  }

  // If no booking ID provided, show booking selection
  if (!bookingId) {
    return <BookingSelectionView />
  }

  if (!previousBooking) {
    return (
      <EnhancedCustomerDashboardLayout title="Book Again" subtitle="Quick rebooking with your saved details">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load previous booking details
          </AlertDescription>
        </Alert>
      </EnhancedCustomerDashboardLayout>
    )
  }

  // Pre-fill data from previous booking
  const prefilledVehicleData = {
    registration: previousBooking.vehicle.registration,
    make: previousBooking.vehicle.make,
    model: previousBooking.vehicle.model,
    year: previousBooking.vehicle.year,
    color: previousBooking.vehicle.color,
    size: previousBooking.vehicle.size,
    vehicle_type: 'car',
    special_requirements: '',
    notes: ''
  }

  const prefilledPersonalData = {
    name: previousBooking.customerName,
    email: previousBooking.customerEmail,
    phone: previousBooking.customerPhone,
    address: previousBooking.location,
    notes: previousBooking.specialInstructions || ''
  }

  return (
    <EnhancedCustomerDashboardLayout title="Book Again" subtitle="Quick rebooking with your saved details">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Book Again</h1>
          <p className="text-muted-foreground">
            Your previous booking details have been pre-filled. Just select a new time slot!
          </p>
        </div>

        {/* Booking Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rebooking Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Based on your previous booking: <span className="font-medium">{previousBooking.reference}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Vehicle: <span className="font-medium">{previousBooking.vehicle.year} {previousBooking.vehicle.make} {previousBooking.vehicle.model}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Location: <span className="font-medium">{previousBooking.location}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pre-filled Booking Flow */}
        <BookingFlow 
          prefilledVehicleData={prefilledVehicleData}
          prefilledPersonalData={prefilledPersonalData}
        />
      </div>
    </EnhancedCustomerDashboardLayout>
  )
}