const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local manually
const SUPABASE_URL = 'https://lczzvvnspsuacshfawpe.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjenp2dm5zcHN1YWNzaGZhd3BlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMxNTc0NiwiZXhwIjoyMDY2ODkxNzQ2fQ._xtRXgSFQk2wF2PkZEdNG7EP1gFxQCuVKW1RHseGsUY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function simpleServiceMigration() {
  console.log('🔧 Applying Simple Service Management Migration...')

  try {
    // First check current structure by selecting existing service
    const { data: existingServices, error: existingError } = await supabase
      .from('services')
      .select('*')
      .limit(1)

    if (existingError) {
      console.error('Error checking existing services:', existingError)
      return
    }

    console.log('Current services found:', existingServices?.length || 0)
    if (existingServices?.length > 0) {
      console.log('Current service fields:', Object.keys(existingServices[0]))
    }

    // Check if we have short_description field already
    if (existingServices?.length > 0 && 'short_description' in existingServices[0]) {
      console.log('✅ Service migration already applied - new fields exist')
      return await testServiceAPI()
    }

    // Check if we have any existing Full Valet service with old schema
    const { data: fullValet, error: fullValetError } = await supabase
      .from('services')
      .select('*')
      .eq('name', 'Full Valet')
      .single()

    if (fullValetError && fullValetError.code !== 'PGRST116') {
      console.error('Error checking Full Valet:', fullValetError)
    }

    if (!fullValet) {
      console.log('🚗 Creating Full Valet service with current schema...')

      // Create with current schema (no new fields yet)
      const { data: newService, error: createError } = await supabase
        .from('services')
        .insert({
          name: 'Full Valet',
          code: 'FULL_VALET',
          description: 'Our premium full valet service provides complete interior and exterior car detailing. We clean every surface of your vehicle to the highest standard, leaving it spotless inside and out. Perfect for maintaining your car\'s appearance and value.',
          base_duration_minutes: 150,
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating Full Valet service:', createError)
        return
      }

      console.log('✅ Full Valet service created:', newService.id)

      // Create pricing for Full Valet
      const pricingData = [
        { vehicle_size: 'small', price_pence: 4500, duration_minutes: 120 },
        { vehicle_size: 'medium', price_pence: 6000, duration_minutes: 135 },
        { vehicle_size: 'large', price_pence: 7500, duration_minutes: 150 },
        { vehicle_size: 'extra_large', price_pence: 8500, duration_minutes: 180 }
      ].map(p => ({
        service_id: newService.id,
        vehicle_size: p.vehicle_size,
        price_pence: p.price_pence,
        duration_minutes: p.duration_minutes,
        is_active: true
      }))

      const { error: pricingError } = await supabase
        .from('service_pricing')
        .insert(pricingData)

      if (pricingError) {
        console.error('Error creating pricing:', pricingError)
      } else {
        console.log('✅ Full Valet pricing created')
      }
    } else {
      console.log('✅ Full Valet service already exists')
    }

    await testServiceAPI()

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function testServiceAPI() {
  // Test the API with current schema
  console.log('🧪 Testing services API with current schema...')
  const { data: testServices, error: testError } = await supabase
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

  if (testError) {
    console.error('❌ Test failed:', testError)
  } else {
    console.log(`✅ Test passed - found ${testServices.length} services`)
    testServices.forEach(service => {
      console.log(`  - ${service.name} (${service.code}) - ${service.service_pricing?.length || 0} pricing records`)
    })
  }

  console.log('🎉 Simple Service Migration Complete!')
}

simpleServiceMigration()