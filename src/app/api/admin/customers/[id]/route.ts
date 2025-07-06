import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const customerId = params.id;

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

    // Get customer basic info
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', customerId)
      .neq('role', 'admin')
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get customer stats
    const [
      { count: bookingsCount },
      { count: vehiclesCount },
      { data: bookings },
      { data: rewardData }
    ] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact' }).eq('user_id', customerId),
      supabase.from('vehicles').select('*', { count: 'exact' }).eq('user_id', customerId),
      supabase.from('bookings')
        .select('total_price_pence, created_at')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false }),
      supabase.from('rewards')
        .select('points, tier')
        .eq('user_id', customerId)
        .single()
    ]);

    const totalSpent = (bookings || []).reduce((sum, b) => sum + (b.total_price_pence || 0), 0);
    const lastBooking = bookings && bookings.length > 0 ? bookings[0].created_at : null;

    // Fetch recent bookings with details
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        total_price_pence,
        status,
        created_at,
        time_slots!inner (
          slot_date,
          slot_time
        ),
        vehicles!inner (
          make,
          model,
          registration
        )
      `)
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch customer vehicles
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    // Transform bookings data
    const transformedBookings = (recentBookings || []).map(booking => ({
      ...booking,
      time_slots: Array.isArray(booking.time_slots) ? booking.time_slots[0] : booking.time_slots,
      vehicles: Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles,
    }));

    const customerDetail = {
      ...customer,
      bookings_count: bookingsCount || 0,
      vehicles_count: vehiclesCount || 0,
      total_spent_pence: totalSpent,
      last_booking_date: lastBooking,
      reward_points: rewardData?.points || 0,
      reward_tier: rewardData?.tier || 'Bronze',
      recent_bookings: transformedBookings,
      vehicles: vehicles || [],
    };

    return NextResponse.json(customerDetail);
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const customerId = params.id;
    const updates = await request.json();

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

    // Update customer
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        // Don't allow email updates through this endpoint for security
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}