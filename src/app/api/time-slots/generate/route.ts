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
      { start: '10:00:00', end: '11:00:00' },
      { start: '11:30:00', end: '12:30:00' },
      { start: '13:00:00', end: '14:00:00' },
      { start: '14:30:00', end: '15:30:00' },
      { start: '16:00:00', end: '17:00:00' },
    ];

    const slots = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      // Skip Sundays
      if (currentDate.getDay() !== 0) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        for (const timeSlot of timeSlots) {
          slots.push({
            slot_date: dateStr,
            start_time: timeSlot.start,
            end_time: timeSlot.end,
            is_blocked: false
          });
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    console.log(`Attempting to generate ${slots.length} time slots from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // Check which slots already exist to avoid unnecessary operations
    const { data: existingSlots } = await supabaseAdmin
      .from('available_slots')
      .select('slot_date, start_time')
      .gte('slot_date', format(startDate, 'yyyy-MM-dd'))
      .lte('slot_date', format(endDate, 'yyyy-MM-dd'));

    // Filter out slots that already exist
    const newSlots = slots.filter(slot => {
      return !existingSlots?.some(existing => 
        existing.slot_date === slot.slot_date && 
        existing.start_time === slot.start_time
      );
    });

    console.log(`${newSlots.length} new slots to insert (${slots.length - newSlots.length} already exist)`);

    let data = null;
    let error = null;

    if (newSlots.length > 0) {
      // Use upsert with the admin client to handle conflicts
      const result = await supabaseAdmin
        .from('available_slots')
        .upsert(newSlots, { 
          onConflict: 'slot_date,start_time',
          ignoreDuplicates: true 
        })
        .select('id');
      
      data = result.data;
      error = result.error;
    }

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
      .from('available_slots')
      .select('*')
      .eq('slot_date', format(requestedDate, 'yyyy-MM-dd'))
      .eq('is_blocked', false)
      .order('start_time');

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

    console.log(`Successfully generated ${data?.length || 0} new time slots`);
    return NextResponse.json({ 
      success: true,
      slotsGenerated: data?.length || 0,
      existingSlots: slots.length - newSlots.length,
      totalSlotsRequested: slots.length,
      dateRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      },
      availableSlots: (availableSlots || []).slice(0, 5) // Limit to 5 slots per day
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