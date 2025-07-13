const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugServices() {
  console.log('🔍 Debugging services visibility issue...\n')

  try {
    // Check all services in database
    console.log('📊 ALL SERVICES IN DATABASE:')
    const { data: allServices, error: allError } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })

    if (allError) {
      console.error('❌ Error fetching all services:', allError)
      return
    }

    allServices?.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`)
      console.log(`   ID: ${service.id}`)
      console.log(`   Code: ${service.code}`)
      console.log(`   Active: ${service.is_active}`)
      console.log(`   Created: ${service.created_at}`)
      console.log('')
    })

    // Check services with pricing (what public API sees)
    console.log('🌐 SERVICES WITH PRICING (Public API):')
    const { data: publicServices, error: publicError } = await supabase
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

    if (publicError) {
      console.error('❌ Error fetching public services:', publicError)
      return
    }

    publicServices?.forEach((service, index) => {
      const activePricing = service.service_pricing?.filter(p => p.is_active) || []
      console.log(`${index + 1}. ${service.name}`)
      console.log(`   Active: ${service.is_active}`)
      console.log(`   Pricing Records: ${service.service_pricing?.length || 0}`)
      console.log(`   Active Pricing: ${activePricing.length}`)
      if (activePricing.length > 0) {
        const prices = activePricing.map(p => `£${(p.price_pence / 100).toFixed(2)}`)
        console.log(`   Prices: ${prices.join(', ')}`)
      }
      console.log('')
    })

    // Test the actual API transformation logic
    console.log('🔄 TESTING API TRANSFORMATION:')
    const transformedServices = (publicServices || []).map(service => {
      const pricing = service.service_pricing || []
      const activePricing = pricing.filter(p => p.is_active)
      
      const priceRange = activePricing.length > 0 ? {
        min: Math.min(...activePricing.map(p => p.price_pence)),
        max: Math.max(...activePricing.map(p => p.price_pence))
      } : { min: 0, max: 0 }

      return {
        id: service.id,
        name: service.name,
        code: service.code,
        description: service.description,
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
    })

    console.log(`✅ Transformed services count: ${transformedServices.length}`)
    transformedServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - ${service.pricing_summary.formatted_range}`)
    })

  } catch (error) {
    console.error('❌ Error in debug script:', error)
  }
}

debugServices()