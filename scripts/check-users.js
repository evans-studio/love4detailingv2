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

async function checkUsers() {
  try {
    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    console.log('Auth users:', authUsers.users.length)
    authUsers.users.forEach(user => {
      console.log(`- ${user.email} (${user.id})`)
    })

    // Check profile users
    const { data: profileUsers, error: profileError } = await supabase
      .from('users')
      .select('*')
    
    if (profileError) {
      console.error('Error fetching profile users:', profileError)
      return
    }

    console.log('\nProfile users:', profileUsers.length)
    profileUsers.forEach(user => {
      console.log(`- ${user.email} (${user.id}) - ${user.role}`)
    })

    // Find missing profiles
    const missingProfiles = authUsers.users.filter(authUser => 
      !profileUsers.find(profileUser => profileUser.id === authUser.id)
    )

    console.log('\nMissing profiles:', missingProfiles.length)
    missingProfiles.forEach(user => {
      console.log(`- ${user.email} (${user.id})`)
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

checkUsers()