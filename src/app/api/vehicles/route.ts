import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { determineVehicleSize } from '@/lib/utils/vehicle-size';

export const dynamic = 'force-dynamic';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for vehicle creation/update
const vehicleSchema = z.object({
  registration: z.string().min(2, 'Registration is required').max(10, 'Registration too long'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().optional(),
  color: z.string().optional(),
  size_id: z.string().uuid().optional(),
  photos: z.array(z.string()).optional()
});

// Get user's vehicles
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: vehicles, error: vehiclesError } = await supabaseServiceRole
      .from('vehicles')
      .select(`
        *,
        vehicle_sizes (
          id,
          label,
          description,
          price_pence
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: vehiclesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicles: vehicles || []
    });

  } catch (error) {
    console.error('Vehicles fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create or register a new vehicle
export async function POST(request: NextRequest) {
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
    const validationResult = vehicleSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid vehicle data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { registration, make, model, year, color, size_id, photos } = validationResult.data;

    // Check if vehicle already exists for this user
    const { data: existingVehicle } = await supabaseServiceRole
      .from('vehicles')
      .select('id')
      .eq('user_id', user.id)
      .eq('registration', registration.toUpperCase())
      .single();

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle with this registration already exists for your account' },
        { status: 409 }
      );
    }

    // Auto-detect vehicle size if not provided
    let finalSizeId = size_id;
    let sizeDetectionResult = null;

    if (!size_id) {
      try {
        sizeDetectionResult = await determineVehicleSize(make, model, registration);
        finalSizeId = sizeDetectionResult.id || undefined;
      } catch (error) {
        console.error('Vehicle size detection failed:', error);
        // Continue without size - will be flagged for admin review
      }
    }

    // Create the vehicle record
    const { data: vehicle, error: vehicleError } = await supabaseServiceRole
      .from('vehicles')
      .insert({
        user_id: user.id,
        registration: registration.toUpperCase(),
        make,
        model,
        year: year || '',
        color: color || '',
        size_id: finalSizeId,
        photos: photos || []
      })
      .select(`
        *,
        vehicle_sizes (
          id,
          label,
          description,
          price_pence
        )
      `)
      .single();

    if (vehicleError) {
      return NextResponse.json(
        { error: 'Failed to create vehicle', details: vehicleError.message },
        { status: 500 }
      );
    }

    // If vehicle size couldn't be determined, log it for admin review
    if (!finalSizeId) {
      try {
        await supabaseServiceRole.rpc('log_unmatched_vehicle', {
          vehicle_id_param: vehicle.id,
          make_param: make,
          model_param: model,
          registration_param: registration.toUpperCase()
        });
      } catch (error) {
        console.error('Failed to log unmatched vehicle:', error);
      }
    }

    return NextResponse.json({
      success: true,
      vehicle,
      size_detection: sizeDetectionResult ? {
        auto_detected: !size_id,
        confidence: sizeDetectionResult.wasFound ? 'high' : 'low',
        requires_review: !finalSizeId
      } : null
    });

  } catch (error) {
    console.error('Vehicle creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update vehicle information
export async function PUT(request: NextRequest) {
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
    const { vehicle_id, ...updates } = body;

    if (!vehicle_id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Validate updates
    const validationResult = vehicleSchema.partial().safeParse(updates);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: vehicle, error: ownershipError } = await supabaseServiceRole
      .from('vehicles')
      .select('id')
      .eq('id', vehicle_id)
      .eq('user_id', user.id)
      .single();

    if (ownershipError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found or access denied' },
        { status: 404 }
      );
    }

    // Apply updates
    const updateData = { ...validationResult.data, updated_at: new Date().toISOString() };
    
    // If registration is being updated, normalize it
    if (updateData.registration) {
      updateData.registration = updateData.registration.toUpperCase();
    }

    const { data: updatedVehicle, error: updateError } = await supabaseServiceRole
      .from('vehicles')
      .update(updateData)
      .eq('id', vehicle_id)
      .select(`
        *,
        vehicle_sizes (
          id,
          label,
          description,
          price_pence
        )
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update vehicle', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle
    });

  } catch (error) {
    console.error('Vehicle update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete vehicle
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Check if vehicle has any bookings
    const { data: bookings, error: bookingsError } = await supabaseServiceRole
      .from('bookings')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .limit(1);

    if (bookingsError) {
      return NextResponse.json(
        { error: 'Failed to check vehicle bookings' },
        { status: 500 }
      );
    }

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with existing bookings' },
        { status: 409 }
      );
    }

    // Verify ownership and delete
    const { error: deleteError } = await supabaseServiceRole
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete vehicle', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    console.error('Vehicle deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}