import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configure route as dynamic for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate the request body
    if (typeof body.is_available !== 'boolean') {
      return NextResponse.json(
        { error: 'is_available must be a boolean' },
        { status: 400 }
      );
    }

    // Check if slot is booked before allowing changes
    const { data: slot, error: fetchError } = await supabase
      .from('time_slots')
      .select('is_booked')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Time slot not found' },
        { status: 404 }
      );
    }

    if (slot.is_booked) {
      return NextResponse.json(
        { error: 'Cannot modify booked time slot' },
        { status: 400 }
      );
    }

    // Update the time slot
    const { error: updateError } = await supabase
      .from('time_slots')
      .update({ 
        is_available: body.is_available,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Database error updating time slot:', updateError);
      return NextResponse.json(
        { error: 'Failed to update time slot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update time slot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Check if slot is booked before allowing deletion
    const { data: slot, error: fetchError } = await supabase
      .from('time_slots')
      .select('is_booked')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Time slot not found' },
        { status: 404 }
      );
    }

    if (slot.is_booked) {
      return NextResponse.json(
        { error: 'Cannot delete booked time slot' },
        { status: 400 }
      );
    }

    // Delete the time slot
    const { error: deleteError } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error deleting time slot:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete time slot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete time slot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}