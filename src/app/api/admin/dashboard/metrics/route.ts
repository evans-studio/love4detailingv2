import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch comprehensive stats
    const [
      totalBookingsRes,
      monthlyBookingsRes,
      prevMonthBookingsRes,
      usersRes,
      revenueRes,
      monthlyRevenueRes,
      prevMonthRevenueRes
    ] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact' }),
      supabase.from('bookings')
        .select('id', { count: 'exact' })
        .gte('created_at', startOfMonth.toISOString()),
      supabase.from('bookings')
        .select('id', { count: 'exact' })
        .gte('created_at', startOfPrevMonth.toISOString())
        .lt('created_at', endOfPrevMonth.toISOString()),
      supabase.from('users').select('id', { count: 'exact' }).neq('role', 'admin'),
      supabase.from('bookings').select('total_price_pence'),
      supabase.from('bookings')
        .select('total_price_pence')
        .gte('created_at', startOfMonth.toISOString()),
      supabase.from('bookings')
        .select('total_price_pence')
        .gte('created_at', startOfPrevMonth.toISOString())
        .lt('created_at', endOfPrevMonth.toISOString()),
    ]);

    // Calculate revenue
    const totalRevenue = (revenueRes.data || []).reduce((sum, booking) => sum + (booking.total_price_pence || 0), 0);
    const monthlyRevenue = (monthlyRevenueRes.data || []).reduce((sum, booking) => sum + (booking.total_price_pence || 0), 0);
    const prevMonthRevenue = (prevMonthRevenueRes.data || []).reduce((sum, booking) => sum + (booking.total_price_pence || 0), 0);

    // Calculate trends
    const bookingTrend = prevMonthBookingsRes.count && prevMonthBookingsRes.count > 0
      ? ((monthlyBookingsRes.count || 0) - prevMonthBookingsRes.count) / prevMonthBookingsRes.count * 100
      : 0;

    const revenueTrend = prevMonthRevenue > 0
      ? (monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100
      : 0;

    const metrics = {
      totalBookings: totalBookingsRes.count || 0,
      monthlyBookings: monthlyBookingsRes.count || 0,
      bookingTrend,
      activeCustomers: usersRes.count || 0,
      totalRevenue,
      monthlyRevenue,
      revenueTrend,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}