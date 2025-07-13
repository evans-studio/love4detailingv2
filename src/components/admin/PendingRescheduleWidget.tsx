'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  Users, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  ArrowRight,
  Eye,
  Loader2,
  Calendar,
  MessageSquare,
  RotateCcw
} from 'lucide-react'

interface RescheduleRequest {
  id: string
  booking_id: string
  customer_id: string
  status: 'pending' | 'approved' | 'declined' | 'expired'
  reason: string
  admin_notes?: string
  requested_at: string
  responded_at?: string
  expires_at: string
  booking: {
    booking_reference: string
    customer_name: string
    customer_email: string
    total_price_pence: number
    services: {
      name: string
    }
    vehicles: {
      make: string
      model: string
      registration: string
    }
  }
  customer: {
    full_name: string
    email: string
    phone: string
  }
  original_slot: {
    slot_date: string
    start_time: string
  }
  requested_slot: {
    slot_date: string
    start_time: string
  }
}

interface PendingRescheduleWidgetProps {
  className?: string
  onRequestClick?: (requestId: string) => void
  maxDisplay?: number
}

export default function PendingRescheduleWidget({ 
  className = "",
  onRequestClick,
  maxDisplay = 5
}: PendingRescheduleWidgetProps) {
  const [requests, setRequests] = useState<RescheduleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingRequests()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPendingRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/admin/reschedule-requests?status=pending')
      if (!response.ok) {
        throw new Error('Failed to fetch reschedule requests')
      }
      
      const result = await response.json()
      if (result.success) {
        setRequests(result.data || [])
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch requests')
      }
    } catch (err) {
      console.error('Error fetching pending requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDecision = async (requestId: string, action: 'approve' | 'decline', notes?: string) => {
    setProcessingRequest(requestId)
    
    try {
      const response = await fetch(`/api/admin/reschedule-requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          admin_notes: notes || (action === 'approve' ? 'Approved via quick action' : 'Declined via quick action')
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process request')
      }

      const result = await response.json()
      if (result.success) {
        // Refresh the list
        await fetchPendingRequests()
      } else {
        throw new Error(result.error || 'Failed to process request')
      }
    } catch (err) {
      console.error('Error processing request:', err)
      // Show error notification here
    } finally {
      setProcessingRequest(null)
    }
  }

  const formatTimeSlot = (date: string, time: string) => {
    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    const formattedTime = time.slice(0, 5)
    return `${formattedDate} at ${formattedTime}`
  }

  const getPriorityLevel = (request: RescheduleRequest) => {
    const requestDate = new Date(request.requested_at)
    const hoursAgo = (Date.now() - requestDate.getTime()) / (1000 * 60 * 60)
    const expiresAt = new Date(request.expires_at)
    const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
    
    if (hoursUntilExpiry <= 24) return 'urgent'
    if (hoursAgo >= 12) return 'high'
    return 'normal'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Pending Reschedule Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-muted-foreground">Loading requests...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Pending Reschedule Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPendingRequests}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayRequests = requests.slice(0, maxDisplay)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Pending Reschedule Requests
            {requests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {requests.length}
              </Badge>
            )}
          </CardTitle>
          {requests.length > maxDisplay && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestClick?.('all')}
            >
              View All ({requests.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayRequests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No pending reschedule requests</p>
            <p className="text-xs text-muted-foreground mt-1">All caught up! 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayRequests.map((request) => {
              const priority = getPriorityLevel(request)
              const isProcessing = processingRequest === request.id
              
              return (
                <Card key={request.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header with Priority */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(priority)}>
                            {priority.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-sm">
                            {request.booking.booking_reference}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(request.requested_at).toLocaleDateString('en-GB')}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{request.customer.full_name}</span>
                        <span className="text-sm text-muted-foreground">
                          • {request.booking.services.name}
                        </span>
                      </div>

                      {/* Change Details */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-700">
                              {formatTimeSlot(request.original_slot.slot_date, request.original_slot.start_time)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-gray-500" />
                            <span className="font-medium text-gray-900">
                              {formatTimeSlot(request.requested_slot.slot_date, request.requested_slot.start_time)}
                            </span>
                          </div>
                        </div>
                        
                        {request.reason && (
                          <div className="mt-2 text-xs text-gray-600">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            <strong>Reason:</strong> {request.reason}
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleQuickDecision(request.id, 'approve')}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          Approve
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleQuickDecision(request.id, 'decline')}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          Decline
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRequestClick?.(request.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}