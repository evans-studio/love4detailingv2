'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Download,
  RefreshCw,
  Mail,
  Globe,
  Clock,
  BarChart3,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface ComingSoonSignup {
  id: string
  email: string
  ip_address: string
  user_agent: string
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  created_at: string
}

interface ComingSoonStats {
  total_signups: number
  recent_signups: number
  today_signups: number
  latest_signup: string
  daily_growth: Array<{
    date: string
    count: number
  }>
}

export default function ComingSoonAdminPage() {
  const [signups, setSignups] = useState<ComingSoonSignup[]>([])
  const [stats, setStats] = useState<ComingSoonStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch stats
      const statsResponse = await fetch('/api/coming-soon/signup')
      const statsData = await statsResponse.json()

      if (statsData.success) {
        setStats(statsData.stats)
      }

      // Fetch signups (you'll need to create this endpoint)
      const signupsResponse = await fetch('/api/admin/coming-soon/signups')
      const signupsData = await signupsResponse.json()

      if (signupsData.success) {
        setSignups(signupsData.signups)
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const exportSignups = () => {
    if (signups.length === 0) return

    const csvContent = [
      ['Email', 'Signup Date', 'IP Address', 'Referrer', 'UTM Source', 'UTM Medium', 'UTM Campaign'].join(','),
      ...signups.map(signup => [
        signup.email,
        new Date(signup.created_at).toLocaleDateString(),
        signup.ip_address || '',
        signup.referrer || '',
        signup.utm_source || '',
        signup.utm_medium || '',
        signup.utm_campaign || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coming-soon-signups-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-white" />
            <span className="ml-2 text-white">Loading coming soon data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Coming Soon Signups</h1>
              <p className="text-white/60">Monitor pre-launch email signups and engagement</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={exportSignups} variant="outline" disabled={signups.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={fetchData} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/10 border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Signups</CardTitle>
                <Users className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.total_signups}</div>
                <p className="text-xs text-white/60">All time signups</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.recent_signups}</div>
                <p className="text-xs text-white/60">Last 7 days</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Today</CardTitle>
                <Calendar className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.today_signups}</div>
                <p className="text-xs text-white/60">Today's signups</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Latest Signup</CardTitle>
                <Clock className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-white">
                  {stats.latest_signup ? formatDate(stats.latest_signup) : 'No signups yet'}
                </div>
                <p className="text-xs text-white/60">Most recent</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Growth Chart */}
        {stats?.daily_growth && (
          <Card className="bg-white/10 border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Daily Signup Growth (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-1">
                {stats.daily_growth.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="bg-purple-500 w-full rounded-t"
                      style={{ 
                        height: `${Math.max(4, (day.count / Math.max(...stats.daily_growth.map(d => d.count))) * 200)}px` 
                      }}
                    />
                    <div className="text-xs text-white/60 mt-1">
                      {new Date(day.date).getDate()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signups List */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Recent Signups
            </CardTitle>
            <CardDescription className="text-white/60">
              Latest email signups from the coming soon page
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signups.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                No signups yet. Share the coming soon page to start collecting emails!
              </div>
            ) : (
              <div className="space-y-4">
                {signups.slice(0, 50).map((signup) => (
                  <div key={signup.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{signup.email}</div>
                        <div className="text-white/60 text-sm">
                          {formatDate(signup.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {signup.utm_source && (
                        <Badge variant="outline" className="text-xs">
                          {signup.utm_source}
                        </Badge>
                      )}
                      {signup.ip_address && (
                        <div className="flex items-center text-white/60 text-xs">
                          <Globe className="w-3 h-3 mr-1" />
                          {signup.ip_address}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {signups.length > 50 && (
                  <div className="text-center py-4 text-white/60">
                    ... and {signups.length - 50} more signups
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}