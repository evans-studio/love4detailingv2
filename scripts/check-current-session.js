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

async function checkCurrentSession() {
  try {
    // Check all auth users with their sessions
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    console.log('All auth users:')
    authUsers.users.forEach(user => {
      console.log(`- ${user.email} (${user.id})`)
      console.log(`  Last sign in: ${user.last_sign_in_at}`)
      console.log(`  Email confirmed: ${user.email_confirmed_at}`)
      console.log(`  Created: ${user.created_at}`)
      console.log()
    })

    // Check if there are any active sessions
    console.log('Total users:', authUsers.users.length)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkCurrentSession()