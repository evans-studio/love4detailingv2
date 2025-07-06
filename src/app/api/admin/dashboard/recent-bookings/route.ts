import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

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

    // Fetch upcoming bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        full_name,
        email,
        total_price_pence,
        status,
        vehicles!inner (
          make,
          model,
          registration
        ),
        time_slots!inner (
          slot_date,
          slot_time
        )
      `)
      .in('status', ['pending', 'confirmed'])
      .gte('time_slots.slot_date', now.toISOString().split('T')[0])
      .order('time_slots.slot_date', { ascending: true })
      .order('time_slots.slot_time', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Transform the data to handle potential arrays
    const transformedBookings = (bookings || []).map(booking => ({
      ...booking,
      vehicles: Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles,
      time_slots: Array.isArray(booking.time_slots) ? booking.time_slots[0] : booking.time_slots,
    }));

    return NextResponse.json(transformedBookings);
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent bookings' },
      { status: 500 }
    );
  }
}