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

async function checkDatabaseState() {
  try {
    console.log('=== DATABASE STATE CHECK ===')
    
    // Check users table with service role
    console.log('\n1. Checking users table with service role:')
    const { data: serviceUsers, error: serviceError } = await supabase
      .from('users')
      .select('*')
    
    if (serviceError) {
      console.error('Service role error:', serviceError)
    } else {
      console.log('Service role found users:', serviceUsers.length)
      serviceUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) - ${user.role}`)
      })
    }

    // Check with client role (RLS)
    console.log('\n2. Checking users table with client role (RLS):')
    const clientSupabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: clientUsers, error: clientError } = await clientSupabase
      .from('users')
      .select('*')
    
    if (clientError) {
      console.error('Client role error:', clientError)
    } else {
      console.log('Client role found users:', clientUsers.length)
      clientUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) - ${user.role}`)
      })
    }

    // Check table permissions
    console.log('\n3. Checking table info:')
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_name', 'users')
    
    if (tableError) {
      console.error('Table info error:', tableError)
    } else {
      console.log('Table info:', tableInfo)
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkDatabaseState()