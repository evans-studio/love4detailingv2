import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { checkServerAdminAccess } from '@/lib/auth/admin';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for updating vehicle size mapping
const updateVehicleSchema = z.object({
  vehicle_id: z.string().uuid(),
  size_id: z.string().uuid(),
  notes: z.string().optional()
});

// Get unmatched vehicles for admin review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'pending';

    // Authentication and authorization
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await checkServerAdminAccess(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get unmatched vehicles from the database
    // These are vehicles that couldn't be automatically matched to our size database
    let query = supabaseServiceRole
      .from('unmatched_vehicles')
      .select(`
        *,
        vehicles (
          id,
          registration,
          make,
          model,
          year,
          color,
          user_id,
          users (
            email,
            full_name,
            phone
          )
        )
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: unmatchedVehicles, error: vehiclesError, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      console.error('Unmatched vehicles fetch error:', vehiclesError);
      return NextResponse.json(
        { error: 'Failed to fetch unmatched vehicles', details: vehiclesError.message },
        { status: 500 }
      );
    }

    // Get available vehicle sizes for admin selection
    const { data: vehicleSizes, error: sizesError } = await supabaseServiceRole
      .from('vehicle_sizes')
      .select('*')
      .order('label');

    if (sizesError) {
      console.error('Vehicle sizes fetch error:', sizesError);
      return NextResponse.json(
        { error: 'Failed to fetch vehicle sizes', details: sizesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unmatched_vehicles: unmatchedVehicles || [],
      vehicle_sizes: vehicleSizes || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Unmatched vehicles API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update vehicle size mapping for unmatched vehicle
export async function PUT(request: NextRequest) {
  try {
    // Authentication and authorization
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await checkServerAdminAccess(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateVehicleSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { vehicle_id, size_id, notes } = validationResult.data;

    // Start a transaction
    // 1. Update the vehicle's size_id
    const { error: vehicleUpdateError } = await supabaseServiceRole
      .from('vehicles')
      .update({ 
        size_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicle_id);

    if (vehicleUpdateError) {
      return NextResponse.json(
        { error: 'Failed to update vehicle', details: vehicleUpdateError.message },
        { status: 500 }
      );
    }

    // 2. Update the unmatched vehicle record to 'resolved'
    const { error: unmatchedUpdateError } = await supabaseServiceRole
      .from('unmatched_vehicles')
      .update({
        status: 'resolved',
        admin_notes: notes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicle_id);

    if (unmatchedUpdateError) {
      console.error('Failed to update unmatched vehicle record:', unmatchedUpdateError);
      // Don't fail the request for this, as the main action (updating vehicle) succeeded
    }

    // 3. Optionally, add this vehicle data to our internal vehicle database for future matches
    const { data: vehicleData } = await supabaseServiceRole
      .from('vehicles')
      .select('make, model, vehicles_sizes(label)')
      .eq('id', vehicle_id)
      .single();

    if (vehicleData) {
      // Add to missing_vehicle_models for future reference
      await supabaseServiceRole
        .from('missing_vehicle_models')
        .upsert({
          make: vehicleData.make,
          model: vehicleData.model,
          suggested_size: size_id,
          frequency: 1,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'make,model',
          ignoreDuplicates: false
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle size mapping updated successfully'
    });

  } catch (error) {
    console.error('Update vehicle mapping API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Bulk resolve multiple unmatched vehicles
export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await checkServerAdminAccess(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { updates } = body; // Array of { vehicle_id, size_id, notes }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    // Validate all updates
    const validationResults = updates.map(update => updateVehicleSchema.safeParse(update));
    const hasErrors = validationResults.some(result => !result.success);
    
    if (hasErrors) {
      return NextResponse.json(
        { error: 'Invalid update data in request' },
        { status: 400 }
      );
    }

    const successfulUpdates: string[] = [];
    const failedUpdates: { vehicle_id: string; error: string }[] = [];

    // Process each update
    for (const update of updates) {
      try {
        const { vehicle_id, size_id, notes } = update;

        // Update vehicle
        const { error: vehicleError } = await supabaseServiceRole
          .from('vehicles')
          .update({ 
            size_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', vehicle_id);

        if (vehicleError) {
          failedUpdates.push({ vehicle_id, error: vehicleError.message });
          continue;
        }

        // Update unmatched vehicle record
        await supabaseServiceRole
          .from('unmatched_vehicles')
          .update({
            status: 'resolved',
            admin_notes: notes,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('vehicle_id', vehicle_id);

        successfulUpdates.push(vehicle_id);

      } catch (error) {
        failedUpdates.push({ 
          vehicle_id: update.vehicle_id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        successful: successfulUpdates.length,
        failed: failedUpdates.length,
        successful_updates: successfulUpdates,
        failed_updates: failedUpdates
      }
    });

  } catch (error) {
    console.error('Bulk update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}