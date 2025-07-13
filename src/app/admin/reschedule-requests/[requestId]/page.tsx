'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  Phone,
  Mail,
  Car,
  MapPin,
  CreditCard,
  Save,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

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

export default function RescheduleRequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const requestId = params.requestId as string
  
  const [request, setRequest] = useState<RescheduleRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchRequest()
  }, [requestId])

  const fetchRequest = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/reschedule-requests?status=all`)
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch request')
      }
      
      const foundRequest = result.data.find((r: RescheduleRequest) => r.id === requestId)
      if (!foundRequest) {
        throw new Error('Request not found')
      }
      
      setRequest(foundRequest)
      setAdminNotes(foundRequest.admin_notes || '')
    } catch (err) {
      console.error('Error fetching request:', err)
      setError(err instanceof Error ? err.message : 'Failed to load request')
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (action: 'approve' | 'decline') => {
    if (!request) return
    
    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/reschedule-requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          admin_notes: adminNotes
        })
      })

      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${action} request`)
      }
      
      // Refresh the request data
      await fetchRequest()
      
    } catch (err) {
      console.error(`Error ${action}ing request:`, err)
      setError(err instanceof Error ? err.message : `Failed to ${action} request`)
    } finally {
      setProcessing(false)
    }
  }

  const formatTimeSlot = (date: string, time: string) => {
    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = time.slice(0, 5)
    return `${formattedDate} at ${formattedTime}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'declined': return 'bg-red-100 text-red-800 border-red-200'
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-white" />
            <span className="ml-2 text-white">Loading request...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/admin/reschedule-requests">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Requests
              </Button>
            </Link>
          </div>
          
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error || 'Request not found'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/reschedule-requests">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Requests
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-white">Reschedule Request</h1>
                <Badge className={getStatusColor(request.status)}>
                  {request.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-white/60">{request.booking.booking_reference}</p>
            </div>
          </div>
          <Button 
            onClick={fetchRequest}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Schedule Change Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-white/60" />
                      <span className="text-white font-medium">Original Slot</span>
                    </div>
                    <p className="text-white/80 ml-6">
                      {formatTimeSlot(request.original_slot.slot_date, request.original_slot.start_time)}
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-purple-400" />
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-white/60" />
                      <span className="text-white font-medium">Requested Slot</span>
                    </div>
                    <p className="text-white/80 ml-6">
                      {formatTimeSlot(request.requested_slot.slot_date, request.requested_slot.start_time)}
                    </p>
                  </div>
                  
                  {request.reason && (
                    <div className="bg-blue-500/20 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-300" />
                        <span className="text-blue-200 font-medium">Customer Reason</span>
                      </div>
                      <p className="text-blue-100 ml-6">{request.reason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-white/60" />
                      <span className="text-white font-medium">Name</span>
                    </div>
                    <p className="text-white/80 ml-6">{request.customer.full_name}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Mail className="h-4 w-4 text-white/60" />
                      <span className="text-white font-medium">Email</span>
                    </div>
                    <p className="text-white/80 ml-6">{request.customer.email}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Phone className="h-4 w-4 text-white/60" />
                      <span className="text-white font-medium">Phone</span>
                    </div>
                    <p className="text-white/80 ml-6">{request.customer.phone}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Car className="h-4 w-4 text-white/60" />
                      <span className="text-white font-medium">Vehicle</span>
                    </div>
                    <p className="text-white/80 ml-6">
                      {request.booking.vehicles.make} {request.booking.vehicles.model}
                      <br />
                      <span className="text-white/60">{request.booking.vehicles.registration}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-white font-medium">Service</span>
                    </div>
                    <p className="text-white/80">{request.booking.services.name}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-white font-medium">Total Price</span>
                    </div>
                    <p className="text-white/80">{formatPrice(request.booking.total_price_pence)}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-white font-medium">Requested</span>
                    </div>
                    <p className="text-white/80">{new Date(request.requested_at).toLocaleString('en-GB')}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-white font-medium">Expires</span>
                    </div>
                    <p className="text-white/80">{new Date(request.expires_at).toLocaleString('en-GB')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Admin Actions */}
            {request.status === 'pending' && (
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="adminNotes" className="text-white">Admin Notes</Label>
                    <textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full mt-2 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                      placeholder="Add notes about this decision..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleDecision('approve')}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => handleDecision('decline')}
                      disabled={processing}
                      variant="outline"
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Notes (if already processed) */}
            {request.admin_notes && (
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Admin Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80">{request.admin_notes}</p>
                  {request.responded_at && (
                    <p className="text-white/60 text-sm mt-2">
                      {new Date(request.responded_at).toLocaleString('en-GB')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}