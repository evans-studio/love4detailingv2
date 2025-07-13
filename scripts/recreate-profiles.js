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

async function recreateProfiles() {
  try {
    console.log('Recreating user profiles...')
    
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    console.log('Found auth users:', authUsers.users.length)

    // Clear existing profiles first
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', 'fake-id-to-delete-all')
    
    if (deleteError) {
      console.error('Error clearing users table:', deleteError)
    } else {
      console.log('Cleared existing profiles')
    }

    // Create profiles for all auth users
    const profilesToCreate = authUsers.users.map(user => {
      let role = 'customer'
      let full_name = ''
      
      if (user.email === 'paul@evans-studio.co.uk') {
        role = 'super_admin'
        full_name = 'Paul Evans'
      } else if (user.email === 'zell@love4detailing.com') {
        role = 'admin'
        full_name = 'Zell Love4Detailing'
      } else if (user.email === 'evanspaul87@gmail.com') {
        role = 'customer'
        full_name = 'Paul Evans Customer'
      } else if (user.email === 'test@example.com') {
        role = 'super_admin'
        full_name = 'Test User'
      }

      return {
        id: user.id,
        email: user.email,
        full_name: full_name,
        role: role,
        is_active: true,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      }
    })

    console.log('Creating profiles:', profilesToCreate.length)

    const { data: createdProfiles, error: createError } = await supabase
      .from('users')
      .insert(profilesToCreate)
      .select()

    if (createError) {
      console.error('Error creating profiles:', createError)
    } else {
      console.log('✅ Created profiles:', createdProfiles.length)
      createdProfiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.role})`)
      })
    }

    // Verify the profiles were created
    const { data: verifyProfiles, error: verifyError } = await supabase
      .from('users')
      .select('id, email, role, full_name')

    if (verifyError) {
      console.error('Error verifying profiles:', verifyError)
    } else {
      console.log('\n✅ Verification - Total profiles now:', verifyProfiles.length)
      verifyProfiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.role}) - ${profile.full_name}`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

recreateProfiles()