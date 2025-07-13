import { NextRequest, NextResponse } from 'next/server'
import { BookingProcedures } from '@/lib/database/procedures'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStart = searchParams.get('date_start')
    const dateEnd = searchParams.get('date_end')
    const serviceId = searchParams.get('service_id')
    const vehicleSize = searchParams.get('vehicle_size') as 'small' | 'medium' | 'large' | 'extra_large'
    
    // Get user from session (optional for enhanced slots)
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!dateStart || !dateEnd) {
      return NextResponse.json(
        { error: 'date_start and date_end are required' },
        { status: 400 }
      )
    }

    const { data, error } = await BookingProcedures.getEnhancedAvailableSlots(
      dateStart,
      dateEnd,
      serviceId || undefined,
      vehicleSize,
      user?.id
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