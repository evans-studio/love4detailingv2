import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO, addDays, startOfDay } from 'date-fns';

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

    // Validate and parse date
    let requestedDate: Date;
    try {
      requestedDate = parseISO(dateParam);
      if (isNaN(requestedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // First, generate time slots if needed
    await generateTimeSlotsIfNeeded(dateParam);

    // Fetch available time slots for the date
    const { data: timeSlots, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('slot_date', dateParam)
      .eq('is_booked', false)
      .order('slot_time');

    if (error) {
      console.error('Database error fetching time slots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch time slots' },
        { status: 500 }
      );
    }

    console.log(`Found ${timeSlots?.length || 0} available time slots for ${dateParam}`);

    // Format the response to match expected interface
    const formattedSlots = timeSlots?.map(slot => ({
      id: slot.id,
      slot_date: slot.slot_date,
      slot_time: slot.slot_time,
      is_available: !slot.is_booked, // Convert is_booked to is_available for frontend
    })) || [];

    return NextResponse.json(formattedSlots);

  } catch (error) {
    console.error('Time slots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateTimeSlotsIfNeeded(date: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/time-slots/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error generating time slots:', error);
    }
  } catch (err) {
    console.error('Failed to generate time slots:', err);
  }
}