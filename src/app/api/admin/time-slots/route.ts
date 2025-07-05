import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Fetch all time slots for the date (including booked ones for admin view)
    const { data: timeSlots, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('slot_date', dateParam)
      .order('slot_time');

    if (error) {
      console.error('Database error fetching admin time slots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch time slots' },
        { status: 500 }
      );
    }

    return NextResponse.json(timeSlots || []);

  } catch (error) {
    console.error('Admin time slots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}