import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api/supabase';
import { addDays, startOfDay, isBefore, format, parseISO } from 'date-fns';

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      console.error('Admin client not initialized - missing service role key');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Admin client not initialized' },
        { status: 500 }
      );
    }

    // Get the requested date from the body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Failed to parse JSON body' },
        { status: 400 }
      );
    }

    let requestedDate;
    try {
      requestedDate = body.date ? parseISO(body.date) : addDays(startOfDay(new Date()), 1);
      if (isNaN(requestedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format', details: 'Please provide date in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Generate slots for 14 days from the requested date
    const startDate = startOfDay(requestedDate);
    const endDate = addDays(startDate, 14);

    // Validate that we're not trying to generate slots in the past
    if (isBefore(endDate, startOfDay(new Date()))) {
      return NextResponse.json(
        { error: 'Invalid date range', details: 'Cannot generate time slots for past dates' },
        { status: 400 }
      );
    }

    const timeSlots = [
      '10:00:00',
      '11:30:00',
      '13:00:00',
      '14:30:00',
      '16:00:00',
    ];

    const slots = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      // Skip Sundays
      if (currentDate.getDay() !== 0) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        for (const time of timeSlots) {
          slots.push({
            slot_date: dateStr,
            slot_time: time,
            is_booked: false
          });
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    console.log(`Attempting to generate ${slots.length} time slots from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // Use upsert with the admin client to handle conflicts
    const { data, error } = await supabaseAdmin
      .from('time_slots')
      .upsert(slots, { 
        onConflict: 'slot_date,slot_time',
        ignoreDuplicates: true 
      })
      .select('id');

    if (error) {
      console.error('Supabase error generating time slots:', error);
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }

    // Get available slots for the requested date
    const { data: availableSlots, error: availableSlotsError } = await supabaseAdmin
      .from('time_slots')
      .select('*')
      .eq('slot_date', format(requestedDate, 'yyyy-MM-dd'))
      .eq('is_booked', false)
      .order('slot_time');

    if (availableSlotsError) {
      console.error('Error fetching available slots:', availableSlotsError);
      return NextResponse.json({
        success: true,
        slotsGenerated: data?.length || 0,
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        },
        availableSlots: [],
        warning: 'Failed to fetch available slots'
      });
    }

    console.log(`Successfully generated ${data?.length} time slots`);
    return NextResponse.json({ 
      success: true,
      slotsGenerated: data?.length || 0,
      dateRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      },
      availableSlots: availableSlots || []
    });
  } catch (error) {
    console.error('Unexpected error generating time slots:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Failed to generate time slots',
        type: error instanceof Error ? error.name : 'UnknownError'
      },
      { status: 500 }
    );
  }
} 