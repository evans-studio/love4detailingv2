import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/admin/schedule-template
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await AvailabilityService.getWeeklyTemplate();
    return NextResponse.json({ data: template });
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