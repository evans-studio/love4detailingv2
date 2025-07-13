#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Verifies user count, roles, relationships, and cleans orphaned data
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

async function verifyUserCount() {
  console.log('📊 Verifying user count...')
  
  try {
    // Check Supabase Auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Check database users table
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    console.log(`📈 Auth users: ${authUsers.users.length}`)
    console.log(`📈 Database users: ${dbUsers.length}`)
    
    // List all users
    console.log('\n👥 Auth Users:')
    authUsers.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.id})`)
    })
    
    console.log('\n👥 Database Users:')
    dbUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.role} (${user.user_id})`)
    })
    
    return { authUsers: authUsers.users, dbUsers }
  } catch (error) {
    console.error('❌ Error verifying user count:', error.message)
    return null
  }
}

async function verifyUserRoles() {
  console.log('\n🔐 Verifying user roles...')
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, is_active')
      .order('role', { ascending: false })
    
    if (error) throw error
    
    const roleDistribution = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 Role Distribution:')
    Object.entries(roleDistribution).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`)
    })
    
    console.log('\n👤 User Details:')
    users.forEach(user => {
      console.log(`  ✅ ${user.email} - ${user.role} (${user.is_active ? 'Active' : 'Inactive'})`)
    })
    
    return users
  } catch (error) {
    console.error('❌ Error verifying user roles:', error.message)
    return null
  }
}

async function validateRelationships() {
  console.log('\n🔗 Validating relationships...')
  
  try {
    // Check vehicles table
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, user_id, registration')
    
    if (vehiclesError) throw vehiclesError
    
    // Check bookings table
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, booking_reference')
    
    if (bookingsError) throw bookingsError
    
    // Check rewards table
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('id, user_id, total_points')
    
    if (rewardsError) throw rewardsError
    
    // Get valid user IDs
    const { data: validUsers, error: usersError } = await supabase
      .from('users')
      .select('user_id')
    
    if (usersError) throw usersError
    
    const validUserIds = new Set(validUsers.map(u => u.user_id))
    
    console.log(`📊 Found ${vehicles.length} vehicles`)
    console.log(`📊 Found ${bookings.length} bookings`) 
    console.log(`📊 Found ${rewards.length} rewards`)
    console.log(`📊 Valid user IDs: ${validUserIds.size}`)
    
    // Check for orphaned vehicles
    const orphanedVehicles = vehicles.filter(v => !validUserIds.has(v.user_id))
    if (orphanedVehicles.length > 0) {
      console.log(`⚠️  Found ${orphanedVehicles.length} orphaned vehicles:`)
      orphanedVehicles.forEach(v => {
        console.log(`  - ${v.registration} (user_id: ${v.user_id})`)
      })
    }
    
    // Check for orphaned bookings
    const orphanedBookings = bookings.filter(b => !validUserIds.has(b.user_id))
    if (orphanedBookings.length > 0) {
      console.log(`⚠️  Found ${orphanedBookings.length} orphaned bookings:`)
      orphanedBookings.forEach(b => {
        console.log(`  - ${b.booking_reference} (user_id: ${b.user_id})`)
      })
    }
    
    // Check for orphaned rewards
    const orphanedRewards = rewards.filter(r => !validUserIds.has(r.user_id))
    if (orphanedRewards.length > 0) {
      console.log(`⚠️  Found ${orphanedRewards.length} orphaned rewards:`)
      orphanedRewards.forEach(r => {
        console.log(`  - Points: ${r.total_points} (user_id: ${r.user_id})`)
      })
    }
    
    return {
      vehicles,
      bookings,
      rewards,
      orphanedVehicles,
      orphanedBookings,
      orphanedRewards
    }
  } catch (error) {
    console.error('❌ Error validating relationships:', error.message)
    return null
  }
}

async function cleanOrphanedData(relationshipData) {
  console.log('\n🧹 Cleaning orphaned data...')
  
  if (!relationshipData) {
    console.log('❌ No relationship data available for cleanup')
    return
  }
  
  const { orphanedVehicles, orphanedBookings, orphanedRewards } = relationshipData
  
  try {
    // Clean orphaned vehicles
    if (orphanedVehicles.length > 0) {
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .delete()
        .in('id', orphanedVehicles.map(v => v.id))
      
      if (vehicleError) throw vehicleError
      console.log(`✅ Removed ${orphanedVehicles.length} orphaned vehicles`)
    }
    
    // Clean orphaned bookings
    if (orphanedBookings.length > 0) {
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .in('id', orphanedBookings.map(b => b.id))
      
      if (bookingError) throw bookingError
      console.log(`✅ Removed ${orphanedBookings.length} orphaned bookings`)
    }
    
    // Clean orphaned rewards
    if (orphanedRewards.length > 0) {
      const { error: rewardError } = await supabase
        .from('rewards')
        .delete()
        .in('id', orphanedRewards.map(r => r.id))
      
      if (rewardError) throw rewardError
      console.log(`✅ Removed ${orphanedRewards.length} orphaned rewards`)
    }
    
    if (orphanedVehicles.length === 0 && orphanedBookings.length === 0 && orphanedRewards.length === 0) {
      console.log('✅ No orphaned data found - database is clean!')
    }
    
  } catch (error) {
    console.error('❌ Error cleaning orphaned data:', error.message)
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
    // Get existing users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const existingEmails = new Set(authUsers.users.map(u => u.email))
    
    for (const user of requiredUsers) {
      if (existingEmails.has(user.email)) {
        console.log(`ℹ️  User ${user.email} already exists`)
        continue
      }
      
      console.log(`🔄 Creating user: ${user.email}`)
      
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
      
      if (createError) throw createError
      
      // Create database profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: newUser.user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: true,
          email_verified_at: new Date().toISOString()
        })
      
      if (profileError) throw profileError
      
      console.log(`✅ Created user: ${user.email} (${user.role})`)
    }
    
  } catch (error) {
    console.error('❌ Error creating required users:', error.message)
  }
}

async function generateDatabaseReport() {
  console.log('\n📋 Final Database Report...')
  
  try {
    // Get all table counts
    const tables = ['users', 'vehicles', 'bookings', 'rewards', 'services', 'service_pricing', 'time_slots']
    const counts = {}
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) throw error
      counts[table] = count
    }
    
    console.log('📊 Table Statistics:')
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`)
    })
    
    // Get user breakdown
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role')
    
    if (usersError) throw usersError
    
    const roleBreakdown = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    
    console.log('\n👥 User Role Breakdown:')
    Object.entries(roleBreakdown).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`)
    })
    
    // Check for expected 3 users
    const totalUsers = users.length
    if (totalUsers === 3) {
      console.log('\n✅ Database has exactly 3 users as expected!')
    } else {
      console.log(`\n⚠️  Database has ${totalUsers} users (expected 3)`)
    }
    
  } catch (error) {
    console.error('❌ Error generating database report:', error.message)
  }
}

async function main() {
  console.log('🗄️  Database Cleanup Script')
  console.log('============================')
  
  // Step 1: Verify user count
  const userCheck = await verifyUserCount()
  
  // Step 2: Verify user roles
  const roleCheck = await verifyUserRoles()
  
  // Step 3: Validate relationships
  const relationshipCheck = await validateRelationships()
  
  // Step 4: Clean orphaned data
  await cleanOrphanedData(relationshipCheck)
  
  // Step 5: Create required users if missing
  await createRequiredUsers()
  
  // Step 6: Generate final report
  await generateDatabaseReport()
  
  console.log('\n✅ Database cleanup completed!')
  console.log('🔗 Login URLs:')
  console.log('  Super Admin: http://localhost:3002/auth/login (paul@evans-studio.co.uk)')
  console.log('  Admin: http://localhost:3002/auth/login (admin@love4detailing.com)')
  console.log('  Customer: http://localhost:3002/auth/login (customer@example.com)')
}

main().catch(console.error)