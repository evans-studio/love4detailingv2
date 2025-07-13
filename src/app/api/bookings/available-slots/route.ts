import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/bookings/available-slots - Get available slots for customer booking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date') || searchParams.get('date_start')
    const endDate = searchParams.get('end_date') || searchParams.get('date_end')
    const vehicleSizeParam = searchParams.get('vehicle_size')
    const vehicleSize = (vehicleSizeParam && vehicleSizeParam !== 'undefined') ? vehicleSizeParam : 'medium'
    const serviceId = searchParams.get('service_id') // New parameter for service filtering

    console.log('📋 Available slots API called with:', {
      date,
      startDate,
      endDate,
      vehicleSize,
      serviceId,
      originalVehicleSize: vehicleSizeParam,
      url: request.url
    })

    // Validate parameters
    if (!date && (!startDate || !endDate)) {
      console.log('❌ Parameter validation failed: Missing date parameters')
      return NextResponse.json(
        { error: 'date parameter or start_date and end_date required' },
        { status: 400 }
      )
    }

    // For single date query
    if (date) {
      if (!isValidDate(date)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }

      // Don't allow booking past dates
      const requestedDate = new Date(date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (requestedDate < today) {
        return NextResponse.json({
          success: true,
          data: {
            slots: [],
            date: date,
            total: 0,
            message: 'No slots available for past dates'
          }
        })
      }

      // Query real database for available slots using current schema
      // Use service role temporarily to debug RLS issues
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: slots, error } = await supabase
        .from('available_slots')
        .select('id, slot_date, start_time, slot_status')
        .eq('slot_date', date)
        .eq('slot_status', 'available')
        .order('start_time')
      
      if (error) {
        console.error('Database query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch available slots' },
          { status: 500 }
        )
      }
      
      // Get pricing from database first (use serviceId if provided, otherwise default service)
      const actualServiceId = serviceId || '6856143e-eb1d-4776-bf6b-3f6149f36901'
      const pricePence = await calculatePrice(vehicleSize, supabase, actualServiceId)
      const priceFormatted = formatPrice(pricePence)
      
      // Get service details for slot enrichment
      const serviceDetails = await getServiceDetails(supabase, actualServiceId)

      // Transform to customer booking format (already filtered for available slots)
      const availableSlots = slots?.map(slot => ({
        slot_id: slot.id,
        date: slot.slot_date,
        start_time: slot.start_time.substring(0, 5), // HH:MM:SS to HH:MM
        duration_minutes: 60, // Standard 45min-1hr service
        is_available: true, // Already filtered for available slots
        price_pence: pricePence,
        price_formatted: priceFormatted,
        service_name: serviceDetails?.name || 'Full Valet Service',
        service_code: serviceDetails?.code || 'full_valet',
        service_id: actualServiceId,
        vehicle_size: vehicleSize,
        display_time: slot.start_time.substring(0, 5),
        day_name: new Date(slot.slot_date).toLocaleDateString('en-GB', { weekday: 'long' }),
        formatted_date: new Date(slot.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })) || []
      
      return NextResponse.json({
        success: true,
        data: {
          slots: availableSlots,
          date: date,
          total: availableSlots.length,
          vehicle_size: vehicleSize
        }
      })
    }

    // For date range query
    if (startDate && endDate) {
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        console.log('❌ Date validation failed:', { startDate, endDate, startValid: isValidDate(startDate), endValid: isValidDate(endDate) })
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }

      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (start > end) {
        return NextResponse.json(
          { error: 'start_date must be before end_date' },
          { status: 400 }
        )
      }

      // Query real database for date range using current schema
      // Use service role for consistent access like single date query
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: slots, error } = await supabase
        .from('available_slots')
        .select('id, slot_date, start_time, slot_status')
        .gte('slot_date', startDate)
        .lte('slot_date', endDate)
        .eq('slot_status', 'available')
        .order('slot_date')
        .order('start_time')
      
      if (error) {
        console.error('Database query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch available slots' },
          { status: 500 }
        )
      }
      
      // Get pricing from database first (use serviceId if provided, otherwise default service)
      const actualServiceId = serviceId || '6856143e-eb1d-4776-bf6b-3f6149f36901'
      const pricePence = await calculatePrice(vehicleSize, supabase, actualServiceId)
      const priceFormatted = formatPrice(pricePence)
      
      // Get service details for slot enrichment
      const serviceDetails = await getServiceDetails(supabase, actualServiceId)

      // Transform to customer booking format (already filtered for available slots)
      const allSlots = slots?.map(slot => ({
        slot_id: slot.id,
        date: slot.slot_date,
        start_time: slot.start_time.substring(0, 5),
        duration_minutes: 60,
        is_available: true,
        price_pence: pricePence,
        price_formatted: priceFormatted,
        service_name: serviceDetails?.name || 'Full Valet Service',
        service_code: serviceDetails?.code || 'full_valet',
        service_id: actualServiceId,
        vehicle_size: vehicleSize,
        display_time: slot.start_time.substring(0, 5),
        day_name: new Date(slot.slot_date).toLocaleDateString('en-GB', { weekday: 'long' }),
        formatted_date: new Date(slot.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })) || []

      return NextResponse.json({
        success: true,
        data: {
          slots: allSlots,
          start_date: startDate,
          end_date: endDate,
          total: allSlots.length,
          vehicle_size: vehicleSize
        }
      })
    }

  } catch (error) {
    console.error('Available slots API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate price based on vehicle size and service from database
async function calculatePrice(vehicleSize: string, serviceSupabase: any, serviceId: string = '6856143e-eb1d-4776-bf6b-3f6149f36901'): Promise<number> {
  try {
    const { data: pricing, error } = await serviceSupabase
      .from('service_pricing')
      .select('price_pence')
      .eq('service_id', serviceId)
      .eq('vehicle_size', vehicleSize)
      .eq('is_active', true)
      .single()

    if (error || !pricing) {
      console.log(`No pricing found for service ${serviceId} and vehicle size: ${vehicleSize}, trying fallbacks`)
      
      // Fallback 1: Try medium pricing for the same service
      const { data: fallbackPricing } = await serviceSupabase
        .from('service_pricing')
        .select('price_pence')
        .eq('service_id', serviceId)
        .eq('vehicle_size', 'medium')
        .eq('is_active', true)
        .single()
      
      if (fallbackPricing) {
        return fallbackPricing.price_pence
      }
      
      // Fallback 2: Try default service with requested vehicle size
      const { data: defaultServicePricing } = await serviceSupabase
        .from('service_pricing')
        .select('price_pence')
        .eq('service_id', '6856143e-eb1d-4776-bf6b-3f6149f36901')
        .eq('vehicle_size', vehicleSize)
        .eq('is_active', true)
        .single()
        
      if (defaultServicePricing) {
        return defaultServicePricing.price_pence
      }
      
      return 7500 // Final fallback to £75
    }

    return pricing.price_pence
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return 7500 // Fallback to £75
  }
}

// Helper function to get service details
async function getServiceDetails(serviceSupabase: any, serviceId: string): Promise<{ name: string; code: string; description: string } | null> {
  try {
    const { data: service, error } = await serviceSupabase
      .from('services')
      .select('name, code, description')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single()

    if (error || !service) {
      console.log(`No service found for ID: ${serviceId}`)
      return null
    }

    return service
  } catch (error) {
    console.error('Error fetching service details:', error)
    return null
  }
}

// Helper function to format price
function formatPrice(pricePence: number): string {
  return `£${(pricePence / 100).toFixed(2)}`
}

// Helper function to validate date format
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

// POST /api/bookings/available-slots - Book a specific slot (customer action)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slot_id, customer_data, vehicle_data, booking_details } = body

    // Validate required fields
    if (!slot_id) {
      return NextResponse.json(
        { error: 'slot_id is required' },
        { status: 400 }
      )
    }

    // Real slot booking implementation
    const supabase = createServerSupabase()
    
    // 1. Check if slot is still available
    const { data: slotCheck, error: slotError } = await supabase
      .from('available_slots')
      .select('*')
      .eq('id', slot_id)
      .eq('slot_status', 'available')
      .single()
    
    if (slotError || !slotCheck) {
      return NextResponse.json(
        { error: 'Slot is no longer available' },
        { status: 409 }
      )
    }

    // 2. Get pricing and create booking record
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const vehicleSize = vehicle_data?.size || 'medium'
    const pricePence = await calculatePrice(vehicleSize, serviceSupabase)
    
    const bookingReference = `L4D${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_reference: bookingReference,
        customer_name: customer_data?.name,
        customer_email: customer_data?.email,
        customer_phone: customer_data?.phone,
        vehicle_registration: vehicle_data?.registration,
        vehicle_make: vehicle_data?.make,
        vehicle_model: vehicle_data?.model,
        service_id: 'premium-valet',
        status: 'confirmed',
        service_price_pence: pricePence,
        total_price_pence: pricePence
      })
      .select()
      .single()
    
    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }
    
    // 3. Mark slot as booked
    const { error: linkError } = await supabase
      .from('available_slots')
      .update({ 
        slot_status: 'booked',
        last_modified: new Date().toISOString()
      })
      .eq('id', slot_id)
    
    if (linkError) {
      console.error('Slot booking error:', linkError)
      // Rollback booking if slot linking fails
      await supabase.from('bookings').delete().eq('id', booking.id)
      return NextResponse.json(
        { error: 'Failed to book slot' },
        { status: 500 }
      )
    }
    
    const responseBooking = {
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      slot_id: slot_id,
      status: booking.status,
      payment_status: 'pending',
      slot_date: slotCheck.slot_date,
      slot_time: slotCheck.start_time.substring(0, 5),
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      vehicle_registration: 'N/A',
      vehicle_make: 'Unknown',
      vehicle_model: 'Vehicle',
      total_price_pence: booking.total_price_pence,
      total_price_formatted: formatPrice(booking.total_price_pence),
      created_at: booking.created_at,
      confirmed_at: booking.created_at
    }

    return NextResponse.json({
      success: true,
      data: {
        booking: responseBooking,
        message: 'Slot booked successfully'
      }
    })

  } catch (error) {
    console.error('Slot booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}