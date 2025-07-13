'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

export default function RescheduleRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RescheduleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/reschedule-requests?status=${filter}`)
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch requests')
      }
      
      setRequests(result.data)
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'declined': return 'bg-red-100 text-red-800 border-red-200'
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    return request.status === filter
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Reschedule Requests</h1>
              <p className="text-white/60">Manage customer reschedule requests</p>
            </div>
          </div>
          <Button 
            onClick={fetchRequests}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6">
          {[
            { key: 'all', label: 'All', count: requests.length },
            { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
            { key: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
            { key: 'declined', label: 'Declined', count: requests.filter(r => r.status === 'declined').length },
            { key: 'expired', label: 'Expired', count: requests.filter(r => r.status === 'expired').length }
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
              className="flex items-center space-x-2"
            >
              <span>{label}</span>
              <Badge variant="secondary" className="ml-2">{count}</Badge>
            </Button>
          ))}
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

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-white" />
            <span className="ml-2 text-white">Loading requests...</span>
          </div>
        ) : (
          /* Requests List */
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <Card className="bg-white/10 border-white/20">
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-white text-lg">No {filter === 'all' ? '' : filter} requests found</p>
                  <p className="text-white/60 mt-2">
                    {filter === 'pending' ? 'All caught up! No pending requests.' : 'No requests match the current filter.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => (
                <Card key={request.id} className="bg-white/10 border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                            <span className="font-medium text-white">
                              {request.booking.booking_reference}
                            </span>
                          </div>
                          <div className="text-sm text-white/60">
                            {new Date(request.requested_at).toLocaleDateString('en-GB')}
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center space-x-2 mb-4">
                          <User className="h-4 w-4 text-purple-400" />
                          <span className="font-medium text-white">{request.customer.full_name}</span>
                          <span className="text-white/60">• {request.booking.services.name}</span>
                        </div>

                        {/* Time Change */}
                        <div className="bg-white/5 p-4 rounded-lg mb-4">
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="h-4 w-4 text-white/60" />
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="text-white/80">
                                {formatTimeSlot(request.original_slot.slot_date, request.original_slot.start_time)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-white/60" />
                              <span className="font-medium text-white">
                                {formatTimeSlot(request.requested_slot.slot_date, request.requested_slot.start_time)}
                              </span>
                            </div>
                          </div>
                          
                          {request.reason && (
                            <div className="mt-2 text-sm text-white/80">
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              <strong>Reason:</strong> {request.reason}
                            </div>
                          )}
                        </div>

                        {/* Admin Notes */}
                        {request.admin_notes && (
                          <div className="bg-blue-500/20 p-3 rounded-lg mb-4">
                            <div className="text-sm text-blue-200">
                              <strong>Admin Notes:</strong> {request.admin_notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/reschedule-requests/${request.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}