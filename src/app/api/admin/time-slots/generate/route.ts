import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addDays, startOfDay, format, parseISO } from 'date-fns';

// Configure route as dynamic for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WorkingHours {
  start: string; // e.g., "10:00"
  end: string;   // e.g., "18:00"
  slotsCount: number;
  workingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, config } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Use provided config or default values
    const workingHours: WorkingHours = {
      start: config?.start || '10:00',
      end: config?.end || '18:00',
      slotsCount: config?.slotsCount || 5,
      workingDays: config?.workingDays || [1, 2, 3, 4, 5, 6] // Mon-Sat
    };

    // Parse and validate date
    let requestedDate: Date;
    try {
      requestedDate = parseISO(date);
      if (isNaN(requestedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Generate time slots based on working hours
    const timeSlots = generateTimeSlots(workingHours);
    
    // Generate slots for 14 days from the requested date
    const startDate = startOfDay(requestedDate);
    const endDate = addDays(startDate, 14);

    const slots = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      // Check if this day is a working day
      if (workingHours.workingDays.includes(currentDate.getDay())) {
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

    console.log(`Generating ${slots.length} time slots from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // Use upsert to handle conflicts
    const { data, error } = await supabase
      .from('available_slots')
      .upsert(slots, { 
        onConflict: 'slot_date,start_time',
        ignoreDuplicates: true 
      })
      .select('id');

    if (error) {
      console.error('Supabase error generating time slots:', error);
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      slotsGenerated: data?.length || 0,
      dateRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      },
      config: workingHours
    });

  } catch (error) {
    console.error('Admin generate time slots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateTimeSlots(config: WorkingHours): { start: string; end: string }[] {
  const { start, end, slotsCount } = config;
  
  // Parse start and end times
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  
  // Convert to minutes since midnight
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Calculate interval between slots (assuming 1 hour slots)
  const slotDuration = 60; // 1 hour slots
  const totalMinutes = endMinutes - startMinutes;
  const interval = Math.floor(totalMinutes / slotsCount);
  
  const slots = [];
  
  for (let i = 0; i < slotsCount; i++) {
    const slotStartMinutes = startMinutes + (i * interval);
    const slotEndMinutes = slotStartMinutes + slotDuration;
    
    const startHours = Math.floor(slotStartMinutes / 60);
    const startMins = slotStartMinutes % 60;
    const endHours = Math.floor(slotEndMinutes / 60);
    const endMins = slotEndMinutes % 60;
    
    // Format as HH:MM:SS
    const startTime = `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}:00`;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
    
    slots.push({ start: startTime, end: endTime });
  }
  
  return slots;
}