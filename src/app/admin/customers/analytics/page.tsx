'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  UserPlus,
  Repeat,
  Crown,
  Star,
  Trophy,
  Heart,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Phone,
  Mail,
  MapPin,
  Filter,
  ChevronDown,
  AlertCircle
} from 'lucide-react'

interface CustomerAnalytics {
  overview: {
    total_customers: number
    active_customers: number
    new_customers_this_month: number
    returning_customers: number
    churn_rate: number
    avg_customer_lifetime_value_pence: number
  }
  demographics: {
    by_tier: {
      bronze: number
      silver: number
      gold: number
    }
    by_activity: {
      active_7d: number
      active_30d: number
      dormant: number
    }
    by_registration: {
      email_verified: number
      phone_verified: number
      profile_complete: number
    }
  }
  engagement: {
    avg_bookings_per_customer: number
    avg_days_between_bookings: number
    most_popular_service: string
    peak_booking_day: string
    repeat_customer_rate: number
  }
  revenue: {
    total_revenue_pence: number
    avg_order_value_pence: number
    revenue_per_customer_pence: number
    top_spenders: Array<{
      name: string
      email: string
      total_spent_pence: number
      bookings_count: number
    }>
  }
  trends: {
    monthly_growth_rate: number
    booking_frequency_trend: string
    seasonal_patterns: string[]
  }
}

export default function AdminCustomerAnalyticsPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')

  useEffect(() => {
    if (user?.id) {
      fetchCustomerAnalytics()
    }
  }, [user?.id, dateRange])

  const fetchCustomerAnalytics = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/customers/analytics?admin_id=${user.id}&range=${dateRange}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer analytics')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch customer analytics')
      }

      setAnalytics(result.analytics)

    } catch (error) {
      console.error('Error fetching customer analytics:', error)
      setError(error instanceof Error ? error.message : 'Failed to load customer analytics')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchCustomerAnalytics()
  }

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'gold': return Crown
      case 'silver': return Star
      case 'bronze': return Trophy
      default: return Users
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'text-yellow-400'
      case 'silver': return 'text-gray-300'
      case 'bronze': return 'text-orange-400'
      default: return 'text-purple-400'
    }
  }

  if (isLoading) {
    return (
      <AdminLayout title="Customer Analytics" subtitle="Loading customer insights...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title="Customer Analytics" subtitle="Error loading analytics">
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Analytics Unavailable</h3>
              <p className="text-white/60 mb-4">{error}</p>
              <Button onClick={fetchCustomerAnalytics} className="bg-purple-600 hover:bg-purple-700 text-white">
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
    <AdminLayout title="Customer Analytics" subtitle="Deep insights into customer behavior and engagement">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-gray-800/40 border border-purple-500/20 rounded-md text-white text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
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

        {analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{analytics.overview.total_customers}</p>
                  <p className="text-xs text-white/60">Total Customers</p>
                  <p className="text-xs text-green-400 mt-1">
                    {analytics.overview.active_customers} active
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardContent className="p-4 text-center">
                  <UserPlus className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{analytics.overview.new_customers_this_month}</p>
                  <p className="text-xs text-white/60">New This Month</p>
                  <p className="text-xs text-purple-400 mt-1">
                    {formatPercentage(analytics.overview.churn_rate)} churn rate
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{formatPrice(analytics.overview.avg_customer_lifetime_value_pence)}</p>
                  <p className="text-xs text-white/60">Avg. Lifetime Value</p>
                  <p className="text-xs text-green-400 mt-1">
                    {analytics.overview.returning_customers} returning
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Demographics and Engagement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Tiers */}
              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Customer Tiers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.demographics.by_tier).map(([tier, count]) => {
                      const Icon = getTierIcon(tier)
                      const colorClass = getTierColor(tier)
                      const total = Object.values(analytics.demographics.by_tier).reduce((sum, val) => sum + val, 0)
                      const percentage = total > 0 ? (count / total) * 100 : 0

                      return (
                        <div key={tier} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className={`h-5 w-5 ${colorClass}`} />
                            <span className="text-white font-medium capitalize">{tier}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">{count}</p>
                            <p className="text-xs text-white/60">{formatPercentage(percentage)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Levels */}
              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Activity Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-5 w-5 text-green-400" />
                        <span className="text-white font-medium">Active (7 days)</span>
                      </div>
                      <p className="text-white font-semibold">{analytics.demographics.by_activity.active_7d}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-blue-400" />
                        <span className="text-white font-medium">Active (30 days)</span>
                      </div>
                      <p className="text-white font-semibold">{analytics.demographics.by_activity.active_30d}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <span className="text-white font-medium">Dormant</span>
                      </div>
                      <p className="text-white font-semibold">{analytics.demographics.by_activity.dormant}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Metrics */}
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Engagement Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <Repeat className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{analytics.engagement.avg_bookings_per_customer.toFixed(1)}</p>
                    <p className="text-sm text-white/60">Avg. Bookings per Customer</p>
                  </div>

                  <div className="text-center">
                    <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{analytics.engagement.avg_days_between_bookings}</p>
                    <p className="text-sm text-white/60">Days Between Bookings</p>
                  </div>

                  <div className="text-center">
                    <Heart className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{formatPercentage(analytics.engagement.repeat_customer_rate)}</p>
                    <p className="text-sm text-white/60">Repeat Customer Rate</p>
                  </div>

                  <div className="text-center">
                    <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white">{analytics.engagement.most_popular_service}</p>
                    <p className="text-sm text-white/60">Most Popular Service</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Spenders */}
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Top Spenders</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.revenue.top_spenders.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No customer data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.revenue.top_spenders.map((customer, index) => (
                      <div
                        key={customer.email}
                        className="flex items-center justify-between p-3 bg-gray-700/30 border border-purple-500/10 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <span className="text-purple-300 font-semibold text-sm">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{customer.name}</p>
                            <p className="text-white/60 text-xs">{customer.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatPrice(customer.total_spent_pence)}</p>
                          <p className="text-white/60 text-xs">{customer.bookings_count} bookings</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{formatPrice(analytics.revenue.total_revenue_pence)}</p>
                  <p className="text-xs text-white/60">Total Revenue</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{formatPrice(analytics.revenue.avg_order_value_pence)}</p>
                  <p className="text-xs text-white/60">Avg. Order Value</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/40 border-purple-500/20">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{formatPrice(analytics.revenue.revenue_per_customer_pence)}</p>
                  <p className="text-xs text-white/60">Revenue per Customer</p>
                </CardContent>
              </Card>
            </div>

            {/* Growth Trends */}
            <Card className="bg-gray-800/40 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Growth Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white">{formatPercentage(analytics.trends.monthly_growth_rate)}</p>
                    <p className="text-sm text-white/60">Monthly Growth Rate</p>
                  </div>
                  
                  <div>
                    <Activity className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-lg font-medium text-white">{analytics.trends.booking_frequency_trend}</p>
                    <p className="text-sm text-white/60">Booking Frequency Trend</p>
                  </div>
                  
                  <div>
                    <Calendar className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <div className="space-y-1">
                      {analytics.trends.seasonal_patterns.map((pattern, index) => (
                        <p key={index} className="text-sm text-white/70">{pattern}</p>
                      ))}
                    </div>
                    <p className="text-sm text-white/60 mt-2">Seasonal Patterns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}