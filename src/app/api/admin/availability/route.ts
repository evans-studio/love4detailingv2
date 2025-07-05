import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET /api/admin/availability
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' }, 
        { status: 400 }
      );
    }

    // Create service role client for admin operations
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
      const calendarData = await AvailabilityService.getCalendarData(startDate, endDate, serviceClient);
      return NextResponse.json({ data: calendarData });
    } catch (dbError: any) {
      console.log('Calendar data error:', dbError);
      
      // If admin tables don't exist, return basic calendar structure
      if (dbError.code === '42P01' || dbError.code === '42703' || dbError.message?.includes('permission denied')) {
        // Generate basic calendar structure
        const calendarDays = [];
        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayOfWeek = currentDate.getDay();
          const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
          
          calendarDays.push({
            date: dateStr,
            dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNumber: currentDate.getDate(),
            isWorkingDay,
            maxSlots: isWorkingDay ? 5 : 0,
            availableSlots: isWorkingDay ? 5 : 0,
            slots: Array.from({ length: 5 }, (_, i) => ({
              slot_number: i + 1,
              time: ['10:00', '12:00', '14:00', '16:00', '18:00'][i],
              status: isWorkingDay ? 'available' : 'unavailable',
              booking: undefined
            }))
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return NextResponse.json({ data: calendarDays });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}