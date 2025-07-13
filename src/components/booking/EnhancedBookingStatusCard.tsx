'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { InfoAlert, SuccessAlert, WarningAlert, ErrorAlert } from '@/components/ui/BrandedAlert'
import { 
  Calendar, 
  Clock, 
  Car, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Repeat,
  Eye,
  AlertCircle,
  Loader2,
  ArrowRight,
  MessageSquare
} from 'lucide-react'

interface BookingSlot {
  id: string
  date: string
  time: string
  formatted_date: string
  formatted_time: string
  status?: string
}

interface RescheduleRequest {
  id: string
  status: 'pending' | 'approved' | 'declined' | 'expired'
  requested_at: string
  responded_at?: string
  admin_notes?: string
  requested_slot?: BookingSlot
}

interface CompleteBookingStatus {
  booking: {
    id: string
    reference: string
    status: string
    reschedule_count: number
    last_status_change: string
    status_change_reason?: string
    created_from_reschedule: boolean
    booking_history: any[]
  }
  service: {
    id: string
    name: string
    code?: string
  }
  vehicle: {
    id: string
    make: string
    model: string
    registration: string
    displayName: string
  }
  current_slot?: BookingSlot
  original_slot?: BookingSlot
  reschedule_request?: RescheduleRequest
  pricing: {
    service_price_pence: number
    total_price_pence: number
    total_price_formatted: string
  }
  customer: {
    name: string
    email: string
    phone: string
  }
  actions: {
    can_reschedule: boolean
    can_cancel: boolean
    can_view_details: boolean
    can_rebook: boolean
  }
}

interface EnhancedBookingStatusCardProps {
  bookingId: string
  onReschedule?: () => void
  onCancel?: () => void
  onViewDetails?: () => void
}

