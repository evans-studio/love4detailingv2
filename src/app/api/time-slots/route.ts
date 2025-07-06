import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { TimeSlotsService } from '@/lib/services/time-slots.service';

// Configure route as dynamic
export const dynamic = 'force-dynamic';

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
    await TimeSlotsService.generateTimeSlotsIfNeeded(dateParam);

    // Fetch available time slots for the date (limit to 5 per day to prevent duplicates)
    const { data: timeSlots, error } = await supabase
      .from('available_slots')
      .select('*')
      .eq('slot_date', dateParam)
      .eq('is_blocked', false)
      .order('start_time')
      .limit(5);

    if (error) {
      console.error('Database error fetching time slots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch time slots' },
        { status: 500 }
      );
    }

    console.log(`Found ${timeSlots?.length || 0} available time slots for ${dateParam}`);

    // Remove duplicates by start_time (in case of database inconsistencies)
    const uniqueSlots = timeSlots?.reduce((acc, slot) => {
      const existingSlot = acc.find((s: any) => s.start_time === slot.start_time);
      if (!existingSlot) {
        acc.push(slot);
      }
      return acc;
    }, [] as typeof timeSlots) || [];

    // Ensure we never return more than 5 slots
    const limitedSlots = uniqueSlots.slice(0, 5);

    console.log(`Returning ${limitedSlots.length} unique time slots for ${dateParam}`);

    // Format the response to match expected interface
    const formattedSlots = limitedSlots.map((slot: any) => ({
      id: slot.id,
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_blocked: slot.is_blocked,
    }));

    return NextResponse.json(formattedSlots);

  } catch (error) {
    console.error('Time slots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Removed: Internal API call replaced with direct service call