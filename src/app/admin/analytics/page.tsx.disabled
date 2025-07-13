'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Car,
  RefreshCw,
  Download,
  Filter,
  ChevronDown
} from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'

interface AnalyticsData {
  totalRevenue: number
  totalBookings: number
  totalCustomers: number
  averageBookingValue: number
  monthlyGrowth: number
  bookingBreakdown: {
    completed: number
    pending: number
    confirmed: number
    cancelled: number
  }
  popularServices: Array<{
    name: string
    bookings: number
    revenue: number
  }>
  recentMetrics: Array<{
    period: string
    bookings: number
    revenue: number
  }>
}

export default function AdminAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📊 Fetching analytics data for range:', dateRange)
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Analytics data received:', result.data)
        setAnalyticsData(result.data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Failed to load analytics data (${response.status})`
        console.error('❌ Analytics API error:', response.status, errorMessage, errorData)
        setError(errorMessage)
      }
    } catch (err) {
      console.error('❌ Analytics fetch error:', err)
      setError('Error loading analytics - please check your connection')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount / 100)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-GB').format(num)
  }

  if (loading) {
    return (
      <AdminLayout title="Analytics Dashboard" subtitle="Loading business insights...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title="Analytics Dashboard" subtitle="Error loading analytics">
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Analytics Unavailable</h3>
              <p className="text-white/60 mb-4">{error}</p>
              <Button onClick={fetchAnalyticsData} className="bg-purple-600 hover:bg-purple-700 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Analytics Dashboard" subtitle="Business insights and performance metrics">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:text-white hover:border-white/40">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:text-white hover:border-white/40">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={fetchAnalyticsData} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '1y' && 'Last Year'}
            </Button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analyticsData ? formatCurrency(analyticsData.totalRevenue) : '£0.00'}
              </div>
              <p className="text-xs text-white/60">
                {analyticsData && analyticsData.monthlyGrowth > 0 ? (
                  <span className="text-green-600">
                    +{analyticsData.monthlyGrowth.toFixed(1)}% from last month
                  </span>
                ) : analyticsData?.bookingBreakdown ? (
                  <span>
                    From {analyticsData.bookingBreakdown.completed} completed bookings
                  </span>
                ) : (
                  'Revenue from completed services'
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analyticsData ? formatNumber(analyticsData.totalBookings) : '0'}
              </div>
              <p className="text-xs text-white/60">
                {analyticsData?.bookingBreakdown ? (
                  <span>
                    {analyticsData.bookingBreakdown.completed} completed, {analyticsData.bookingBreakdown.confirmed} confirmed
                  </span>
                ) : (
                  'Active bookings (completed + confirmed)'
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analyticsData ? formatNumber(analyticsData.totalCustomers) : '0'}
              </div>
              <p className="text-xs text-white/60">
                Active customer base
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Avg. Booking Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analyticsData ? formatCurrency(analyticsData.averageBookingValue) : '£0.00'}
              </div>
              <p className="text-xs text-white/60">
                Per booking average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and detailed analytics would go here */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Popular Services</CardTitle>
              <CardDescription className="text-white/60">
                Most booked services in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData?.popularServices?.length ? (
                <div className="space-y-4">
                  {analyticsData.popularServices.map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Car className="h-4 w-4 text-purple-400" />
                        <span className="font-medium text-white">{service.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">{formatNumber(service.bookings)} bookings</div>
                        <div className="text-sm text-white/60">
                          {formatCurrency(service.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-white/60 py-8">
                  No service data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Performance Trends</CardTitle>
              <CardDescription className="text-white/60">
                Revenue and booking trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-white/60 py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-purple-400" />
                <p className="text-white/70">Charts and graphs coming soon</p>
                <Badge className="mt-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Enhanced Analytics
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Analytics Summary</CardTitle>
            <CardDescription className="text-white/60">
              Key insights for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="font-semibold text-purple-300 mb-1">Revenue Growth</div>
                <div className="text-white/60">
                  {analyticsData?.monthlyGrowth 
                    ? `${analyticsData.monthlyGrowth > 0 ? '+' : ''}${analyticsData.monthlyGrowth.toFixed(1)}%`
                    : 'No data available'
                  } compared to previous period
                </div>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="font-semibold text-purple-300 mb-1">Customer Retention</div>
                <div className="text-white/60">
                  Analytics available after implementation of tracking
                </div>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="font-semibold text-purple-300 mb-1">Service Efficiency</div>
                <div className="text-white/60">
                  Performance metrics being calculated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}