export default function EnhancedBookingStatusCard({
  bookingId,
  onReschedule,
  onCancel,
  onViewDetails
}: EnhancedBookingStatusCardProps) {
  const [status, setStatus] = useState<CompleteBookingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    fetchCompleteStatus()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCompleteStatus, 30000)
    return () => clearInterval(interval)
  }, [bookingId])

  const fetchCompleteStatus = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/complete-status`)
      if (!response.ok) {
        throw new Error('Failed to fetch booking status')
      }
      
      const result = await response.json()
      if (result.success) {
        setStatus(result.data)
        setLastUpdated(new Date().toISOString())
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch status')
      }
    } catch (err) {
      console.error('Error fetching booking status:', err)
      setError(err instanceof Error ? err.message : 'Failed to load booking')
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = () => {
    if (!status) return null

    const { booking, reschedule_request } = status

    switch (booking.status) {
      case 'confirmed':
        if (reschedule_request?.status === 'pending') {
          return {
            type: 'warning' as const,
            title: '🕒 RESCHEDULE PENDING',
            message: 'Waiting for admin approval...',
            color: 'bg-orange-100 text-orange-800 border-orange-200'
          }
        }
        return {
          type: 'success' as const,
          title: '✅ CONFIRMED',
          message: 'Your booking is confirmed',
          color: 'bg-green-100 text-green-800 border-green-200'
        }

      case 'reschedule_approved':
        return {
          type: 'success' as const,
          title: '✅ RESCHEDULE APPROVED',
          message: 'Your reschedule has been approved! Updated booking details below.',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }

      case 'reschedule_declined':
        return {
          type: 'error' as const,
          title: '❌ RESCHEDULE DECLINED',
          message: reschedule_request?.admin_notes || 'Please contact us for alternatives',
          color: 'bg-red-100 text-red-800 border-red-200'
        }

      case 'reschedule_requested':
        return {
          type: 'warning' as const,
          title: '🕒 RESCHEDULE PENDING',
          message: 'Waiting for admin review...',
          color: 'bg-orange-100 text-orange-800 border-orange-200'
        }

      case 'completed':
        return {
          type: 'info' as const,
          title: '✅ COMPLETED',
          message: 'Service completed successfully',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }

      case 'cancelled':
        return {
          type: 'error' as const,
          title: '❌ CANCELLED',
          message: 'Booking has been cancelled',
          color: 'bg-red-100 text-red-800 border-red-200'
        }

      case 'pending':
        return {
          type: 'warning' as const,
          title: '🕒 PENDING',
          message: 'Awaiting confirmation',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }

      default:
        return {
          type: 'info' as const,
          title: booking.status.toUpperCase(),
          message: 'Status update in progress',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-muted-foreground">Loading booking status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !status) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <ErrorAlert title="Error Loading Booking">
            {error || 'Failed to load booking information'}
          </ErrorAlert>
          <Button 
            variant="outline" 
            onClick={fetchCompleteStatus}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusDisplay = getStatusDisplay()
  if (!statusDisplay) return null

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{status.service.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ref: {status.booking.reference}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusDisplay.color}>
              {statusDisplay.title}
            </Badge>
            <span className="text-lg font-semibold text-primary">
              {status.pricing.total_price_formatted}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Message */}
        {statusDisplay.type === 'warning' ? (
          <WarningAlert>{statusDisplay.message}</WarningAlert>
        ) : statusDisplay.type === 'error' ? (
          <ErrorAlert>{statusDisplay.message}</ErrorAlert>
        ) : statusDisplay.type === 'success' ? (
          <SuccessAlert>{statusDisplay.message}</SuccessAlert>
        ) : (
          <InfoAlert>{statusDisplay.message}</InfoAlert>
        )}

        {/* Current/Updated Booking Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">
                {status.current_slot?.formatted_date || 'Date TBD'}
              </p>
              <p className="text-xs text-muted-foreground">
                {status.current_slot?.formatted_time || 'Time TBD'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{status.vehicle.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {status.vehicle.registration}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Mobile Service</p>
              <p className="text-xs text-muted-foreground">
                Your location
              </p>
            </div>
          </div>
        </div>

        {/* Reschedule Request Details */}
        {status.reschedule_request && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-orange-800">Reschedule Request</h4>
                  <Badge className="bg-orange-500 text-white">
                    {status.reschedule_request.status}
                  </Badge>
                </div>
                
                {/* Timeline Expectations */}
                {status.reschedule_request.status === 'pending' && (
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-orange-800">
                      <Clock className="h-4 w-4" />
                      <strong>Expected Response:</strong> Admin will respond within 24 hours
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      Request submitted on {new Date(status.reschedule_request.requested_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                )}
                
                {status.current_slot && status.reschedule_request.requested_slot && (
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <div className="text-orange-700">
                      <strong>Current:</strong> {status.current_slot.formatted_date} at {status.current_slot.formatted_time}
                    </div>
                    <ArrowRight className="h-4 w-4 text-orange-600" />
                    <div className="text-orange-700">
                      <strong>Requested:</strong> {status.reschedule_request.requested_slot.formatted_date} at {status.reschedule_request.requested_slot.formatted_time}
                    </div>
                  </div>
                )}
                
                {status.reschedule_request.admin_notes && (
                  <div className="text-sm text-orange-700">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    <strong>Admin Note:</strong> {status.reschedule_request.admin_notes}
                  </div>
                )}
                
                {/* Contact Options for Urgent Requests */}
                {status.reschedule_request.status === 'pending' && (
                  <div className="border-t border-orange-200 pt-3">
                    <p className="text-xs text-orange-700 mb-2">Need urgent assistance?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-700 border-orange-300 hover:bg-orange-100"
                        onClick={() => window.open(`tel:${status.customer.phone}`)}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call Us
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-700 border-orange-300 hover:bg-orange-100"
                        onClick={() => window.open(`mailto:${status.customer.email}`)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reschedule History */}
        {status.booking.reschedule_count > 0 && (
          <div className="text-xs text-muted-foreground">
            Rescheduled {status.booking.reschedule_count} time{status.booking.reschedule_count !== 1 ? 's' : ''}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t">
          {status.actions.can_cancel && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={onCancel}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          
          {status.actions.can_reschedule && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={onReschedule}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reschedule
            </Button>
          )}
          
          {status.actions.can_rebook && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Repeat className="h-4 w-4 mr-1" />
              Book Again
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`tel:${status.customer.phone}`)}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}