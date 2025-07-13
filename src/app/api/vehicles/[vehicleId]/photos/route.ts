import { NextRequest, NextResponse } from 'next/server'
import { VehicleProcedures } from '@/lib/database/procedures'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, photoData } = body

    if (!action || !['upload', 'delete', 'set_primary'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required (upload, delete, set_primary)' },
        { status: 400 }
      )
    }

    const { data, error } = await VehicleProcedures.manageVehiclePhoto(
      action,
      params.vehicleId,
      user.id,
      photoData || {}
    )

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}