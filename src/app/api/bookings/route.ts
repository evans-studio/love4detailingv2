import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { unifiedBookingSchema } from '@/lib/validation/booking';
import { BookingService } from '@/lib/services/booking.service';
import { cookies } from 'next/headers';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get user bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let query = supabaseServiceRole
      .from('bookings')
      .select(`
        *,
        vehicles (
          registration,
          make,
          model,
          year,
          color
        ),
        available_slots (
          slot_date,
          start_time,
          end_time
        )
      `, { count: 'exact' })
      .eq('user_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: bookings, error: bookingsError, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookings: bookings || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new booking using the new BookingService
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Incoming booking data:', JSON.stringify(body, null, 2));
    
    // Validate the request data
    const validationResult = unifiedBookingSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid booking data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { vehicle, personalDetails, dateTime } = validationResult.data;
    
    // Create booking using the new BookingService
    const bookingService = new BookingService();
    
    // Check if user is authenticated
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare booking data
    const bookingData = {
      customerEmail: personalDetails.email,
      customerName: `${personalDetails.firstName} ${personalDetails.lastName}`,
      customerPhone: personalDetails.phone,
      slotId: dateTime.timeSlotId,
      vehicleId: undefined, // Will be handled by the booking service
      userId: user?.id,
    };

    // Create the booking using the database function
    const result = await bookingService.createBooking(bookingData);
    
    console.log('Booking created successfully:', result);

    return NextResponse.json({
      success: true,
      booking: result,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create booking', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}