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

async function applySizeConfirmedFix() {
  try {
    console.log('=== APPLYING SIZE_CONFIRMED FIX ===')
    
    // Execute SQL directly using service role
    console.log('\n1. Adding size_confirmed column to vehicles table:')
    
    const { data: result1, error: error1 } = await supabase
      .rpc('sql', {
        query: 'ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS size_confirmed boolean DEFAULT false;'
      })
    
    if (error1) {
      console.error('Error adding column:', error1)
      
      // Try alternative approach using edge function
      console.log('Trying alternative approach...')
      
      // Check if the function exists
      const { data: functions, error: funcError } = await supabase
        .rpc('version')
      
      if (funcError) {
        console.error('Cannot access database functions:', funcError)
        
        // Manual approach - try to insert and see what happens
        console.log('\n2. Manual verification approach:')
        const testVehicle = {
          make: 'Test',
          model: 'Schema',
          year: 2024,
          size: 'medium',
          size_confirmed: false,
          user_id: '5a6ffffd-d11f-470d-b65e-2559256a5954'
        }
        
        const { data: insertResult, error: insertError } = await supabase
          .from('vehicles')
          .insert([testVehicle])
          .select()
        
        if (insertError) {
          console.error('Still missing size_confirmed column:', insertError)
          
          // Try to create via raw SQL execution
          console.log('\n3. Attempting raw SQL execution:')
          
          const { Pool } = require('pg')
          const connectionString = envVars.NEXT_PUBLIC_SUPABASE_URL
            .replace('https://', 'postgresql://postgres:')
            .replace('.supabase.co', `.supabase.co:5432/postgres`)
          
          // This approach would require the postgres password, which we don't have
          console.log('❌ Raw SQL approach not available without postgres password')
          
          // Final approach - modify the API to handle missing column
          console.log('\n4. Alternative: Modify API to handle missing column gracefully')
          console.log('We can update the vehicles API to not require size_confirmed')
          
        } else {
          console.log('✅ size_confirmed column is now working!')
          console.log('Test vehicle created:', insertResult)
          
          // Clean up
          if (insertResult && insertResult.length > 0) {
            await supabase
              .from('vehicles')
              .delete()
              .eq('id', insertResult[0].id)
            console.log('🧹 Cleaned up test vehicle')
          }
        }
      }
    } else {
      console.log('✅ Successfully added size_confirmed column')
      
      // Test the fix
      console.log('\n2. Testing vehicle creation with size_confirmed:')
      const testVehicle = {
        make: 'Test',
        model: 'Schema',
        year: 2024,
        size: 'medium',
        size_confirmed: false,
        user_id: '5a6ffffd-d11f-470d-b65e-2559256a5954'
      }
      
      const { data: insertResult, error: insertError } = await supabase
        .from('vehicles')
        .insert([testVehicle])
        .select()
      
      if (insertError) {
        console.error('Still having issues:', insertError)
      } else {
        console.log('✅ Vehicle creation with size_confirmed works!')
        console.log('Test vehicle created:', insertResult)
        
        // Clean up
        if (insertResult && insertResult.length > 0) {
          await supabase
            .from('vehicles')
            .delete()
            .eq('id', insertResult[0].id)
          console.log('🧹 Cleaned up test vehicle')
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

applySizeConfirmedFix()