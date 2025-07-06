import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Build query
    let query = supabase
      .from('users')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error: usersError } = await query;

    if (usersError) throw usersError;

    // Get aggregated stats for each customer
    const customersWithStats = await Promise.all((users || []).map(async (user) => {
      const [
        { count: bookingsCount },
        { count: vehiclesCount },
        { data: bookings },
        { data: rewardData }
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('vehicles').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('bookings')
          .select('total_price_pence, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('rewards')
          .select('points, tier')
          .eq('user_id', user.id)
          .single()
      ]);

      const totalSpent = (bookings || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
      const lastBooking = bookings && bookings.length > 0 ? bookings[0].created_at : null;

      return {
        ...user,
        bookings_count: bookingsCount || 0,
        vehicles_count: vehiclesCount || 0,
        total_spent_pence: totalSpent,
        last_booking_date: lastBooking,
        reward_points: rewardData?.points || 0,
        reward_tier: rewardData?.tier || 'Bronze',
      };
    }));

    // Get total count for pagination
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .neq('role', 'admin');

    if (search) {
      countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      customers: customersWithStats,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}