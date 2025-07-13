import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params
    console.log('🔍 Individual booking API called for ID:', bookingId)

    // Get authenticated user using server-side auth
    const supabase = createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.id, user.email)

    // Use service role to get booking data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query the booking by ID and user_id with vehicle details
    console.log('🔍 Querying individual booking with vehicle data...')
    const { data: booking, error: bookingError } = await serviceSupabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        total_price_pence,
        status,
        created_at,
        updated_at,
        customer_name,
        customer_email,
        customer_phone,
        service_location,
        customer_instructions,
        notes,
        vehicle_id,
        vehicles!inner(
          id,
          registration,
          make,
          model,
          year,
          color,
          size
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (bookingError) {
      console.error('Error fetching booking:', bookingError)
      if (bookingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch booking' },
        { status: 500 }
      )
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Transform the booking data for the "Book Again" form
    const transformedBooking = {
      id: booking.id,
      reference: booking.booking_reference || `BK-${booking.id.slice(-6)}`,
      customerName: booking.customer_name || 'Customer',
      customerEmail: booking.customer_email || 'customer@example.com',
      customerPhone: booking.customer_phone || 'No phone',
      location: booking.service_location || 'Customer location',
      specialInstructions: booking.customer_instructions || '',
      vehicle: {
        registration: (booking as any).vehicles?.registration || 'N/A',
        make: (booking as any).vehicles?.make || 'Unknown',
        model: (booking as any).vehicles?.model || 'Vehicle',
        year: (booking as any).vehicles?.year || new Date().getFullYear(),
        color: (booking as any).vehicles?.color || 'Unknown',
        size: (booking as any).vehicles?.size || 'medium'
      }
    }

    console.log('✅ Successfully fetched individual booking for user')

    return NextResponse.json({
      success: true,
      data: transformedBooking
    })

  } catch (error) {
    console.error('❌ Individual booking API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}