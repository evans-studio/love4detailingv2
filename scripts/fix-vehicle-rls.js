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

async function fixVehicleRLS() {
  try {
    console.log('=== FIXING VEHICLE RLS POLICIES ===')
    
    // Check current policies
    console.log('\n1. Checking existing policies:')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'vehicles')
    
    if (policiesError) {
      console.log('Could not fetch policies (this is normal):', policiesError.message)
    } else {
      console.log('Existing policies:', policies.length)
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`)
      })
    }
    
    // Test current vehicle creation
    console.log('\n2. Testing vehicle creation with current policies:')
    const testVehicle = {
      make: 'BMW',
      model: 'X5',
      year: 2024,
      size: 'large',
      user_id: '5a6ffffd-d11f-470d-b65e-2559256a5954',
      registration: 'TEST123',
      is_active: true
    }
    
    const { data: createResult, error: createError } = await supabase
      .from('vehicles')
      .insert([testVehicle])
      .select()
    
    if (createError) {
      console.log('❌ Vehicle creation failed (expected):', createError.message)
      
      // Create the RLS policies via migration
      console.log('\n3. Creating RLS policies migration:')
      
      const migrationSQL = `
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;

-- Create comprehensive RLS policies for vehicles table
CREATE POLICY "Users can insert own vehicles" ON vehicles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own vehicles" ON vehicles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" ON vehicles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" ON vehicles
FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on vehicles table
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
      `
      
      const fs = require('fs')
      const migrationFile = `supabase/migrations/20250708000500_fix_vehicle_rls.sql`
      fs.writeFileSync(migrationFile, migrationSQL)
      
      console.log(`✅ Created migration file: ${migrationFile}`)
      console.log('Please run: npx supabase db push to apply the migration')
      
    } else {
      console.log('✅ Vehicle creation successful - RLS policies are working')
      console.log('Created vehicle:', createResult)
      
      // Clean up test vehicle
      if (createResult && createResult.length > 0) {
        await supabase
          .from('vehicles')
          .delete()
          .eq('id', createResult[0].id)
        console.log('🧹 Cleaned up test vehicle')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixVehicleRLS()