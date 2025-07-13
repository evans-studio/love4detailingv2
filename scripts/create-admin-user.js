#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates the missing admin user and fixes role distribution
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

async function createAdminUser() {
  console.log('👤 Creating Admin User...')
  
  const adminUser = {
    email: 'admin@love4detailing.com',
    password: 'AdminPass123!',
    full_name: 'Admin User',
    role: 'admin'
  }
  
  try {
    // Check if user already exists
    const { data: existingAuth, error: checkError } = await supabase.auth.admin.listUsers()
    if (checkError) throw checkError
    
    const userExists = existingAuth.users.some(u => u.email === adminUser.email)
    
    if (userExists) {
      console.log('ℹ️  Admin user already exists in auth')
      return
    }
    
    console.log('🔄 Creating admin auth user...')
    
    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: adminUser.full_name,
        role: adminUser.role
      }
    })
    
    if (createError) {
      console.error('❌ Error creating admin auth user:', createError.message)
      return
    }
    
    console.log('✅ Created admin auth user')
    
    // Create database profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: newUser.user.id,
        email: adminUser.email,
        full_name: adminUser.full_name,
        role: adminUser.role,
        is_active: true,
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    
    if (profileError) {
      console.error('❌ Error creating admin database profile:', profileError.message)
    } else {
      console.log('✅ Created admin database profile')
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
  }
}

async function fixRoleDistribution() {
  console.log('\n🔧 Fixing role distribution...')
  
  try {
    // Get current users
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at')
    
    if (error) throw error
    
    console.log('📊 Current users:')
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.role}`)
    })
    
    // Expected final state:
    // 1. paul@evans-studio.co.uk - super_admin
    // 2. admin@love4detailing.com - admin  
    // 3. customer@example.com - customer
    
    // Find customer that should be admin
    const customerUser = users.find(u => u.email === 'evanspaul87@gmail.com')
    
    if (customerUser) {
      console.log('\n🔄 Converting evanspaul87@gmail.com to customer role...')
      
      // This user can remain as customer since we'll have the proper admin user
      console.log('ℹ️  evanspaul87@gmail.com will remain as customer')
    }
    
    // Verify we have the right roles
    const requiredRoles = {
      'paul@evans-studio.co.uk': 'super_admin',
      'admin@love4detailing.com': 'admin',
      'customer@example.com': 'customer'
    }
    
    let needsUpdate = false
    
    for (const [email, expectedRole] of Object.entries(requiredRoles)) {
      const user = users.find(u => u.email === email)
      if (user && user.role !== expectedRole) {
        console.log(`🔄 Updating ${email} role from ${user.role} to ${expectedRole}`)
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: expectedRole })
          .eq('id', user.id)
        
        if (updateError) {
          console.error(`❌ Error updating role for ${email}:`, updateError.message)
        } else {
          console.log(`✅ Updated role for ${email}`)
          needsUpdate = true
        }
      }
    }
    
    if (!needsUpdate) {
      console.log('✅ Role distribution is already correct')
    }
    
  } catch (error) {
    console.error('❌ Error fixing role distribution:', error.message)
  }
}

async function finalValidation() {
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
    
    console.log(`📊 Auth Users: ${authUsers.users.length}`)
    console.log(`📊 Database Users: ${dbUsers.length}`)
    
    // Check role distribution
    const roleDistribution = dbUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    
    console.log('\n👥 Role Distribution:')
    Object.entries(roleDistribution).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`)
    })
    
    // List final users
    console.log('\n👤 Final User List:')
    dbUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.role} (${user.is_active ? 'Active' : 'Inactive'})`)
    })
    
    // Check if we have the expected setup
    const hasSuper = dbUsers.some(u => u.role === 'super_admin')
    const hasAdmin = dbUsers.some(u => u.role === 'admin')
    const hasCustomer = dbUsers.some(u => u.role === 'customer')
    
    if (hasSuper && hasAdmin && hasCustomer) {
      console.log('\n🎉 Perfect! All required roles are present')
    } else {
      console.log('\n⚠️  Missing required roles')
    }
    
    console.log('\n🔗 Login Credentials:')
    console.log('  Super Admin: paul@evans-studio.co.uk / TempPassword123!')
    console.log('  Admin: admin@love4detailing.com / AdminPass123!')
    console.log('  Customer: customer@example.com / CustomerPass123!')
    
  } catch (error) {
    console.error('❌ Error in final validation:', error.message)
  }
}

async function main() {
  console.log('👤 Admin User Creation Script')
  console.log('=============================')
  
  // Step 1: Create admin user
  await createAdminUser()
  
  // Step 2: Fix role distribution
  await fixRoleDistribution()
  
  // Step 3: Final validation
  await finalValidation()
  
  console.log('\n🎉 Admin user creation completed!')
}

main().catch(console.error)