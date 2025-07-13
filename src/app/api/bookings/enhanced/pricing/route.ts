import { NextRequest, NextResponse } from 'next/server'
import { BookingProcedures } from '@/lib/database/procedures'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceId, vehicleSize, slotDate, isRepeatCustomer } = body

    if (!serviceId || !vehicleSize) {
      return NextResponse.json(
        { error: 'Service ID and vehicle size are required' },
        { status: 400 }
      )
    }

    // Get user from session (optional for pricing)
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await BookingProcedures.calculateEnhancedPricing(
      serviceId,
      vehicleSize,
      slotDate,
      isRepeatCustomer || false,
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