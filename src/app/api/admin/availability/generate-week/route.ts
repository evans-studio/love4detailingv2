import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Configure route as dynamic for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/admin/availability/generate-week
export async function POST(request: Request) {
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

    const { start_date } = await request.json();
    
    if (!start_date) {
      return NextResponse.json(
        { error: 'start_date is required' }, 
        { status: 400 }
      );
    }

    const result = await AvailabilityService.generateWeekSlots(start_date);
    
    return NextResponse.json({ 
      message: 'Week slots generated successfully',
      data: result 
    });
  } catch (error) {
    console.error('Generate week slots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}