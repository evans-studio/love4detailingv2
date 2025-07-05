import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET /api/admin/schedule-template
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try to get weekly template, create default if table doesn't exist
    try {
      const template = await AvailabilityService.getWeeklyTemplate(supabase);
      return NextResponse.json({ data: template });
    } catch (dbError: any) {
      console.log('Template table error:', dbError);
      
      // If table doesn't exist or RLS error, return default template
      if (dbError.code === '42P01' || dbError.code === '42703' || dbError.message?.includes('permission denied')) {
        const defaultTemplate = [
          { day_of_week: 0, working_day: false, max_slots: 0 }, // Sunday
          { day_of_week: 1, working_day: true, max_slots: 5 },  // Monday
          { day_of_week: 2, working_day: true, max_slots: 5 },  // Tuesday
          { day_of_week: 3, working_day: true, max_slots: 5 },  // Wednesday
          { day_of_week: 4, working_day: true, max_slots: 5 },  // Thursday
          { day_of_week: 5, working_day: true, max_slots: 5 },  // Friday
          { day_of_week: 6, working_day: false, max_slots: 0 }  // Saturday
        ];
        return NextResponse.json({ data: defaultTemplate });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Get schedule template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PUT /api/admin/schedule-template
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { day_of_week, ...config } = await request.json();
    
    if (day_of_week === undefined) {
      return NextResponse.json(
        { error: 'day_of_week is required' }, 
        { status: 400 }
      );
    }

    const result = await AvailabilityService.updateWeeklyTemplate(day_of_week, config);
    
    return NextResponse.json({ 
      message: 'Schedule template updated successfully',
      data: result 
    });
  } catch (error) {
    console.error('Update schedule template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}