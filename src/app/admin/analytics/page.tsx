'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/loadingState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getAvailableServices, calculateServicePrice } from '@/lib/config/services';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Car,
  Clock,
  Target,
  Download,
  RefreshCw,
  Wrench
} from 'lucide-react';

interface AnalyticsData {
  revenue: {
    total: number;
    monthly: number;
    weekly: number;
    daily: number;
    monthlyTrend: number;
    weeklyTrend: number;
  };
  bookings: {
    total: number;
    monthly: number;
    weekly: number;
    daily: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  customers: {
    total: number;
    new_monthly: number;
    returning: number;
    active: number;
  };
  performance: {
    averageBookingValue: number;
    utilizationRate: number;
    customerRetentionRate: number;
    popularTimeSlots: Array<{
      slot_time: string;
      booking_count: number;
    }>;
    topServices: Array<{
      size_category: string;
      booking_count: number;
      revenue: number;
    }>;
  };
  services: {
    totalOffered: number;
    mostPopular: {
      name: string;
      bookings: number;
      revenue: number;
    };
    revenueBySize: Array<{
      size: string;
      revenue: number;
      bookings: number;
      avgPrice: number;
    }>;
    conversionRate: number;
  };
  monthlyData: Array<{
    month: string;
    revenue: number;
    bookings: number;
    customers: number;
  }>;
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('12months');
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Revenue Analytics
      const [
        totalRevenueRes,
        monthlyRevenueRes,
        weeklyRevenueRes,
        dailyRevenueRes,
        prevMonthRevenueRes
      ] = await Promise.all([
        supabase.from('bookings').select('total_price_pence'),
        supabase.from('bookings')
          .select('total_price_pence')
          .gte('created_at', startOfMonth.toISOString()),
        supabase.from('bookings')
          .select('total_price_pence')
          .gte('created_at', startOfWeek.toISOString()),
        supabase.from('bookings')
          .select('total_price_pence')
          .gte('created_at', startOfDay.toISOString()),
        supabase.from('bookings')
          .select('total_price_pence')
          .gte('created_at', startOfPrevMonth.toISOString())
          .lt('created_at', endOfPrevMonth.toISOString()),
      ]);

      const totalRevenue = (totalRevenueRes.data || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
      const monthlyRevenue = (monthlyRevenueRes.data || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
      const weeklyRevenue = (weeklyRevenueRes.data || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
      const dailyRevenue = (dailyRevenueRes.data || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
      const prevMonthRevenue = (prevMonthRevenueRes.data || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);

      // Booking Analytics
      const [
        totalBookingsRes,
        monthlyBookingsRes,
        weeklyBookingsRes,
        dailyBookingsRes,
        pendingBookingsRes,
        confirmedBookingsRes,
        completedBookingsRes,
        cancelledBookingsRes
      ] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact' }),
        supabase.from('bookings').select('id', { count: 'exact' }).gte('created_at', startOfMonth.toISOString()),
        supabase.from('bookings').select('id', { count: 'exact' }).gte('created_at', startOfWeek.toISOString()),
        supabase.from('bookings').select('id', { count: 'exact' }).gte('created_at', startOfDay.toISOString()),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'confirmed'),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'completed'),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'cancelled'),
      ]);

