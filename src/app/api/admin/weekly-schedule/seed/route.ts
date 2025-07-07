import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configure route as dynamic for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default weekly schedule - 5 slots per day, Monday to Saturday
const DEFAULT_SCHEDULE = [
  // Sunday - Off
  {
    day_of_week: 0,
    working_day: false,
    max_slots: 0,
    slot_1_time: null,
    slot_2_time: null,
    slot_3_time: null,
    slot_4_time: null,
    slot_5_time: null,
  },
  // Monday
  {
    day_of_week: 1,
    working_day: true,
    max_slots: 5,
    slot_1_time: '10:00:00',
    slot_2_time: '11:30:00',
    slot_3_time: '13:00:00',
    slot_4_time: '14:30:00',
    slot_5_time: '16:00:00',
  },
  // Tuesday
  {
    day_of_week: 2,
    working_day: true,
    max_slots: 5,
    slot_1_time: '10:00:00',
    slot_2_time: '11:30:00',
    slot_3_time: '13:00:00',
    slot_4_time: '14:30:00',
    slot_5_time: '16:00:00',
  },
  // Wednesday
  {
    day_of_week: 3,
    working_day: true,
    max_slots: 5,
    slot_1_time: '10:00:00',
    slot_2_time: '11:30:00',
    slot_3_time: '13:00:00',
    slot_4_time: '14:30:00',
    slot_5_time: '16:00:00',
  },
  // Thursday
  {
    day_of_week: 4,
    working_day: true,
    max_slots: 5,
    slot_1_time: '10:00:00',
    slot_2_time: '11:30:00',
    slot_3_time: '13:00:00',
    slot_4_time: '14:30:00',
    slot_5_time: '16:00:00',
  },
  // Friday
  {
    day_of_week: 5,
    working_day: true,
    max_slots: 5,
    slot_1_time: '10:00:00',
    slot_2_time: '11:30:00',
    slot_3_time: '13:00:00',
    slot_4_time: '14:30:00',
    slot_5_time: '16:00:00',
  },
  // Saturday
  {
    day_of_week: 6,
    working_day: true,
    max_slots: 5,
    slot_1_time: '10:00:00',
    slot_2_time: '11:30:00',
    slot_3_time: '13:00:00',
    slot_4_time: '14:30:00',
    slot_5_time: '16:00:00',
  },
];

export async function POST() {
  try {
    // Check if weekly_schedule_template exists and has data
    const { data: existingData, error: checkError } = await supabaseServiceRole
      .from('weekly_schedule_template')
      .select('day_of_week')
      .limit(1);

    if (checkError) {
      console.error('Error checking schedule template:', checkError);
      return NextResponse.json(
        { error: 'Failed to check schedule template', details: checkError.message },
        { status: 500 }
      );
    }

    // If data already exists, don't seed
    if (existingData && existingData.length > 0) {
      return NextResponse.json({
        message: 'Schedule template already exists',
        count: existingData.length
      });
    }

    // Seed the default schedule
    const { data, error } = await supabaseServiceRole
      .from('weekly_schedule_template')
      .upsert(DEFAULT_SCHEDULE, { 
        onConflict: 'day_of_week',
        ignoreDuplicates: false 
      })
      .select('day_of_week, working_day, max_slots');

    if (error) {
      console.error('Error seeding schedule template:', error);
      return NextResponse.json(
        { error: 'Failed to seed schedule template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly schedule template seeded successfully',
      data: data
    });

  } catch (error) {
    console.error('Seed schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}