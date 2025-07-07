import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
// Vehicle size determination removed - now handled by service pricing system

export const dynamic = 'force-dynamic';

// Helper function to get pricing for vehicle sizes
function getVehicleSizePrice(sizeId: string): number {
  const prices = {
    small: 3500,
    medium: 4500, 
    large: 5500,
    extra_large: 6500
  };
  return prices[sizeId as keyof typeof prices] || 4500;
}

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for vehicle creation/update
const vehicleSchema = z.object({
  registration: z.string().min(2, 'Registration is required').max(10, 'Registration too long'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().optional(),
  color: z.string().optional(),
  size: z.enum(['small', 'medium', 'large', 'extra_large']).optional(),
  vehicle_type: z.string().optional(),
  special_requirements: z.string().optional(),
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
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: vehiclesError.message },
        { status: 500 }
      );
    }

    // Add vehicle size information dynamically
    const vehiclesWithSizes = (vehicles || []).map(vehicle => ({
      ...vehicle,
      size_info: vehicle.size ? {
        id: vehicle.size,
        label: vehicle.size.charAt(0).toUpperCase() + vehicle.size.slice(1),
        description: `${vehicle.size} sized vehicle`,
        price_pence: getVehicleSizePrice(vehicle.size)
      } : null
    }));

    return NextResponse.json({
      success: true,
      vehicles: vehiclesWithSizes
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

    const { registration, make, model, year, color, size, vehicle_type, special_requirements, photos } = validationResult.data;

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

    // Use provided size or default to medium
    let finalSize = size || 'medium';

    // Create the vehicle record
    const { data: vehicle, error: vehicleError } = await supabaseServiceRole
      .from('vehicles')
      .insert({
        user_id: user.id,
        registration: registration.toUpperCase(),
        make,
        model,
        year: year || null,
        color: color || null,
        size: finalSize,
        vehicle_type: vehicle_type || null,
        special_requirements: special_requirements || null
      })
      .select('*')
      .single();

    if (vehicleError) {
      return NextResponse.json(
        { error: 'Failed to create vehicle', details: vehicleError.message },
        { status: 500 }
      );
    }

    // Log vehicle for admin review if size wasn't provided
    if (!size) {
      try {
        await supabaseServiceRole
          .from('vehicle_model_registry')
          .upsert({
            make,
            model,
            default_size: finalSize,
            verified: false
          }, {
            onConflict: 'make,model',
            ignoreDuplicates: true
          });
      } catch (error) {
        console.error('Failed to log vehicle for review:', error);
      }
    }

    // Ensure finalSize is not undefined (fallback to medium)
    const safeSize = finalSize || 'medium';

    return NextResponse.json({
      success: true,
      vehicle: {
        ...vehicle,
        size_info: {
          id: safeSize,
          label: safeSize.charAt(0).toUpperCase() + safeSize.slice(1),
          description: `${safeSize} sized vehicle`,
          price_pence: getVehicleSizePrice(safeSize)
        }
      },
      size_detection: {
        auto_detected: !size,
        confidence: size ? 'high' : 'low',
        requires_review: !size
      }
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
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update vehicle', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        ...updatedVehicle,
        size_info: updatedVehicle.size ? {
          id: updatedVehicle.size,
          label: updatedVehicle.size.charAt(0).toUpperCase() + updatedVehicle.size.slice(1),
          description: `${updatedVehicle.size} sized vehicle`,
          price_pence: getVehicleSizePrice(updatedVehicle.size)
        } : null
      }
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