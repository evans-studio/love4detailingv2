import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RouteParams {
  params: {
    serviceId: string
  }
}

// GET /api/admin/services/[serviceId] - Get specific service with pricing
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { serviceId } = params
    console.log('🔍 Admin service detail API called for:', serviceId)
    
    // Use service role for admin operations to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get specific service with pricing - using current schema
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        id,
        name,
        code,
        description,
        base_duration_minutes,
        is_active,
        created_at,
        updated_at,
        service_pricing (
          id,
          vehicle_size,
          price_pence,
          duration_minutes,
          is_active
        )
      `)
      .eq('id', serviceId)
      .single()
    
    if (serviceError) {
      console.error('Error fetching service:', serviceError)
      if (serviceError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch service' },
        { status: 500 }
      )
    }

    // Transform pricing data
    const pricing = service.service_pricing || []
    const activePricing = pricing.filter(p => p.is_active)
    
    const priceRange = activePricing.length > 0 ? {
      min: Math.min(...activePricing.map(p => p.price_pence)),
      max: Math.max(...activePricing.map(p => p.price_pence))
    } : { min: 0, max: 0 }

    const transformedService = {
      ...service,
      // Provide default values for missing fields to maintain compatibility
      short_description: (service as any).short_description || service.description || '',
      display_order: (service as any).display_order || 0,
      features: (service as any).features || [],
      pricing: pricing,
      pricing_summary: {
        range: priceRange,
        formatted_range: priceRange.min === priceRange.max 
          ? `£${(priceRange.min / 100).toFixed(2)}`
          : `£${(priceRange.min / 100).toFixed(2)} - £${(priceRange.max / 100).toFixed(2)}`,
        vehicle_sizes: activePricing.map(p => p.vehicle_size),
        total_pricing_records: pricing.length,
        active_pricing_records: activePricing.length
      }
    }

    console.log('✅ Service found:', service.name)

    return NextResponse.json({
      success: true,
      data: transformedService
    })

  } catch (error) {
    console.error('❌ Admin service detail GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/services/[serviceId] - Delete service
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { serviceId } = params
    console.log('🔍 Admin service DELETE called for:', serviceId)
    
    // Use service role for admin operations to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if service exists and has any bookings
    const { data: serviceBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('service_id', serviceId)
      .limit(1)

    if (bookingsError) {
      console.error('Error checking service bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to check service usage' },
        { status: 500 }
      )
    }

    if (serviceBookings && serviceBookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service that has existing bookings. Consider deactivating instead.' },
        { status: 409 }
      )
    }

    // Delete service pricing first (foreign key constraint)
    const { error: pricingDeleteError } = await supabase
      .from('service_pricing')
      .delete()
      .eq('service_id', serviceId)

    if (pricingDeleteError) {
      console.error('Error deleting service pricing:', pricingDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete service pricing' },
        { status: 500 }
      )
    }

    // Delete the service
    const { error: serviceDeleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (serviceDeleteError) {
      console.error('Error deleting service:', serviceDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete service' },
        { status: 500 }
      )
    }

    console.log('✅ Service deleted successfully:', serviceId)

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    })

  } catch (error) {
    console.error('❌ Admin service DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/services/[serviceId] - Toggle service active status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { serviceId } = params
    const body = await request.json()
    const { action } = body
    
    console.log(`🔍 Admin service PATCH called for ${serviceId} with action:`, action)
    
    // Use service role for admin operations to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (action === 'toggle_active') {
      // Get current service status
      const { data: currentService, error: fetchError } = await supabase
        .from('services')
        .select('is_active')
        .eq('id', serviceId)
        .single()

      if (fetchError) {
        console.error('Error fetching current service:', fetchError)
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        )
      }

      // Toggle the status
      const newStatus = !currentService.is_active
      const { data: updatedService, error: updateError } = await supabase
        .from('services')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating service status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update service status' },
          { status: 500 }
        )
      }

      console.log(`✅ Service ${newStatus ? 'activated' : 'deactivated'}:`, serviceId)

      return NextResponse.json({
        success: true,
        data: updatedService,
        message: `Service ${newStatus ? 'activated' : 'deactivated'} successfully`
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ Admin service PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}