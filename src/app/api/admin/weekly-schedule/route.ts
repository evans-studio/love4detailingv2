import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schema for weekly schedule updates
const WeeklyScheduleUpdateSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  working_day: z.boolean(),
  max_slots: z.number().int().min(0).max(5),
  slot_1_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  slot_2_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  slot_3_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  slot_4_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  slot_5_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

// Time validation helper
function validateTimeInRange(time: string): boolean {
  if (!time) return true; // Optional fields can be empty
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= 480 && totalMinutes <= 1200; // 8AM-8PM
}

function validateTimeIn15MinIncrements(time: string): boolean {
  if (!time) return true; // Optional fields can be empty
  const [, minutes] = time.split(':').map(Number);
  return minutes % 15 === 0; // Must be 0, 15, 30, or 45 minutes
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get weekly schedule template with custom time columns
    const { data, error } = await supabase
      .from('weekly_schedule_template')
      .select(`
        id,
        day_of_week,
        working_day,
        max_slots,
        slot_1_time,
        slot_2_time,
        slot_3_time,
        slot_4_time,
        slot_5_time,
        start_time,
        end_time,
        created_at,
        updated_at
      `)
      .order('day_of_week');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch weekly schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Weekly schedule GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = WeeklyScheduleUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const scheduleData = validationResult.data;

    // Additional business logic validation
    const timeFields = ['slot_1_time', 'slot_2_time', 'slot_3_time', 'slot_4_time', 'slot_5_time'];
    const errors: string[] = [];

    for (const field of timeFields) {
      const time = scheduleData[field as keyof typeof scheduleData] as string;
      
      if (time) {
        if (!validateTimeInRange(time)) {
          errors.push(`${field}: Time must be between 8:00 AM and 8:00 PM`);
        }
        
        if (!validateTimeIn15MinIncrements(time)) {
          errors.push(`${field}: Time must be in 15-minute increments (8:00, 8:15, 8:30, 8:45, etc.)`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Time validation failed',
          details: errors
        },
        { status: 400 }
      );
    }

    // Prepare data for database
    const updateData = {
      day_of_week: scheduleData.day_of_week,
      working_day: scheduleData.working_day,
      max_slots: scheduleData.working_day ? scheduleData.max_slots : 0,
      slot_1_time: scheduleData.slot_1_time || '10:00',
      slot_2_time: scheduleData.slot_2_time || '12:00', 
      slot_3_time: scheduleData.slot_3_time || '14:00',
      slot_4_time: scheduleData.slot_4_time || '16:00',
      slot_5_time: scheduleData.slot_5_time || '18:00',
      updated_at: new Date().toISOString()
    };

    // Upsert the weekly schedule template using day_of_week as unique key
    const { data, error } = await supabase
      .from('weekly_schedule_template')
      .upsert(updateData, { 
        onConflict: 'day_of_week',
        ignoreDuplicates: false 
      })
      .select(`
        id,
        day_of_week,
        working_day,
        max_slots,
        slot_1_time,
        slot_2_time,
        slot_3_time,
        slot_4_time,
        slot_5_time,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update weekly schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Weekly schedule POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}