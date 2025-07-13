#!/usr/bin/env node

/**
 * Simple Database Cleanup Script
 * Direct approach to clean up users and validate database state
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

async function getCurrentState() {
  console.log('📊 Current Database State:')
  console.log('==========================')
  
  try {
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    console.log(`\n🔐 Auth Users (${authUsers.users.length}):`)
    authUsers.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.id})`)
    })
    
    // Get database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    console.log(`\n👥 Database Users (${dbUsers.length}):`)
    dbUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.role} (${user.id})`)
    })
    
    return { authUsers: authUsers.users, dbUsers }
  } catch (error) {
    console.error('❌ Error getting current state:', error.message)
    return { authUsers: [], dbUsers: [] }
  }
}

async function removeOrphanedDatabaseUsers() {
  console.log('\n🧹 Removing orphaned database users...')
  
  try {
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Get database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    // Find orphaned database users (exist in database but not in auth)
    const authUserIds = new Set(authUsers.users.map(u => u.id))
    const orphanedDbUsers = dbUsers.filter(u => !authUserIds.has(u.id))
    
    if (orphanedDbUsers.length > 0) {
      console.log(`⚠️  Found ${orphanedDbUsers.length} orphaned database users:`)
      orphanedDbUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`)
      })
      
      // Remove orphaned users
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', orphanedDbUsers.map(u => u.id))
      
      if (deleteError) throw deleteError
      
      console.log(`✅ Removed ${orphanedDbUsers.length} orphaned database users`)
    } else {
      console.log('✅ No orphaned database users found')
    }
    
  } catch (error) {
    console.error('❌ Error removing orphaned database users:', error.message)
  }
}

async function createMissingDatabaseProfiles() {
  console.log('\n👤 Creating missing database profiles...')
  
  try {
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Get database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    // Find auth users without database profiles
    const dbUserIds = new Set(dbUsers.map(u => u.id))
    const authUsersWithoutDb = authUsers.users.filter(u => !dbUserIds.has(u.id))
    
    if (authUsersWithoutDb.length > 0) {
      console.log(`⚠️  Found ${authUsersWithoutDb.length} auth users without database profiles:`)
      
      for (const user of authUsersWithoutDb) {
        console.log(`  - ${user.email} (${user.id})`)
        
        // Determine role based on email
        let role = 'customer'
        if (user.email.includes('admin') || user.email === 'paul@evans-studio.co.uk') {
          role = user.email === 'paul@evans-studio.co.uk' ? 'super_admin' : 'admin'
        }
        
        // Create database profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'User',
            role: role,
            is_active: true,
            email_verified_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error(`❌ Error creating profile for ${user.email}:`, insertError.message)
        } else {
          console.log(`✅ Created database profile for ${user.email} (${role})`)
        }
      }
    } else {
      console.log('✅ All auth users have database profiles')
    }
    
  } catch (error) {
    console.error('❌ Error creating missing database profiles:', error.message)
  }
}

async function createRequiredUsers() {
  console.log('\n👥 Creating required users...')
  
  const requiredUsers = [
    {
      email: 'paul@evans-studio.co.uk',
      password: 'TempPassword123!',
      full_name: 'Paul Evans',
      role: 'super_admin'
    },
    {
      email: 'admin@love4detailing.com',
      password: 'AdminPass123!',
      full_name: 'Admin User',
      role: 'admin'
    },
    {
      email: 'customer@example.com',
      password: 'CustomerPass123!',
      full_name: 'Test Customer',
      role: 'customer'
    }
  ]
  
  try {
    // Get existing auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const existingEmails = new Set(authUsers.users.map(u => u.email))
    
    for (const user of requiredUsers) {
      if (existingEmails.has(user.email)) {
        console.log(`ℹ️  User ${user.email} already exists in auth`)
        continue
      }
      
      console.log(`🔄 Creating auth user: ${user.email}`)
      
      // Create auth user
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
        console.error(`❌ Error creating auth user ${user.email}:`, createError.message)
        continue
      }
      
      console.log(`✅ Created auth user: ${user.email}`)
      
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
        console.error(`❌ Error creating database profile for ${user.email}:`, profileError.message)
      } else {
        console.log(`✅ Created database profile: ${user.email} (${user.role})`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating required users:', error.message)
  }
}

async function validateFinalState() {
  console.log('\n✅ Final Validation:')
  console.log('====================')
  
  try {
    // Get final counts
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    console.log(`📊 Auth Users: ${authUsers.users.length}`)
    console.log(`📊 Database Users: ${dbUsers.length}`)
    
    // Check if we have exactly 3 users
    if (authUsers.users.length === 3 && dbUsers.length === 3) {
      console.log('✅ Perfect! Exactly 3 users in both auth and database')
    } else {
      console.log('⚠️  User count mismatch - expected 3 in both systems')
    }
    
    // Check role distribution
    const roleDistribution = dbUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    
    console.log('\n👥 Role Distribution:')
    Object.entries(roleDistribution).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`)
    })
    
    // Check for required roles
    const requiredRoles = ['super_admin', 'admin', 'customer']
    const hasAllRoles = requiredRoles.every(role => roleDistribution[role] >= 1)
    
    if (hasAllRoles) {
      console.log('✅ All required roles present')
    } else {
      console.log('⚠️  Missing required roles')
    }
    
    // List final users
    console.log('\n👤 Final User List:')
    dbUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.role} (${user.is_active ? 'Active' : 'Inactive'})`)
    })
    
    console.log('\n🔗 Login URLs:')
    console.log('  Super Admin: http://localhost:3002/auth/login')
    console.log('    Email: paul@evans-studio.co.uk')
    console.log('    Password: TempPassword123!')
    console.log('  Admin: http://localhost:3002/auth/login')
    console.log('    Email: admin@love4detailing.com')
    console.log('    Password: AdminPass123!')
    console.log('  Customer: http://localhost:3002/auth/login')
    console.log('    Email: customer@example.com')
    console.log('    Password: CustomerPass123!')
    
  } catch (error) {
    console.error('❌ Error in final validation:', error.message)
  }
}

async function main() {
  console.log('🗄️  Simple Database Cleanup')
  console.log('============================')
  
  // Step 1: Show current state
  await getCurrentState()
  
  // Step 2: Remove orphaned database users
  await removeOrphanedDatabaseUsers()
  
  // Step 3: Create missing database profiles
  await createMissingDatabaseProfiles()
  
  // Step 4: Create required users
  await createRequiredUsers()
  
  // Step 5: Validate final state
  await validateFinalState()
  
  console.log('\n🎉 Database cleanup completed successfully!')
}

main().catch(console.error)