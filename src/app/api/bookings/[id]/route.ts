import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch booking' },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['confirmed', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // First, verify the booking belongs to the authenticated user
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('user_id, time_slot_id, status')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch booking' },
        { status: 500 }
      );
    }

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (existingBooking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - This booking does not belong to you' },
        { status: 403 }
      );
    }

    // Check if booking can be cancelled (not already completed or cancelled)
    if (status === 'cancelled' && ['completed', 'cancelled'].includes(existingBooking.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel this booking - it is already completed or cancelled' },
        { status: 400 }
      );
    }

    // Update the booking status using service role for reliable updates
    const { data: updatedBooking, error: updateError } = await supabaseServiceRole
      .from('bookings')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Booking update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking', details: updateError.message },
        { status: 500 }
      );
    }

    // If cancelling, make the time slot available again
    if (status === 'cancelled' && existingBooking.time_slot_id) {
      const { error: slotError } = await supabaseServiceRole
        .from('time_slots')
        .update({ is_available: true })
        .eq('id', existingBooking.time_slot_id);

      if (slotError) {
        console.error('Time slot update error:', slotError);
        // Don't fail the entire operation for slot update issues
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: `Booking ${status === 'cancelled' ? 'cancelled' : 'updated'} successfully`
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 