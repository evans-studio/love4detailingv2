const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Checking services in database...')

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAndCreateServices() {
  try {
    // Check existing services
    console.log('📊 Checking existing services...')
    const { data: existingServices, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .order('name')

    if (fetchError) {
      console.error('❌ Error fetching services:', fetchError)
      return
    }

    console.log(`✅ Found ${existingServices?.length || 0} existing services:`)
    existingServices?.forEach(service => {
      console.log(`  - ${service.name} (${service.is_active ? 'ACTIVE' : 'INACTIVE'})`)
    })

    // Check if "Full Valet" service exists
    const fullValetExists = existingServices?.find(s => 
      s.name.toLowerCase().includes('full') && s.name.toLowerCase().includes('valet')
    )

    if (!fullValetExists) {
      console.log('\n🚀 Creating "Full Valet" service...')
      
      // Create the Full Valet service
      const { data: newService, error: serviceError } = await supabase
        .from('services')
        .insert({
          name: 'Full Valet Service',
          code: 'FULL_VALET',
          description: 'Complete interior and exterior transformation using premium products and professional techniques. Our comprehensive valet service includes everything needed to restore your vehicle to showroom condition.',
          base_duration_minutes: 180,
          is_active: true
        })
        .select()
        .single()

      if (serviceError) {
        console.error('❌ Error creating service:', serviceError)
        return
      }

      console.log('✅ Created Full Valet service:', newService.id)

      // Create pricing for each vehicle size
      const pricingData = [
        { vehicle_size: 'small', price_pence: 4500, duration_minutes: 150 },      // £45
        { vehicle_size: 'medium', price_pence: 5500, duration_minutes: 180 },     // £55
        { vehicle_size: 'large', price_pence: 6500, duration_minutes: 210 },      // £65
        { vehicle_size: 'extra_large', price_pence: 7500, duration_minutes: 240 } // £75
      ]

      for (const pricing of pricingData) {
        const { error: pricingError } = await supabase
          .from('service_pricing')
          .insert({
            service_id: newService.id,
            vehicle_size: pricing.vehicle_size,
            price_pence: pricing.price_pence,
            duration_minutes: pricing.duration_minutes,
            is_active: true
          })

        if (pricingError) {
          console.error(`❌ Error creating pricing for ${pricing.vehicle_size}:`, pricingError)
        } else {
          console.log(`✅ Created pricing for ${pricing.vehicle_size}: £${(pricing.price_pence / 100).toFixed(2)}`)
        }
      }

      console.log('\n🎉 Full Valet service created successfully!')
    } else {
      console.log('\n✅ Full Valet service already exists:', fullValetExists.name)
      
      // Make sure it's active
      if (!fullValetExists.is_active) {
        console.log('🔄 Activating Full Valet service...')
        const { error: updateError } = await supabase
          .from('services')
          .update({ is_active: true })
          .eq('id', fullValetExists.id)
        
        if (updateError) {
          console.error('❌ Error activating service:', updateError)
        } else {
          console.log('✅ Service activated')
        }
      }
      
      // Check if it has pricing
      const { data: pricing, error: pricingError } = await supabase
        .from('service_pricing')
        .select('*')
        .eq('service_id', fullValetExists.id)

      if (pricingError) {
        console.error('❌ Error checking pricing:', pricingError)
      } else {
        console.log(`📊 Service has ${pricing?.length || 0} pricing records`)
        pricing?.forEach(p => {
          console.log(`  - ${p.vehicle_size}: £${(p.price_pence / 100).toFixed(2)} (${p.is_active ? 'ACTIVE' : 'INACTIVE'})`)
        })

        // If no pricing exists, create it
        if (!pricing || pricing.length === 0) {
          console.log('🚀 Creating pricing for Full Valet service...')
          const pricingData = [
            { vehicle_size: 'small', price_pence: 4500, duration_minutes: 150 },
            { vehicle_size: 'medium', price_pence: 5500, duration_minutes: 180 },
            { vehicle_size: 'large', price_pence: 6500, duration_minutes: 210 },
            { vehicle_size: 'extra_large', price_pence: 7500, duration_minutes: 240 }
          ]

          for (const pricingItem of pricingData) {
            const { error: pricingError } = await supabase
              .from('service_pricing')
              .insert({
                service_id: fullValetExists.id,
                vehicle_size: pricingItem.vehicle_size,
                price_pence: pricingItem.price_pence,
                duration_minutes: pricingItem.duration_minutes,
                is_active: true
              })

            if (pricingError) {
              console.error(`❌ Error creating pricing for ${pricingItem.vehicle_size}:`, pricingError)
            } else {
              console.log(`✅ Created pricing for ${pricingItem.vehicle_size}: £${(pricingItem.price_pence / 100).toFixed(2)}`)
            }
          }
        }
      }
    }

    // Final check - list all active services
    console.log('\n📋 Final active services list:')
    const { data: activeServices, error: activeError } = await supabase
      .from('services')
      .select(`
        *,
        service_pricing (*)
      `)
      .eq('is_active', true)

    if (activeError) {
      console.error('❌ Error fetching active services:', activeError)
    } else {
      console.log(`✅ Found ${activeServices?.length || 0} active services`)
      activeServices?.forEach(service => {
        const activePricing = service.service_pricing?.filter(p => p.is_active) || []
        const priceRange = activePricing.length > 0 ? {
          min: Math.min(...activePricing.map(p => p.price_pence)),
          max: Math.max(...activePricing.map(p => p.price_pence))
        } : null

        console.log(`\n🎯 ${service.name}`)
        console.log(`   Code: ${service.code}`)
        console.log(`   Description: ${service.description?.substring(0, 80)}...`)
        if (priceRange) {
          console.log(`   Price Range: £${(priceRange.min / 100).toFixed(2)} - £${(priceRange.max / 100).toFixed(2)}`)
        }
        console.log(`   Pricing Records: ${activePricing.length}`)
      })
    }

  } catch (error) {
    console.error('❌ Error in script:', error)
  }
}

checkAndCreateServices()