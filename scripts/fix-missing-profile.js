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

async function fixMissingProfile() {
  try {
    // First, check which auth users are missing profiles
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    const { data: profileUsers, error: profileError } = await supabase
      .from('users')
      .select('id, email')
    
    if (profileError) {
      console.error('Error fetching profile users:', profileError)
      return
    }

    // Find missing profiles
    const missingProfiles = authUsers.users.filter(authUser => 
      !profileUsers.find(profileUser => profileUser.id === authUser.id)
    )

    console.log('Missing profiles:', missingProfiles.length)

    if (missingProfiles.length === 0) {
      console.log('All profiles exist!')
      return
    }

    // Create missing profiles
    for (const user of missingProfiles) {
      console.log(`Creating profile for: ${user.email}`)
      
      // Determine role based on email
      let role = 'customer'
      if (user.email === 'paul@evans-studio.co.uk') {
        role = 'super_admin'
      } else if (user.email === 'zell@love4detailing.com') {
        role = 'admin'
      }

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          role: role,
          is_active: true,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at
        })
        .select()

      if (error) {
        console.error(`Error creating profile for ${user.email}:`, error)
      } else {
        console.log(`✅ Created profile for ${user.email} with role: ${role}`)
      }
    }

    console.log('Profile creation complete!')

  } catch (error) {
    console.error('Error:', error)
  }
}

fixMissingProfile()