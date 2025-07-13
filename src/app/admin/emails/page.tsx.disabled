'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  RefreshCw,
  Eye,
  MessageSquare,
  AlertCircle,
  Download,
  Filter
} from 'lucide-react'

interface EmailAnalytics {
  summary: {
    total_emails: number
    delivered_emails: number
    failed_emails: number
    delivery_rate: string
  }
  email_types: Record<string, {
    total: number
    delivered: number
    failed: number
  }>
  daily_analytics: Array<{
    email_type: string
    date: string
    total_sent: number
    delivered: number
    failed: number
    opened: number
    clicked: number
    delivery_rate: number
    open_rate: number
    click_rate: number
  }>
  recent_emails: Array<{
    id: string
    email_type: string
    email_address: string
    subject: string
    delivery_status: string
    sent_at: string
    opened_at: string | null
    clicked_at: string | null
    error_message: string | null
  }>
}

export default function AdminEmailDashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedEmailType, setSelectedEmailType] = useState('all')

  useEffect(() => {
    if (user?.id) {
      fetchEmailAnalytics()
    }
  }, [user?.id, selectedPeriod])

  const fetchEmailAnalytics = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/emails/analytics?admin_id=${user.id}&days=${selectedPeriod}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch email analytics')
      }

      setAnalytics(result)

    } catch (error) {
      console.error('Error fetching email analytics:', error)
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          setError('Email analytics access requires admin permissions. Please contact your administrator.')
        } else if (error.message.includes('404')) {
          setError('Email system is being set up. Analytics will be available once email features are enabled.')
        } else {
          setError(error.message)
        }
      } else {
        setError('Failed to load email analytics')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'booking_confirmation': 'Booking Confirmations',
      'booking_reminder': 'Booking Reminders',
      'booking_cancellation': 'Cancellations',
      'booking_rescheduling': 'Rescheduling',
      'service_completion': 'Service Completion',
      'welcome_bonus': 'Welcome Emails',
      'points_earned': 'Points Notifications',
      'tier_upgrade': 'Tier Upgrades',
      'follow_up_reminder': 'Follow-up Reminders'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const config = {
      'delivered': { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
      'failed': { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle },
      'pending': { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Clock },
      'bounced': { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: AlertCircle }
    }

    const statusConfig = config[status as keyof typeof config] || config.pending
    const IconComponent = statusConfig.icon

    return (
      <Badge className={`${statusConfig.color} border flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <AdminLayout title="Email Analytics" subtitle="Loading email performance data...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Email Analytics" subtitle="Email performance and delivery analytics">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-800/40 border border-purple-500/20 rounded-md text-white text-sm"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            <Button
              onClick={fetchEmailAnalytics}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:text-white hover:border-white/40">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Statistics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <Mail className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{analytics.summary.total_emails}</p>
                <p className="text-xs text-white/60">Total Emails</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{analytics.summary.delivered_emails}</p>
                <p className="text-xs text-white/60">Delivered</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{analytics.summary.failed_emails}</p>
                <p className="text-xs text-white/60">Failed</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{analytics.summary.delivery_rate}%</p>
                <p className="text-xs text-white/60">Delivery Rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Type Breakdown */}
        {analytics && Object.keys(analytics.email_types).length > 0 && (
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Email Types Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.email_types).map(([type, stats]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{getEmailTypeLabel(type)}</h4>
                      <p className="text-sm text-white/60">
                        {stats.total} sent • {stats.delivered} delivered • {stats.failed} failed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        {stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : '0.0'}%
                      </p>
                      <p className="text-xs text-white/60">Success Rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Email Activity */}
        {analytics && analytics.recent_emails.length > 0 && (
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Email Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analytics.recent_emails.slice(0, 20).map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-purple-300">
                          {getEmailTypeLabel(email.email_type)}
                        </span>
                        {getStatusBadge(email.delivery_status)}
                      </div>
                      <h4 className="font-medium text-white truncate">{email.subject}</h4>
                      <p className="text-sm text-white/60 truncate">{email.email_address}</p>
                      <p className="text-xs text-white/50">{formatDate(email.sent_at)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {email.opened_at && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Opened
                        </Badge>
                      )}
                      {email.clicked_at && (
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                          Clicked
                        </Badge>
                      )}
                      {email.error_message && (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {analytics && analytics.summary.total_emails === 0 && (
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-8 text-center">
              <Mail className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white/70 mb-2">
                {analytics.note ? 'Email System Setup' : 'No Email Activity'}
              </h3>
              <p className="text-white/50 mb-4">
                {analytics.note 
                  ? 'The email notification system is ready to be activated. Email analytics will appear here once the system starts sending emails.'
                  : 'No emails have been sent in the selected time period.'
                }
              </p>
              {analytics.note && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <h4 className="text-blue-300 font-medium mb-2">📧 Email Features Ready</h4>
                  <ul className="text-blue-200/80 text-sm text-left space-y-1">
                    <li>✅ Booking confirmation emails</li>
                    <li>✅ Welcome bonus notifications</li>
                    <li>✅ Loyalty points alerts</li>
                    <li>✅ Service reminders</li>
                    <li>✅ Admin notifications</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}