      // Customer Analytics
      const [
        totalCustomersRes,
        monthlyCustomersRes,
        returningCustomersRes
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).neq('role', 'admin'),
        supabase.from('users').select('id', { count: 'exact' }).neq('role', 'admin').gte('created_at', startOfMonth.toISOString()),
        supabase.from('bookings').select('user_id').not('user_id', 'is', null)
      ]);

      // Calculate returning customers (users with more than one booking)
      const userBookingCounts = (returningCustomersRes.data || []).reduce((acc, booking) => {
        acc[booking.user_id] = (acc[booking.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const returningCustomerCount = Object.values(userBookingCounts).filter(count => count > 1).length;

      // Performance Analytics
      const [
        popularTimeSlotsRes,
        topServicesRes,
        totalAvailableSlotsRes
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('time_slots!inner(slot_time)')
          .gte('created_at', startOfMonth.toISOString()),
        supabase
          .from('bookings')
          .select('vehicles!inner(size_category), total_price_pence')
          .gte('created_at', startOfMonth.toISOString()),
        supabase
          .from('time_slots')
          .select('id', { count: 'exact' })
          .eq('is_available', true)
          .gte('slot_date', startOfMonth.toISOString().split('T')[0])
      ]);

      // Process popular time slots
      const timeSlotCounts = (popularTimeSlotsRes.data || []).reduce((acc, booking) => {
        // Handle both single time_slot object and array format
        const timeSlots = Array.isArray(booking.time_slots) ? booking.time_slots[0] : booking.time_slots;
        const slot = timeSlots?.slot_time;
        if (slot) {
          acc[slot] = (acc[slot] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const popularTimeSlots = Object.entries(timeSlotCounts)
        .map(([slot_time, booking_count]) => ({ slot_time, booking_count }))
        .sort((a, b) => b.booking_count - a.booking_count)
        .slice(0, 5);

      // Process top services
      const serviceCounts = (topServicesRes.data || []).reduce((acc, booking) => {
        // Handle both single vehicle object and array format
        const vehicles = Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles;
        const category = vehicles?.size_category || 'Unknown';
        if (!acc[category]) {
          acc[category] = { booking_count: 0, revenue: 0 };
        }
        acc[category].booking_count += 1;
        acc[category].revenue += booking.total_price_pence || 0;
        return acc;
      }, {} as Record<string, { booking_count: number; revenue: number }>);

      const topServices = Object.entries(serviceCounts)
        .map(([size_category, data]) => ({ size_category, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      // Monthly data for charts
      const monthlyData = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const [monthRevenueRes, monthBookingsRes, monthCustomersRes] = await Promise.all([
          supabase.from('bookings')
            .select('total_price_pence')
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDate.toISOString()),
          supabase.from('bookings')
            .select('id', { count: 'exact' })
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDate.toISOString()),
          supabase.from('users')
            .select('id', { count: 'exact' })
            .neq('role', 'admin')
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDate.toISOString())
        ]);

        const monthRevenue = (monthRevenueRes.data || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
        
        monthlyData.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: monthRevenue,
          bookings: monthBookingsRes.count || 0,
          customers: monthCustomersRes.count || 0,
        });
      }

      // Calculate trends and rates
      const monthlyTrend = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
      const averageBookingValue = totalBookingsRes.count ? totalRevenue / totalBookingsRes.count : 0;
      const utilizationRate = totalAvailableSlotsRes.count ? 
        ((totalBookingsRes.count || 0) / (totalAvailableSlotsRes.count || 1)) * 100 : 0;

      // Service Analytics
      const availableServices = getAvailableServices();
      const mainService = availableServices[0]; // Full Valet & Detail
      
      // Calculate revenue by vehicle size for the main service
      const revenueBySize = topServices.map(service => ({
        size: service.size_category,
        revenue: service.revenue,
        bookings: service.booking_count,
        avgPrice: service.booking_count > 0 ? service.revenue / service.booking_count : 0
      }));
      
      // Most popular service is essentially our single service across all sizes
      const totalServiceBookings = revenueBySize.reduce((sum, size) => sum + size.bookings, 0);
      const totalServiceRevenue = revenueBySize.reduce((sum, size) => sum + size.revenue, 0);
      
      const serviceAnalytics = {
        totalOffered: availableServices.length,
        mostPopular: {
          name: mainService?.name || 'Full Valet & Detail',
          bookings: totalServiceBookings,
          revenue: totalServiceRevenue
        },
        revenueBySize,
        conversionRate: totalAvailableSlotsRes.count ? 
          (totalServiceBookings / (totalAvailableSlotsRes.count || 1)) * 100 : 0
      };

      setAnalytics({
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          weekly: weeklyRevenue,
          daily: dailyRevenue,
          monthlyTrend,
          weeklyTrend: 0, // Could calculate if needed
        },
        bookings: {
          total: totalBookingsRes.count || 0,
          monthly: monthlyBookingsRes.count || 0,
          weekly: weeklyBookingsRes.count || 0,
          daily: dailyBookingsRes.count || 0,
          pending: pendingBookingsRes.count || 0,
          confirmed: confirmedBookingsRes.count || 0,
          completed: completedBookingsRes.count || 0,
          cancelled: cancelledBookingsRes.count || 0,
        },
        customers: {
          total: totalCustomersRes.count || 0,
          new_monthly: monthlyCustomersRes.count || 0,
          returning: returningCustomerCount,
          active: Object.keys(userBookingCounts).length,
        },
        performance: {
          averageBookingValue,
          utilizationRate,
          customerRetentionRate: totalCustomersRes.count ? (returningCustomerCount / (totalCustomersRes.count || 1)) * 100 : 0,
          popularTimeSlots,
          topServices,
        },
        services: serviceAnalytics,
        monthlyData,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportData = () => {
    if (!analytics) return;
    
    const csvData = analytics.monthlyData.map(row => 
      `${row.month},${row.revenue / 100},${row.bookings},${row.customers}`
    ).join('\n');
    
    const csv = `Month,Revenue (£),Bookings,New Customers\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState>Loading analytics...</LoadingState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive business performance metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="12months">Last 12 Months</option>
          </Select>
          <Button 
            variant="outline" 
            onClick={fetchAnalytics}
            disabled={refreshing}
          >
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={exportData}
            disabled={!analytics}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.revenue.total / 100)}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className={`text-xs ${
                      analytics.revenue.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.revenue.monthlyTrend >= 0 ? '+' : ''}{analytics.revenue.monthlyTrend.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.bookings.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.bookings.monthly} this month
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.customers.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.customers.new_monthly} new this month
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Booking Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.performance.averageBookingValue / 100)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.performance.utilizationRate.toFixed(1)}% utilization
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Target className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Status Breakdown */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ 
                          width: `${analytics.bookings.total ? (analytics.bookings.pending / analytics.bookings.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{analytics.bookings.pending}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Confirmed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${analytics.bookings.total ? (analytics.bookings.confirmed / analytics.bookings.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{analytics.bookings.confirmed}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: `${analytics.bookings.total ? (analytics.bookings.completed / analytics.bookings.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{analytics.bookings.completed}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cancelled</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ 
                          width: `${analytics.bookings.total ? (analytics.bookings.cancelled / analytics.bookings.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{analytics.bookings.cancelled}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer Retention Rate</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.performance.customerRetentionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Slot Utilization Rate</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.performance.utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Returning Customers</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.customers.returning}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Customers</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.customers.active}
                  </span>
                </div>
              </div>
            </Card>

            {/* Popular Time Slots */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Time Slots</h2>
              <div className="space-y-3">
                {analytics.performance.popularTimeSlots.map((slot, index) => (
                  <div key={slot.slot_time} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{slot.slot_time}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {slot.booking_count} bookings
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Services */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h2>
              <div className="space-y-3">
                {analytics.performance.topServices.slice(0, 5).map((service, index) => (
                  <div key={service.size_category} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                      <Car className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{service.size_category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(service.revenue / 100)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {service.booking_count} bookings
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Service Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Service Overview */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#9146FF]/10 rounded-full">
                  <Wrench className="h-5 w-5 text-[#9146FF]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Service Overview</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Services Offered</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.services.totalOffered}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.services.conversionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Most Popular Service</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="font-medium text-gray-900">{analytics.services.mostPopular.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {analytics.services.mostPopular.bookings} bookings • {formatCurrency(analytics.services.mostPopular.revenue / 100)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Revenue by Vehicle Size */}
            <Card className="p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Vehicle Size</h2>
              <div className="space-y-4">
                {analytics.services.revenueBySize.map((sizeData) => (
                  <div key={sizeData.size} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#9146FF]/10 rounded-full flex items-center justify-center">
                        <Car className="h-4 w-4 text-[#9146FF]" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 capitalize">{sizeData.size} Vehicles</div>
                        <div className="text-sm text-gray-600">{sizeData.bookings} bookings</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(sizeData.revenue / 100)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Avg: {formatCurrency(sizeData.avgPrice / 100)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Monthly Trends */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Month</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Revenue</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Bookings</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">New Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.monthlyData.map((month) => (
                    <tr key={month.month} className="border-b border-gray-100">
                      <td className="py-2 px-4 text-sm text-gray-900">{month.month}</td>
                      <td className="py-2 px-4 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(month.revenue / 100)}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">{month.bookings}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">{month.customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}