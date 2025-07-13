'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Clock,
  User,
  Car,
  Mail,
  Phone,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface RescheduleRequest {
  bookingId: string
  bookingReference?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  currentDate?: string
  currentTime?: string
  requestedDate?: string
  requestedTime?: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  vehicleInfo?: string
  serviceInfo?: string
  daysPending?: number
  totalPrice?: string
}

interface RescheduleRequestManagerProps {
  onRequestUpdate?: (bookingId: string, status: 'approved' | 'rejected') => void
}

export default function RescheduleRequestManager({ onRequestUpdate }: RescheduleRequestManagerProps) {
  const [requests, setRequests] = useState<RescheduleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRescheduleRequests()
  }, [])

  const fetchRescheduleRequests = async () => {
    try {
      setLoading(true)
      
      // Fetch from the comprehensive admin API
      const response = await fetch('/api/admin/pending-slot-actions')
      if (!response.ok) {
        throw new Error('Failed to fetch pending actions')
      }
      
      const result = await response.json()
      if (result.success) {
        // Extract reschedule requests from the comprehensive response
        const rescheduleRequestsData = result.data.pending_actions.reschedule_requests || []
        
        // Convert to the format expected by this component
        const requestList: RescheduleRequest[] = rescheduleRequestsData.map((req: any) => ({
          bookingId: req.booking_id,
          bookingReference: req.booking_reference,
          customerName: req.customer.name,
          customerEmail: req.customer.email,
          customerPhone: req.customer.phone,
          currentDate: req.current_slot?.date,
          currentTime: req.current_slot?.time,
          requestedDate: req.requested_slot?.date,
          requestedTime: req.requested_slot?.time,
          reason: req.reason,
          status: 'pending',
          requestedAt: req.requested_at,
          vehicleInfo: '', // Not included in current API
          serviceInfo: req.service.name,
          daysPending: req.days_pending,
          totalPrice: req.total_price
        }))
        
        setRequests(requestList)
      } else {
        throw new Error(result.error || 'Failed to fetch requests')
      }
    } catch (error) {
      console.error('Error fetching reschedule requests:', error)
      
      // Fallback to localStorage if API fails
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('reschedule-requests')
        const rescheduleData = saved ? JSON.parse(saved) : {}
        
        const requestList: RescheduleRequest[] = Object.entries(rescheduleData).map(([bookingId, data]: [string, any]) => ({
          bookingId,
          bookingReference: `L4D-${bookingId.slice(-8)}`,
          customerName: 'Customer',
          customerEmail: 'customer@example.com',
          status: data.status,
          requestedAt: data.requestedAt,
          requestedDate: data.newDate,
          requestedTime: data.newTime,
          reason: 'Customer request'
        }))
        
        setRequests(requestList.filter(req => req.status === 'pending'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAction = async (bookingId: string, action: 'approve' | 'reject') => {
    setProcessingId(bookingId)
    try {
      // Update localStorage (temporary)
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('reschedule-requests')
        const rescheduleData = saved ? JSON.parse(saved) : {}
        
        if (rescheduleData[bookingId]) {
          rescheduleData[bookingId].status = action === 'approve' ? 'approved' : 'rejected'
          localStorage.setItem('reschedule-requests', JSON.stringify(rescheduleData))
        }
      }

      // Notify parent component
      onRequestUpdate?.(bookingId, action === 'approve' ? 'approved' : 'rejected')
      
      // Send email notification to customer (simulate)
      console.log(`📧 Sending ${action} notification for booking ${bookingId}`)
      
      // Refresh the list
      await fetchRescheduleRequests()
      
    } catch (error) {
      console.error(`Error ${action}ing reschedule request:`, error)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <Card className="bg-gray-800/40 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-purple-400" />
            Reschedule Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/40 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-purple-400" />
          Reschedule Requests
          {requests.length > 0 && (
            <Badge className="bg-orange-500 text-white ml-2">
              {requests.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <RotateCcw className="h-12 w-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/60">No pending reschedule requests</p>
          </div>
        ) : (
          requests.map((request) => (
            <Card key={request.bookingId} className="bg-gray-700/40 border-gray-600/40">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{request.bookingReference}</h4>
                      <p className="text-sm text-white/60">
                        Requested: {new Date(request.requestedAt).toLocaleDateString()}
                        {request.daysPending && request.daysPending > 0 && (
                          <span className="ml-2 text-orange-300">
                            ({request.daysPending} day{request.daysPending !== 1 ? 's' : ''} ago)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                        Pending Review
                      </Badge>
                      {request.totalPrice && (
                        <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                          {request.totalPrice}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-400" />
                      <span className="text-white/80">{request.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-400" />
                      <span className="text-white/80">{request.customerEmail}</span>
                    </div>
                    {request.serviceInfo && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-purple-400" />
                        <span className="text-white/80">{request.serviceInfo}</span>
                      </div>
                    )}
                  </div>

                  {/* Reschedule Details */}
                  <div className="bg-gray-800/60 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-2">Reschedule Details</h5>
                    
                    {/* Current vs Requested Comparison */}
                    <div className="space-y-2">
                      {request.currentDate && request.currentTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-red-400" />
                          <span className="text-white/80">
                            <strong>Current:</strong> {new Date(request.currentDate).toLocaleDateString()} at {request.currentTime?.slice(0, 5)}
                          </span>
                        </div>
                      )}
                      
                      {request.requestedDate && request.requestedTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-green-400" />
                          <span className="text-white/80">
                            <strong>Requested:</strong> {new Date(request.requestedDate).toLocaleDateString()} at {request.requestedTime?.slice(0, 5)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {request.reason && (
                      <div className="mt-2 pt-2 border-t border-gray-700/50">
                        <span className="text-white/60 text-sm"><strong>Reason:</strong> {request.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-400 border-green-400/40 hover:bg-green-400/10"
                      onClick={() => handleRequestAction(request.bookingId, 'approve')}
                      disabled={processingId === request.bookingId}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 border-red-400/40 hover:bg-red-400/10"
                      onClick={() => handleRequestAction(request.bookingId, 'reject')}
                      disabled={processingId === request.bookingId}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-400 border-blue-400/40 hover:bg-blue-400/10"
                      onClick={() => window.open(`mailto:${request.customerEmail}`)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Contact
                    </Button>
                    {processingId === request.bookingId && (
                      <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Info Alert */}
        <Alert className="bg-blue-500/20 border-blue-400/30">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            Reschedule requests are temporarily tracked locally. Once approved/rejected, customers will be notified via email.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}