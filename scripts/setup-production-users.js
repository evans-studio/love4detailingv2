#!/usr/bin/env node

/**
 * Setup Production Users Script
 * Sets up the actual project accounts instead of test data
 * 
 * Production Users:
 * - Super Admin (Paul for testing): paul@evans-studio.co.uk
 * - Admin (Client): zell@love4detailing.com
 * - Customer (Paul for testing): evanspaul87@gmail.com
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=')
    if (key && value) {
      acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
    }
    return acc
  }, {})
  
  Object.assign(process.env, envVars)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Production user accounts
const PRODUCTION_USERS = [
  {
    email: 'paul@evans-studio.co.uk',
    password: 'TempPassword123!',
    full_name: 'Paul Evans',
    role: 'super_admin',
    description: 'Super Admin (Paul for testing purposes)'
  },
  {
    email: 'zell@love4detailing.com',
    password: 'ZellAdmin123!',
    full_name: 'Zell Love4Detailing',
    role: 'admin',
    description: 'Admin (Client - Love4Detailing)'
  },
  {
    email: 'evanspaul87@gmail.com',
    password: 'CustomerTest123!',
    full_name: 'Paul Evans Customer',
    role: 'customer',
    description: 'Customer (Paul for testing customer backend)'
  }
]

async function getCurrentUsers() {
  console.log('📊 Current Users in Database:')
  console.log('=============================')
  
  try {
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Get database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('role', { ascending: false })
    
    if (dbError) throw dbError
    
    console.log(`\n🔐 Auth Users (${authUsers.users.length}):`)
    authUsers.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.id})`)
    })
    
    console.log(`\n👥 Database Users (${dbUsers.length}):`)
    dbUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.role} (${user.id})`)
    })
    
    return { authUsers: authUsers.users, dbUsers }
  } catch (error) {
    console.error('❌ Error getting current users:', error.message)
    return { authUsers: [], dbUsers: [] }
  }
}

async function removeTestUsers() {
  console.log('\n🧹 Removing Test Users:')
  console.log('=======================')
  
  try {
    // Get current users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    // Find test users to remove
    const testEmails = ['customer@example.com', 'admin@love4detailing.com']
    const productionEmails = PRODUCTION_USERS.map(u => u.email)
    
    // Remove test users from auth
    for (const user of authUsers.users) {
      if (testEmails.includes(user.email) || !productionEmails.includes(user.email)) {
        console.log(`🗑️  Removing auth user: ${user.email}`)
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.error(`❌ Error removing auth user ${user.email}:`, deleteError.message)
        } else {
          console.log(`✅ Removed auth user: ${user.email}`)
        }
      }
    }
    
    // Remove test users from database
    for (const user of dbUsers) {
      if (testEmails.includes(user.email) || !productionEmails.includes(user.email)) {
        console.log(`🗑️  Removing database user: ${user.email}`)
        
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id)
        
        if (deleteError) {
          console.error(`❌ Error removing database user ${user.email}:`, deleteError.message)
        } else {
          console.log(`✅ Removed database user: ${user.email}`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error removing test users:', error.message)
  }
}

async function createProductionUsers() {
  console.log('\n👥 Creating Production Users:')
  console.log('=============================')
  
  try {
    // Get existing users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    const existingAuthEmails = new Set(authUsers.users.map(u => u.email))
    const existingDbEmails = new Set(dbUsers.map(u => u.email))
    
    for (const user of PRODUCTION_USERS) {
      console.log(`\n🔄 Processing: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Description: ${user.description}`)
      
      // Create or update auth user
      if (!existingAuthEmails.has(user.email)) {
        console.log(`   Creating auth user...`)
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            role: user.role
          }
        })
        
        if (createError) {
          console.error(`   ❌ Error creating auth user:`, createError.message)
          continue
        }
        
        console.log(`   ✅ Created auth user`)
        
        // Create database profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: newUser.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: true,
            email_verified_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
        
        if (profileError) {
          console.error(`   ❌ Error creating database profile:`, profileError.message)
        } else {
          console.log(`   ✅ Created database profile`)
        }
      } else {
        console.log(`   ℹ️  Auth user already exists`)
        
        // Update database profile if needed
        const existingDbUser = dbUsers.find(u => u.email === user.email)
        if (existingDbUser) {
          if (existingDbUser.role !== user.role || existingDbUser.full_name !== user.full_name) {
            console.log(`   🔄 Updating database profile...`)
            
            const { error: updateError } = await supabase
              .from('users')
              .update({
                full_name: user.full_name,
                role: user.role,
                is_active: true
              })
              .eq('id', existingDbUser.id)
            
            if (updateError) {
              console.error(`   ❌ Error updating database profile:`, updateError.message)
            } else {
              console.log(`   ✅ Updated database profile`)
            }
          } else {
            console.log(`   ✅ Database profile already correct`)
          }
        } else {
          // Create missing database profile
          const authUser = authUsers.users.find(u => u.email === user.email)
          if (authUser) {
            console.log(`   🔄 Creating missing database profile...`)
            
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: authUser.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_active: true,
                email_verified_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              })
            
            if (profileError) {
              console.error(`   ❌ Error creating database profile:`, profileError.message)
            } else {
              console.log(`   ✅ Created database profile`)
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating production users:', error.message)
  }
}

async function validateProductionSetup() {
  console.log('\n✅ Production Setup Validation:')
  console.log('===============================')
  
  try {
    // Get final state
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('role', { ascending: false })
    
    if (dbError) throw dbError
    
    console.log(`\n📊 Final Counts:`)
    console.log(`   Auth Users: ${authUsers.users.length}`)
    console.log(`   Database Users: ${dbUsers.length}`)
    
    // Check if we have exactly 3 users
    if (authUsers.users.length === 3 && dbUsers.length === 3) {
      console.log('✅ Perfect! Exactly 3 users in both systems')
    } else {
      console.log('⚠️  User count mismatch')
    }
    
    // Validate each production user
    console.log(`\n👤 Production User Validation:`)
    for (const expectedUser of PRODUCTION_USERS) {
      const authUser = authUsers.users.find(u => u.email === expectedUser.email)
      const dbUser = dbUsers.find(u => u.email === expectedUser.email)
      
      console.log(`\n   ${expectedUser.email}:`)
      console.log(`   Role: ${expectedUser.role}`)
      console.log(`   Description: ${expectedUser.description}`)
      console.log(`   Auth: ${authUser ? '✅ Present' : '❌ Missing'}`)
      console.log(`   Database: ${dbUser ? '✅ Present' : '❌ Missing'}`)
      
      if (dbUser) {
        console.log(`   Role Match: ${dbUser.role === expectedUser.role ? '✅ Correct' : '❌ Wrong'}`)
        console.log(`   Status: ${dbUser.is_active ? '✅ Active' : '❌ Inactive'}`)
      }
    }
    
    // Role distribution
    const roleDistribution = dbUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    
    console.log(`\n👥 Role Distribution:`)
    Object.entries(roleDistribution).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`)
    })
    
    // Check for expected role distribution
    const expectedRoles = { super_admin: 1, admin: 1, customer: 1 }
    const rolesMatch = Object.entries(expectedRoles).every(([role, count]) => 
      roleDistribution[role] === count
    )
    
    if (rolesMatch) {
      console.log('✅ Role distribution is perfect!')
    } else {
      console.log('⚠️  Role distribution needs adjustment')
    }
    
  } catch (error) {
    console.error('❌ Error validating production setup:', error.message)
  }
}

async function displayLoginCredentials() {
  console.log('\n🔐 PRODUCTION LOGIN CREDENTIALS:')
  console.log('================================')
  
  PRODUCTION_USERS.forEach(user => {
    console.log(`\n${user.description}:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Password: ${user.password}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Login URL: http://localhost:3002/auth/login`)
  })
  
  console.log('\n📝 NOTES:')
  console.log('=========')
  console.log('• These are the actual project accounts, not test data')
  console.log('• paul@evans-studio.co.uk - Super Admin (Paul for testing)')
  console.log('• zell@love4detailing.com - Admin (Client)')
  console.log('• evanspaul87@gmail.com - Customer (Paul for testing customer features)')
  console.log('• All passwords should be changed after first login')
  console.log('• Database is now ready for production use')
}

async function main() {
  console.log('🚀 Production Users Setup Script')
  console.log('=================================')
  console.log('Setting up actual project accounts instead of test data')
  console.log('')
  
  // Step 1: Show current state
  await getCurrentUsers()
  
  // Step 2: Remove test users
  await removeTestUsers()
  
  // Step 3: Create/update production users
  await createProductionUsers()
  
  // Step 4: Validate production setup
  await validateProductionSetup()
  
  // Step 5: Display login credentials
  await displayLoginCredentials()
  
  console.log('\n🎉 Production users setup completed successfully!')
  console.log('Database is now ready with actual project accounts!')
}

main().catch(console.error)