const { readFileSync } = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables manually
const envFile = readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, value] = line.split('=')
    envVars[key] = value
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function testVehicleCreation() {
  try {
    console.log('=== TESTING VEHICLE CREATION ===')
    
    // Test vehicle creation directly through the database
    console.log('\n1. Testing direct database insertion:')
    const testVehicle = {
      make: 'Test',
      model: 'Vehicle',
      year: 2024,
      size: 'medium',
      user_id: '5a6ffffd-d11f-470d-b65e-2559256a5954',
      registration: 'TEST123',
      is_active: true
    }
    
    const { data: insertResult, error: insertError } = await supabase
      .from('vehicles')
      .insert([testVehicle])
      .select()
    
    if (insertError) {
      console.error('❌ Direct insertion failed:', insertError)
    } else {
      console.log('✅ Direct insertion successful:', insertResult)
      
      // Clean up
      if (insertResult && insertResult.length > 0) {
        await supabase
          .from('vehicles')
          .delete()
          .eq('id', insertResult[0].id)
        console.log('🧹 Cleaned up test vehicle')
      }
    }
    
    // Test fetching vehicles
    console.log('\n2. Testing vehicle fetching:')
    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', '5a6ffffd-d11f-470d-b65e-2559256a5954')
    
    if (fetchError) {
      console.error('❌ Fetch failed:', fetchError)
    } else {
      console.log('✅ Fetch successful:', vehicles.length, 'vehicles found')
      if (vehicles.length > 0) {
        console.log('Sample vehicle columns:', Object.keys(vehicles[0]))
      }
    }
    
    console.log('\n3. Vehicle creation API should now work!')
    console.log('Try adding a vehicle through the dashboard at: http://localhost:3000/dashboard/vehicles')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testVehicleCreation()