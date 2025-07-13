import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/services - Get all services with pricing
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin services API called')
    
    // Use service role for admin operations to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get services with their pricing - using current schema
    const { data: services, error: servicesError } = await supabase
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
      .order('created_at', { ascending: true })
    
    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      )
    }

    // Transform the data to include pricing summary and analytics
    const transformedServices = services?.map(service => {
      const pricing = service.service_pricing || []
      const activePricing = pricing.filter(p => p.is_active)
      
      const priceRange = activePricing.length > 0 ? {
        min: Math.min(...activePricing.map(p => p.price_pence)),
        max: Math.max(...activePricing.map(p => p.price_pence))
      } : { min: 0, max: 0 }

      return {
        ...service,
        // Provide default values for missing fields
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
    }) || []

    console.log(`✅ Found ${transformedServices.length} services`)

    return NextResponse.json({
      success: true,
      data: transformedServices,
      count: transformedServices.length
    })

  } catch (error) {
    console.error('❌ Admin services GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/services - Create new service
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin services POST called')
    
    const body = await request.json()
    const { service, pricing } = body

    // Validate required fields
    if (!service?.name || !service?.code) {
      return NextResponse.json(
        { error: 'Service name and code are required' },
        { status: 400 }
      )
    }

    if (!pricing || !Array.isArray(pricing) || pricing.length === 0) {
      return NextResponse.json(
        { error: 'Service pricing is required' },
        { status: 400 }
      )
    }

    // Use service role for admin operations to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if service code already exists
    const { data: existingService } = await supabase
      .from('services')
      .select('id, code')
      .eq('code', service.code)
      .single()

    if (existingService) {
      return NextResponse.json(
        { error: 'Service code already exists' },
        { status: 409 }
      )
    }

    // Create the service with current schema fields
    const { data: newService, error: serviceError } = await supabase
      .from('services')
      .insert({
        name: service.name,
        code: service.code,
        description: service.description || null,
        base_duration_minutes: service.base_duration_minutes || 120,
        is_active: service.is_active !== false
      })
      .select()
      .single()

    if (serviceError) {
      console.error('Error creating service:', serviceError)
      return NextResponse.json(
        { error: 'Failed to create service' },
        { status: 500 }
      )
    }

    // Create pricing entries for each vehicle size
    const pricingEntries = pricing.map(p => ({
      service_id: newService.id,
      vehicle_size: p.vehicle_size,
      price_pence: p.price_pence,
      duration_minutes: p.duration_minutes || service.base_duration_minutes || 120,
      is_active: p.is_active !== false
    }))

    const { data: newPricing, error: pricingError } = await supabase
      .from('service_pricing')
      .insert(pricingEntries)
      .select()

    if (pricingError) {
      console.error('Error creating service pricing:', pricingError)
      // Clean up the service if pricing creation failed
      await supabase.from('services').delete().eq('id', newService.id)
      return NextResponse.json(
        { error: 'Failed to create service pricing' },
        { status: 500 }
      )
    }

    console.log('✅ Service created successfully:', newService.id)

    return NextResponse.json({
      success: true,
      data: {
        service: newService,
        pricing: newPricing
      },
      message: 'Service created successfully'
    })

  } catch (error) {
    console.error('❌ Admin services POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/services - Update existing service
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Admin services PUT called')
    
    const body = await request.json()
    const { id, service, pricing } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    // Use service role for admin operations to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update the service - only fields that exist in current schema
    const updateData: any = {}
    if (service.name !== undefined) updateData.name = service.name
    if (service.code !== undefined) updateData.code = service.code
    if (service.description !== undefined) updateData.description = service.description
    if (service.base_duration_minutes !== undefined) updateData.base_duration_minutes = service.base_duration_minutes
    if (service.is_active !== undefined) updateData.is_active = service.is_active
    updateData.updated_at = new Date().toISOString()

    const { data: updatedService, error: serviceError } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (serviceError) {
      console.error('Error updating service:', serviceError)
      return NextResponse.json(
        { error: 'Failed to update service' },
        { status: 500 }
      )
    }

    // Update pricing if provided
    let updatedPricing = null
    if (pricing && Array.isArray(pricing)) {
      // Delete existing pricing
      await supabase
        .from('service_pricing')
        .delete()
        .eq('service_id', id)

      // Create new pricing entries
      const pricingEntries = pricing.map(p => ({
        service_id: id,
        vehicle_size: p.vehicle_size,
        price_pence: p.price_pence,
        duration_minutes: p.duration_minutes || service.base_duration_minutes || 120,
        is_active: p.is_active !== false
      }))

      const { data: newPricing, error: pricingError } = await supabase
        .from('service_pricing')
        .insert(pricingEntries)
        .select()

      if (pricingError) {
        console.error('Error updating service pricing:', pricingError)
        return NextResponse.json(
          { error: 'Failed to update service pricing' },
          { status: 500 }
        )
      }

      updatedPricing = newPricing
    }

    console.log('✅ Service updated successfully:', id)

    return NextResponse.json({
      success: true,
      data: {
        service: updatedService,
        pricing: updatedPricing
      },
      message: 'Service updated successfully'
    })

  } catch (error) {
    console.error('❌ Admin services PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}