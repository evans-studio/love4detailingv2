import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api/supabase';
import { format, parseISO, startOfDay } from 'date-fns';
import { TimeSlotsService } from '@/lib/services/time-slots.service';

// Configure route as dynamic for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
      requestedDate = body.date ? parseISO(body.date) : startOfDay(new Date());
      if (isNaN(requestedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format', details: 'Please provide date in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Use the TimeSlotsService to generate slots with admin's configurable schedule
    await TimeSlotsService.generateTimeSlotsIfNeeded(body.date || format(startOfDay(new Date()), 'yyyy-MM-dd'));

    // Get available slots for the requested date
    const { data: availableSlots, error: availableSlotsError } = await supabaseAdmin
      .from('available_slots')
      .select('*')
      .eq('slot_date', format(requestedDate, 'yyyy-MM-dd'))
      .eq('is_blocked', false)
      .order('start_time');

    if (availableSlotsError) {
      console.error('Error fetching available slots:', availableSlotsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch available slots',
        details: availableSlotsError.message
      }, { status: 500 });
    }

    console.log(`Successfully generated time slots for ${format(requestedDate, 'yyyy-MM-dd')}`);
    return NextResponse.json({ 
      success: true,
      date: format(requestedDate, 'yyyy-MM-dd'),
      availableSlots: availableSlots || [],
      totalSlots: availableSlots?.length || 0
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