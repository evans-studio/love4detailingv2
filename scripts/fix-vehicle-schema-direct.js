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

async function fixVehicleSchemaDirectly() {
  try {
    console.log('=== FIXING VEHICLE SCHEMA (DIRECT) ===')
    
    // Test current vehicle table access
    console.log('\n1. Testing current vehicles table access:')
    const { data: existingVehicles, error: accessError } = await supabase
      .from('vehicles')
      .select('*')
      .limit(1)
    
    if (accessError) {
      console.error('Error accessing vehicles table:', accessError)
      return
    }
    
    console.log('✅ Vehicles table is accessible')
    if (existingVehicles && existingVehicles.length > 0) {
      console.log('Sample vehicle columns:', Object.keys(existingVehicles[0]))
    }
    
    // Try to insert a test vehicle to see what columns are missing
    console.log('\n2. Testing vehicle insertion to identify missing columns:')
    const testVehicle = {
      make: 'Test',
      model: 'Schema',
      year: 2024,
      size: 'medium',
      size_confirmed: false,
      user_id: '5a6ffffd-d11f-470d-b65e-2559256a5954' // Use your user ID
    }
    
    const { data: insertResult, error: insertError } = await supabase
      .from('vehicles')
      .insert([testVehicle])
      .select()
    
    if (insertError) {
      console.error('Insert error (expected):', insertError)
      
      if (insertError.message.includes('size_confirmed')) {
        console.log('✅ Confirmed: size_confirmed column is missing')
        
        // Create a migration to add the column
        console.log('\n3. Creating migration to add size_confirmed column:')
        
        const migrationSQL = `
          -- Add size_confirmed column to vehicles table
          ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS size_confirmed boolean DEFAULT false;
          
          -- Update existing vehicles to have size_confirmed = false
          UPDATE vehicles SET size_confirmed = false WHERE size_confirmed IS NULL;
        `
        
        console.log('Migration SQL:', migrationSQL)
        
        // Write migration file
        const fs = require('fs')
        const migrationFile = `supabase/migrations/20250708000300_add_size_confirmed_column.sql`
        fs.writeFileSync(migrationFile, migrationSQL)
        
        console.log(`✅ Created migration file: ${migrationFile}`)
        console.log('Please run: npx supabase db push to apply the migration')
        
      } else {
        console.log('Different error - not size_confirmed related')
      }
    } else {
      console.log('✅ Vehicle insertion successful - size_confirmed column exists')
      console.log('Inserted vehicle:', insertResult)
      
      // Clean up test vehicle
      if (insertResult && insertResult.length > 0) {
        await supabase
          .from('vehicles')
          .delete()
          .eq('id', insertResult[0].id)
        console.log('🧹 Cleaned up test vehicle')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixVehicleSchemaDirectly()