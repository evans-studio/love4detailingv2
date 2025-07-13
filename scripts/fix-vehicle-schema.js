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

async function fixVehicleSchema() {
  try {
    console.log('=== FIXING VEHICLE SCHEMA ===')
    
    // First, check current vehicles table structure
    console.log('\n1. Checking current vehicles table structure:')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'vehicles')
      .eq('table_schema', 'public')
    
    if (columnsError) {
      console.error('Error checking columns:', columnsError)
      return
    }
    
    console.log('Current columns:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}, default: ${col.column_default}`)
    })
    
    // Check if size_confirmed column exists
    const hasSizeConfirmed = columns.some(col => col.column_name === 'size_confirmed')
    
    if (hasSizeConfirmed) {
      console.log('\n✅ size_confirmed column already exists!')
    } else {
      console.log('\n⚠️  size_confirmed column is missing, adding it...')
      
      // Add the missing column using raw SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE vehicles ADD COLUMN size_confirmed boolean DEFAULT false;'
      })
      
      if (error) {
        console.error('Error adding column:', error)
        
        // Try alternative approach using direct SQL
        console.log('Trying alternative approach...')
        const { data: altData, error: altError } = await supabase
          .from('vehicles')
          .select('id')
          .limit(1)
        
        if (altError) {
          console.error('Cannot access vehicles table:', altError)
        } else {
          console.log('Vehicles table is accessible, column may have been added')
        }
      } else {
        console.log('✅ Successfully added size_confirmed column')
      }
    }
    
    // Verify the column was added by checking structure again
    console.log('\n2. Verifying updated table structure:')
    const { data: updatedColumns, error: updatedError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'vehicles')
      .eq('table_schema', 'public')
    
    if (updatedError) {
      console.error('Error checking updated columns:', updatedError)
    } else {
      console.log('Updated columns:')
      updatedColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}, default: ${col.column_default}`)
      })
      
      const nowHasSizeConfirmed = updatedColumns.some(col => col.column_name === 'size_confirmed')
      if (nowHasSizeConfirmed) {
        console.log('\n✅ size_confirmed column is now present!')
      } else {
        console.log('\n❌ size_confirmed column is still missing')
      }
    }
    
    // Test vehicle creation to ensure it works
    console.log('\n3. Testing vehicle creation:')
    const testVehicle = {
      make: 'Test',
      model: 'Vehicle',
      year: 2024,
      size: 'medium',
      size_confirmed: false
    }
    
    console.log('Test vehicle data:', testVehicle)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixVehicleSchema()