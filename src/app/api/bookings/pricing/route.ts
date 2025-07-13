import { NextRequest, NextResponse } from 'next/server'
import { BookingProcedures } from '@/lib/database/procedures'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { service_id, vehicle_size, add_ons = [] } = body

    if (!service_id || !vehicle_size) {
      return NextResponse.json(
        { error: 'service_id and vehicle_size are required' },
        { status: 400 }
      )
    }

    const { data, error } = await BookingProcedures.calculateServicePricing(
      service_id,
      vehicle_size,
      add_ons
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