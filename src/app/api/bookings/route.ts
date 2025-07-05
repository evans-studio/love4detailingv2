import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unifiedBookingSchema } from '@/lib/validation/booking';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request data
    const validationResult = unifiedBookingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { vehicle, personalDetails, dateTime, vehicleSizeId, totalPrice } = validationResult.data;
    
    // Use database transaction to ensure atomicity and bypass trigger issues
    const { data: result, error: transactionError } = await supabase.rpc('create_booking_transaction', {
      p_vehicle_registration: vehicle.registration.toUpperCase(),
      p_vehicle_make: vehicle.make,
      p_vehicle_model: vehicle.model,
      p_vehicle_year: vehicle.year || '',
      p_vehicle_color: vehicle.color || '',
      p_vehicle_size_id: vehicle.sizeId,
      p_time_slot_id: dateTime.timeSlotId,
      p_email: personalDetails.email,
      p_first_name: personalDetails.firstName,
      p_last_name: personalDetails.lastName,
      p_phone: personalDetails.phone,
      p_total_price_pence: totalPrice || 0
    });

    if (transactionError) {
      console.error('Booking transaction error:', transactionError);
      return NextResponse.json(
        { 
          error: 'Failed to create booking',
          details: transactionError.message,
          code: transactionError.code
        },
        { status: 500 }
      );
    }

    if (result) {
      return NextResponse.json({
        success: true,
        booking: {
          id: result.booking_id,
          booking_reference: result.booking_reference,
          status: 'pending',
          payment_status: 'pending',
          total_price_pence: totalPrice || 0,
          vehicle: {
            registration: vehicle.registration.toUpperCase(),
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year || '',
            color: vehicle.color || '',
          },
          time_slot: {
            id: dateTime.timeSlotId,
            date: dateTime.date,
            time: dateTime.time,
          },
          user_id: result.user_id,
          is_new_user: result.is_new_user,
        }
      });
    }

    // If we get here, the function didn't return a result
    return NextResponse.json(
      { error: 'Booking creation failed - no result returned' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
