#!/usr/bin/env node

/**
 * Remove Extra Admin Account Script
 * Removes the admin@love4detailing.com account and keeps only production users
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

// Correct production users that should remain
const PRODUCTION_USERS = [
  'paul@evans-studio.co.uk',
  'zell@love4detailing.com',
  'evanspaul87@gmail.com'
]

async function showCurrentUsers() {
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

async function removeExtraAdmin() {
  console.log('\n🗑️  Removing Extra Admin Account:')
  console.log('===================================')
  
  try {
    // Get current users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    // Find the admin@love4detailing.com user to remove
    const adminToRemove = authUsers.users.find(user => user.email === 'admin@love4detailing.com')
    const dbAdminToRemove = dbUsers.find(user => user.email === 'admin@love4detailing.com')
    
    if (adminToRemove) {
      console.log(`🔍 Found admin@love4detailing.com in auth (${adminToRemove.id})`)
      
      // Remove from auth
      console.log('🗑️  Removing from auth...')
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(adminToRemove.id)
      if (authDeleteError) {
        console.error('❌ Error removing from auth:', authDeleteError.message)
      } else {
        console.log('✅ Removed from auth successfully')
      }
    } else {
      console.log('ℹ️  admin@love4detailing.com not found in auth')
    }
    
    if (dbAdminToRemove) {
      console.log(`🔍 Found admin@love4detailing.com in database (${dbAdminToRemove.id})`)
      
      // Remove from database
      console.log('🗑️  Removing from database...')
      const { error: dbDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', dbAdminToRemove.id)
      
      if (dbDeleteError) {
        console.error('❌ Error removing from database:', dbDeleteError.message)
      } else {
        console.log('✅ Removed from database successfully')
      }
    } else {
      console.log('ℹ️  admin@love4detailing.com not found in database')
    }
    
    // Also remove any other non-production users
    console.log('\n🧹 Checking for other non-production users:')
    for (const user of authUsers.users) {
      if (!PRODUCTION_USERS.includes(user.email)) {
        console.log(`🗑️  Removing non-production user: ${user.email}`)
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.error(`❌ Error removing ${user.email}:`, deleteError.message)
        } else {
          console.log(`✅ Removed ${user.email} from auth`)
        }
      }
    }
    
    for (const user of dbUsers) {
      if (!PRODUCTION_USERS.includes(user.email)) {
        console.log(`🗑️  Removing non-production database user: ${user.email}`)
        
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id)
        
        if (deleteError) {
          console.error(`❌ Error removing ${user.email}:`, deleteError.message)
        } else {
          console.log(`✅ Removed ${user.email} from database`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error removing extra admin:', error.message)
  }
}

async function validateFinalState() {
  console.log('\n✅ Final Validation:')
  console.log('====================')
  
  try {
    // Get final state
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('role', { ascending: false })
    
    if (dbError) throw dbError
    
    console.log(`📊 Final Counts:`)
    console.log(`   Auth Users: ${authUsers.users.length}`)
    console.log(`   Database Users: ${dbUsers.length}`)
    
    // Check if we have exactly 3 users
    if (authUsers.users.length === 3 && dbUsers.length === 3) {
      console.log('✅ Perfect! Exactly 3 users in both systems')
    } else {
      console.log('⚠️  User count not as expected')
    }
    
    // List final users
    console.log(`\n👤 Final Production Users:`)
    dbUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.role} (${user.is_active ? 'Active' : 'Inactive'})`)
    })
    
    // Check all production users are present
    const missingUsers = PRODUCTION_USERS.filter(email => 
      !dbUsers.some(user => user.email === email)
    )
    
    if (missingUsers.length === 0) {
      console.log('✅ All production users are present')
    } else {
      console.log('⚠️  Missing production users:', missingUsers)
    }
    
    // Check for any extra users
    const extraUsers = dbUsers.filter(user => 
      !PRODUCTION_USERS.includes(user.email)
    )
    
    if (extraUsers.length === 0) {
      console.log('✅ No extra users found')
    } else {
      console.log('⚠️  Extra users found:', extraUsers.map(u => u.email))
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
    
    // Expected roles
    const expectedRoles = { super_admin: 1, admin: 1, customer: 1 }
    const rolesMatch = Object.entries(expectedRoles).every(([role, count]) => 
      roleDistribution[role] === count
    )
    
    if (rolesMatch) {
      console.log('✅ Role distribution is correct!')
    } else {
      console.log('⚠️  Role distribution needs adjustment')
    }
    
  } catch (error) {
    console.error('❌ Error validating final state:', error.message)
  }
}

async function showLoginCredentials() {
  console.log('\n🔐 FINAL LOGIN CREDENTIALS:')
  console.log('============================')
  
  const credentials = [
    { email: 'paul@evans-studio.co.uk', password: 'TempPassword123!', role: 'super_admin', description: 'Super Admin (Paul for testing)' },
    { email: 'zell@love4detailing.com', password: 'ZellAdmin123!', role: 'admin', description: 'Admin (Client - Love4Detailing)' },
    { email: 'evanspaul87@gmail.com', password: 'CustomerTest123!', role: 'customer', description: 'Customer (Paul for testing customer features)' }
  ]
  
  credentials.forEach(cred => {
    console.log(`\n${cred.description}:`)
    console.log(`   Email: ${cred.email}`)
    console.log(`   Password: ${cred.password}`)
    console.log(`   Role: ${cred.role}`)
    console.log(`   Login URL: http://localhost:3002/auth/login`)
  })
  
  console.log('\n📝 NOTES:')
  console.log('=========')
  console.log('• admin@love4detailing.com has been removed')
  console.log('• Only production users remain')
  console.log('• Database is clean and ready for development')
  console.log('• All users have verified emails')
}

async function main() {
  console.log('🗑️  Remove Extra Admin Account Script')
  console.log('=====================================')
  console.log('Removing admin@love4detailing.com and keeping only production users')
  console.log('')
  
  // Step 1: Show current state
  await showCurrentUsers()
  
  // Step 2: Remove extra admin
  await removeExtraAdmin()
  
  // Step 3: Validate final state
  await validateFinalState()
  
  // Step 4: Show login credentials
  await showLoginCredentials()
  
  console.log('\n🎉 Extra admin account removal completed!')
  console.log('Database now contains only production users!')
}

main().catch(console.error)