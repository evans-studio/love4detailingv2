const { createClient } = require('@supabase/supabase-js')

// Read environment variables directly
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applyServiceMigration() {
  console.log('🔧 Applying Service Management Migration...')

  try {
    // Check if the new columns already exist
    const { data: existingServices, error: checkError } = await supabase
      .from('services')
      .select('short_description, display_order, features')
      .limit(1)

    if (!checkError) {
      console.log('✅ Migration already applied - new fields exist')
      return
    }

    console.log('📝 Adding new columns to services table...')

    // Add new columns to services table
    const migrations = [
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS short_description TEXT;`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order ASC, created_at ASC);`,
      `CREATE INDEX IF NOT EXISTS idx_services_active_ordered ON services(is_active, display_order ASC) WHERE is_active = true;`,
    ]

    for (const migration of migrations) {
      console.log(`Executing: ${migration}`)
      const { error } = await supabase.rpc('exec_sql', { sql: migration })
      if (error) {
        console.error('Migration error:', error)
        // Continue with other migrations
      }
    }

    // Check if Full Valet service exists
    const { data: fullValetService, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('code', 'FULL_VALET')
      .single()

    if (serviceError && serviceError.code !== 'PGRST116') {
      console.error('Error checking for Full Valet service:', serviceError)
    }

    if (!fullValetService) {
      console.log('🚗 Creating Full Valet service...')

      // Create Full Valet service
      const { data: newService, error: createError } = await supabase
        .from('services')
        .insert({
          name: 'Full Valet',
          code: 'FULL_VALET',
          description: 'Our premium full valet service provides complete interior and exterior car detailing. We clean every surface of your vehicle to the highest standard, leaving it spotless inside and out. Perfect for maintaining your car\'s appearance and value.',
          short_description: 'Complete interior and exterior car detailing service',
          base_duration_minutes: 150,
          display_order: 1,
          features: [
            'Complete exterior wash and wax',
            'Full interior vacuum and clean',
            'Dashboard and console detailing',
            'Window cleaning (inside and out)',
            'Tyre cleaning and shine',
            'Door frame and jamb cleaning',
            'Air freshener application',
            'Quality guarantee'
          ],
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
      console.log('📝 Updating existing Full Valet service...')

      // Update existing Full Valet with new fields
      const { error: updateError } = await supabase
        .from('services')
        .update({
          short_description: 'Complete interior and exterior car detailing service',
          display_order: 1,
          features: [
            'Complete exterior wash and wax',
            'Full interior vacuum and clean',
            'Dashboard and console detailing',
            'Window cleaning (inside and out)',
            'Tyre cleaning and shine',
            'Door frame and jamb cleaning',
            'Air freshener application',
            'Quality guarantee'
          ]
        })
        .eq('code', 'FULL_VALET')

      if (updateError) {
        console.error('Error updating Full Valet:', updateError)
      } else {
        console.log('✅ Full Valet service updated')
      }
    }

    // Test the API
    console.log('🧪 Testing services API...')
    const { data: testServices, error: testError } = await supabase
      .from('services')
      .select(`
        id,
        name,
        code,
        description,
        short_description,
        base_duration_minutes,
        display_order,
        features,
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
      .order('display_order', { ascending: true })

    if (testError) {
      console.error('❌ Test failed:', testError)
    } else {
      console.log(`✅ Test passed - found ${testServices.length} services`)
      testServices.forEach(service => {
        console.log(`  - ${service.name} (${service.code}) - ${service.service_pricing?.length || 0} pricing records`)
      })
    }

    console.log('🎉 Service Management Migration Complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyServiceMigration()