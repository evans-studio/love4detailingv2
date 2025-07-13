import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/services - Get active services for public display
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Public services API called')
    
    // Use service role for public operations to bypass RLS for active services only
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get only active services with pricing - using current schema
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
        service_pricing (
          id,
          vehicle_size,
          price_pence,
          duration_minutes,
          is_active
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    console.log('🔍 Raw services from database:', JSON.stringify(services, null, 2))
    console.log('🔍 Services error:', servicesError)
    
    if (servicesError) {
      console.error('Error fetching public services:', servicesError)
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      )
    }

    // Transform services for public display
    console.log(`🔄 Starting transformation of ${services?.length || 0} services`)
    
    const transformedServices = (services || []).map((service, index) => {
      console.log(`🔄 Transforming service ${index + 1}: ${service.name}`)
      
      const pricing = service.service_pricing || []
      const activePricing = pricing.filter(p => p.is_active)
      
      console.log(`   - Pricing records: ${pricing.length}`)
      console.log(`   - Active pricing: ${activePricing.length}`)
      
      // Calculate price range
      const priceRange = activePricing.length > 0 ? {
        min: Math.min(...activePricing.map(p => p.price_pence)),
        max: Math.max(...activePricing.map(p => p.price_pence))
      } : { min: 0, max: 0 }

      const transformed = {
        id: service.id,
        name: service.name,
        code: service.code,
        description: service.description,
        // Provide default values for missing fields to maintain compatibility
        short_description: (service as any).short_description || service.description || '',
        display_order: (service as any).display_order || 0,
        features: (service as any).features || [],
        base_duration_minutes: service.base_duration_minutes,
        is_active: service.is_active,
        pricing_summary: {
          range: priceRange,
          formatted_range: priceRange.min === priceRange.max 
            ? `£${(priceRange.min / 100).toFixed(2)}`
            : `£${(priceRange.min / 100).toFixed(2)} - £${(priceRange.max / 100).toFixed(2)}`,
          vehicle_sizes: activePricing.map(p => p.vehicle_size),
          min_price_formatted: `£${(priceRange.min / 100).toFixed(2)}`,
          min_duration: activePricing.length > 0 ? Math.min(...activePricing.map(p => p.duration_minutes)) : service.base_duration_minutes
        }
      }
      
      console.log(`   - Transformed: ${transformed.name} - ${transformed.pricing_summary.formatted_range}`)
      return transformed
    })

    console.log(`✅ Found ${transformedServices.length} active services for public display`)
    transformedServices.forEach(service => {
      console.log(`   - ${service.name}: ${service.pricing_summary.formatted_range}`)
    })

    return NextResponse.json({
      success: true,
      data: transformedServices,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Public services GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}