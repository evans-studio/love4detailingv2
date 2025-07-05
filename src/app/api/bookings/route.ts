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
    
    // Extract photos from body if present (not in validated schema)
    const vehiclePhotos = body.vehicle?.photos || [];

    // Check if time slot is still available (use is_booked column)
    const { data: timeSlot, error: timeSlotError } = await supabase
      .from('time_slots')
      .select('is_booked')
      .eq('id', dateTime.timeSlotId)
      .single();

    if (timeSlotError) {
      console.error('Time slot query error:', timeSlotError);
      return NextResponse.json(
        { error: 'Failed to check time slot availability' },
        { status: 500 }
      );
    }

    if (!timeSlot || timeSlot.is_booked) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available' },
        { status: 400 }
      );
    }

    // Get vehicle size price to verify
    const { data: sizeData, error: sizeError } = await supabase
      .from('vehicle_sizes')
      .select('price_pence')
      .eq('id', vehicle.sizeId)
      .single();

    if (sizeError || !sizeData) {
      return NextResponse.json(
        { error: 'Invalid vehicle size' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let userId: string | null = null;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', personalDetails.email)
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user account
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: personalDetails.email,
        email_confirm: true,
        user_metadata: {
          first_name: personalDetails.firstName,
          last_name: personalDetails.lastName,
          phone: personalDetails.phone,
        }
      });

      if (authError) {
        console.error('Auth user creation error:', authError);
        return NextResponse.json(
          { 
            error: 'Failed to create user account',
            details: authError?.message || 'Unknown error',
            code: authError?.code || 'UNKNOWN'
          },
          { status: 500 }
        );
      }

      if (authUser.user) {
        userId = authUser.user.id;

        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: personalDetails.email,
            full_name: `${personalDetails.firstName} ${personalDetails.lastName}`,
            phone: personalDetails.phone,
          });

        if (profileError) {
          console.error('User profile creation error:', profileError);
          // Continue anyway - the auth user was created
        }

        // We'll send the setup email after booking creation
      }
    }

    // Create vehicle record
    const { data: vehicleRecord, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        registration: vehicle.registration.toUpperCase(),
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year || '',
        color: vehicle.color || '',
        size_id: vehicle.sizeId,
        user_id: userId,
      })
      .select()
      .single();

    if (vehicleError || !vehicleRecord) {
      console.error('Vehicle creation error:', vehicleError);
      return NextResponse.json(
        { 
          error: 'Failed to create vehicle record',
          details: vehicleError?.message || 'Unknown error',
          code: vehicleError?.code || 'UNKNOWN'
        },
        { status: 500 }
      );
    }

    // Generate booking reference manually
    const bookingRef = `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Create booking (simplified select to avoid join issues)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        vehicle_id: vehicleRecord.id,
        time_slot_id: dateTime.timeSlotId,
        vehicle_size_id: vehicle.sizeId,
        total_price_pence: sizeData.price_pence,
        email: personalDetails.email,
        full_name: `${personalDetails.firstName} ${personalDetails.lastName}`,
        phone: personalDetails.phone,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash',
        booking_reference: bookingRef,
      })
      .select('*')
      .single();

    if (bookingError || !booking) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { 
          error: 'Failed to create booking',
          details: bookingError?.message || 'Unknown error',
          code: bookingError?.code || 'UNKNOWN'
        },
        { status: 500 }
      );
    }

    // Mark time slot as booked
    const { error: updateSlotError } = await supabase
      .from('time_slots')
      .update({ 
        is_booked: true
      })
      .eq('id', dateTime.timeSlotId);

    if (updateSlotError) {
      console.error('Failed to update time slot:', updateSlotError);
      // Don't fail the booking, just log the error
    }

    // If photos were uploaded, link them to the vehicle
    if (vehiclePhotos && vehiclePhotos.length > 0) {
      // Here you would link the photos to the vehicle in the database
      // For now, we'll just log that photos were included
      console.log(`Booking ${booking.id} includes ${vehiclePhotos.length} photos`);
    }

    // Send password setup email for new users
    if (!existingUser) {
      try {
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          personalDetails.email,
          {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app'}/auth/setup-password?booking=${booking.id}`,
            data: {
              first_name: personalDetails.firstName,
              last_name: personalDetails.lastName,
              booking_id: booking.id,
            }
          }
        );

        if (inviteError) {
          console.error('Failed to send setup email:', inviteError);
          // Don't fail the booking for email issues
        } else {
          console.log('Password setup email sent to:', personalDetails.email);
        }
      } catch (emailError) {
        console.error('Error sending setup email:', emailError);
        // Don't fail the booking for email issues
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        booking_reference: booking.booking_reference,
        status: booking.status,
        payment_status: booking.payment_status,
        total_price_pence: booking.total_price_pence,
        vehicle: {
          registration: vehicleRecord.registration,
          make: vehicleRecord.make,
          model: vehicleRecord.model,
          year: vehicleRecord.year,
          color: vehicleRecord.color,
        },
        time_slot: {
          id: dateTime.timeSlotId,
          date: dateTime.date,
          time: dateTime.time,
        },
        user_id: userId,
        is_new_user: !existingUser,
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}