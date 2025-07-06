import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { checkServerAdminAccess } from '@/lib/auth/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Authentication and authorization
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await checkServerAdminAccess(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Calculate date range
    let fromDate: string;
    let toDate: string;

    if (startDate && endDate) {
      fromDate = startDate;
      toDate = endDate;
    } else {
      const now = new Date();
      const periodDays = parseInt(period);
      const from = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      fromDate = from.toISOString().split('T')[0];
      toDate = now.toISOString().split('T')[0];
    }

    // Fetch analytics data in parallel
    const [
      revenueResult,
      bookingsResult,
      customersResult,
      vehiclesResult,
      rewardsResult,
      topVehicleSizesResult,
      dailyBookingsResult,
      conversionResult
    ] = await Promise.all([
      // Total revenue
      supabaseServiceRole
        .from('bookings')
        .select('total_price_pence')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59')
        .in('status', ['confirmed', 'completed']),

      // Booking stats
      supabaseServiceRole
        .from('bookings')
        .select('status, created_at')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59'),

      // Customer stats  
      supabaseServiceRole
        .from('users')
        .select('id, created_at, role')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59'),

      // Vehicle registrations
      supabaseServiceRole
        .from('vehicles')
        .select('id, created_at, size_id, vehicle_sizes(label)')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59'),

      // Rewards activity
      supabaseServiceRole
        .from('reward_transactions')
        .select('points, transaction_type, created_at')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59'),

      // Top vehicle sizes by bookings
      supabaseServiceRole
        .from('bookings')
        .select(`
          vehicles!inner(size_id, vehicle_sizes!inner(label, price_pence)),
          total_price_pence
        `)
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59')
        .in('status', ['confirmed', 'completed']),

      // Daily booking trend
      supabaseServiceRole
        .rpc('get_daily_booking_stats', {
          start_date: fromDate,
          end_date: toDate
        }),

      // Conversion funnel (if we track booking steps)
      supabaseServiceRole
        .from('bookings')
        .select('status, created_at')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59')
    ]);

    // Process revenue data
    const totalRevenue = revenueResult.data?.reduce((sum, booking) => 
      sum + (booking.total_price_pence || 0), 0) || 0;

    // Process booking data
    const bookingsByStatus = bookingsResult.data?.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const totalBookings = bookingsResult.data?.length || 0;
    const completedBookings = bookingsByStatus.completed || 0;
    const confirmedBookings = bookingsByStatus.confirmed || 0;
    const pendingBookings = bookingsByStatus.pending || 0;
    const cancelledBookings = bookingsByStatus.cancelled || 0;

    // Process customer data
    const newCustomers = customersResult.data?.filter(u => u.role === 'customer').length || 0;
    const totalCustomers = customersResult.data?.length || 0;

    // Process vehicle data
    const newVehicles = vehiclesResult.data?.length || 0;
    
    // Vehicle size distribution
    const vehicleSizeStats = vehiclesResult.data?.reduce((acc, vehicle: any) => {
      const size = vehicle.vehicle_sizes?.label || 'Unknown';
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Process rewards data
    const totalPointsEarned = rewardsResult.data?.filter(t => t.transaction_type === 'earned')
      .reduce((sum, t) => sum + t.points, 0) || 0;
    const totalPointsRedeemed = rewardsResult.data?.filter(t => t.transaction_type === 'redeemed')
      .reduce((sum, t) => sum + t.points, 0) || 0;

    // Process top vehicle sizes by revenue
    const vehicleSizeRevenue = topVehicleSizesResult.data?.reduce((acc, booking: any) => {
      const size = booking.vehicles?.vehicle_sizes?.label || 'Unknown';
      acc[size] = (acc[size] || 0) + (booking.total_price_pence || 0);
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate averages
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    const analytics = {
      period: { from: fromDate, to: toDate, days: parseInt(period) },
      revenue: {
        total: totalRevenue,
        average_per_booking: averageBookingValue,
        currency: 'GBP'
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        confirmed: confirmedBookings,
        pending: pendingBookings,
        cancelled: cancelledBookings,
        conversion_rate: conversionRate,
        by_status: bookingsByStatus
      },
      customers: {
        total: totalCustomers,
        new: newCustomers
      },
      vehicles: {
        total: newVehicles,
        by_size: vehicleSizeStats
      },
      rewards: {
        points_earned: totalPointsEarned,
        points_redeemed: totalPointsRedeemed,
        net_points: totalPointsEarned - totalPointsRedeemed
      },
      top_vehicle_sizes: Object.entries(vehicleSizeRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([size, revenue]) => ({ size, revenue })),
      daily_trends: dailyBookingsResult.data || [],
      performance_metrics: {
        bookings_per_day: totalBookings / parseInt(period),
        revenue_per_day: totalRevenue / parseInt(period),
        customer_acquisition_rate: newCustomers / parseInt(period)
      }
    };

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}