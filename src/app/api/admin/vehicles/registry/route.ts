import { NextRequest, NextResponse } from 'next/server'
import { VehicleProcedures } from '@/lib/database/procedures'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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
    const { action, registryData } = body

    if (!action || !['add', 'update', 'verify', 'bulk_update'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required (add, update, verify, bulk_update)' },
        { status: 400 }
      )
    }

    if (!registryData) {
      return NextResponse.json(
        { error: 'Registry data is required' },
        { status: 400 }
      )
    }

    const { data, error } = await VehicleProcedures.manageVehicleRegistry(
      action,
      registryData,
      user.id
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