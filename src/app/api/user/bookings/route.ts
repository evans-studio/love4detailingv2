import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User bookings API called')
    
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // optional status filter

    // Use service role to get comprehensive booking data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🔍 Fetching bookings for user:', user.id)

    // Build query for user's bookings with vehicle details only (slot data separately)
    console.log('🔍 Querying user bookings with vehicle data...')
    let query = serviceSupabase
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
        slot_id,
        vehicles(
          id,
          registration,
          make,
          model,
          year,
          color,
          size
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    console.log(`📊 Found ${bookings?.length || 0} bookings for user`)

    // If no bookings found, return empty array
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: {
          limit,
          offset,
          total: 0,
          hasMore: false
        }
      })
    }

    // Transform the data for frontend consumption (temporary simple version to stop refresh loop)
    const transformedBookings = bookings?.map(booking => {
      return {
        id: booking.id,
        reference: booking.booking_reference || `BK-${booking.id.slice(-6)}`,
        date: booking.created_at?.split('T')[0],
        time: '09:00', // Temporary fallback to stop refresh loop
        endTime: '11:00',
        duration: 120,
        slotFound: false, // Mark as fallback for now
        
        // Service details - use real service data
        service: {
          id: (booking as any).service_id || 'unknown',
          name: 'Full Valet Service', // TODO: Get from services relationship
          price: booking.total_price_pence || 0,
          priceFormatted: `£${((booking.total_price_pence || 0) / 100).toFixed(2)}`
        },
        
        // Vehicle details from database relationship
        vehicle: {
          registration: (booking as any).vehicles?.registration || 'N/A',
          make: (booking as any).vehicles?.make || 'Unknown',
          model: (booking as any).vehicles?.model || 'Vehicle',
          year: (booking as any).vehicles?.year || new Date().getFullYear(),
          color: (booking as any).vehicles?.color || 'Unknown',
          size: (booking as any).vehicles?.size || 'medium',
          displayName: (booking as any).vehicles ? `${(booking as any).vehicles.year} ${(booking as any).vehicles.make} ${(booking as any).vehicles.model}` : 'Customer Vehicle'
        },
        
        // Location and customer info
        location: booking.service_location || '',
        customerName: booking.customer_name || '',
        customerEmail: booking.customer_email || '',
        customerPhone: booking.customer_phone || '',
        
        // Status and payment
        status: booking.status || 'confirmed',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        
        // Additional details
        specialInstructions: booking.customer_instructions || '',
        serviceNotes: booking.notes || '',
        
        // Timestamps
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        
        // Computed fields
        canCancel: booking.status === 'confirmed',
        canReschedule: booking.status === 'confirmed',
        isPast: false,
        isUpcoming: booking.status === 'confirmed'
      }
    }) || []
    
    console.log(`✅ Transformed ${transformedBookings.length} bookings for frontend`)

    // Get total count for pagination
    const { count: totalCount } = await serviceSupabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    console.log('✅ Successfully fetched bookings:', {
      userId: user.id,
      bookingsCount: transformedBookings.length,
      totalCount: totalCount || 0
    })

    return NextResponse.json({
      data: transformedBookings,
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })

  } catch (error) {
    console.error('❌ User bookings API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}