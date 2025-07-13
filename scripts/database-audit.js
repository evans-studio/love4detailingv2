#!/usr/bin/env node

/**
 * Database Audit Script
 * Checks actual database structure and provides accurate cleanup
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

async function discoverDatabaseStructure() {
  console.log('🔍 Discovering database structure...')
  
  try {
    // Get all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name')
    
    if (error) throw error
    
    console.log('📊 Found tables:')
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`)
    })
    
    return tables.map(t => t.table_name)
  } catch (error) {
    console.error('❌ Error discovering database structure:', error.message)
    return []
  }
}

async function checkTableColumns(tableName) {
  try {
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position')
    
    if (error) throw error
    
    return columns
  } catch (error) {
    console.error(`❌ Error checking columns for ${tableName}:`, error.message)
    return []
  }
}

async function auditUsersTable() {
  console.log('\n👥 Auditing users table...')
  
  try {
    // Check users table structure
    const columns = await checkTableColumns('users')
    console.log('📋 Users table columns:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })
    
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
    
    if (error) throw error
    
    console.log(`\n📊 Found ${users.length} users:`)
    users.forEach((user, index) => {
      const userIdField = user.id || user.user_id || user.uuid || 'unknown'
      console.log(`  ${index + 1}. ${user.email} - ${user.role} (ID: ${userIdField})`)
    })
    
    return users
  } catch (error) {
    console.error('❌ Error auditing users table:', error.message)
    return []
  }
}

async function auditAuthUsers() {
  console.log('\n🔐 Auditing auth users...')
  
  try {
    const { data: authUsers, error } = await supabase.auth.admin.listUsers()
    if (error) throw error
    
    console.log(`📊 Found ${authUsers.users.length} auth users:`)
    authUsers.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.id})`)
    })
    
    return authUsers.users
  } catch (error) {
    console.error('❌ Error auditing auth users:', error.message)
    return []
  }
}

async function auditDataIntegrity(availableTables) {
  console.log('\n🔗 Auditing data integrity...')
  
  // Check which tables exist
  const tableChecks = [
    'users',
    'vehicles', 
    'bookings',
    'rewards',
    'services',
    'service_pricing',
    'time_slots'
  ]
  
  for (const tableName of tableChecks) {
    if (!availableTables.includes(tableName)) {
      console.log(`⚠️  Table '${tableName}' does not exist`)
      continue
    }
    
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (error) throw error
      
      console.log(`✅ ${tableName}: ${count} records`)
    } catch (error) {
      console.log(`❌ ${tableName}: Error - ${error.message}`)
    }
  }
}

async function syncAuthWithDatabase() {
  console.log('\n🔄 Syncing auth users with database...')
  
  try {
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Get database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    // Find the correct ID field
    const userIdField = dbUsers.length > 0 ? 
      (dbUsers[0].id ? 'id' : 
       dbUsers[0].user_id ? 'user_id' : 
       dbUsers[0].uuid ? 'uuid' : null) : null
    
    if (!userIdField) {
      console.log('❌ Cannot determine user ID field in database')
      return
    }
    
    console.log(`📋 Using '${userIdField}' as user ID field`)
    
    // Find auth users not in database
    const dbUserIds = new Set(dbUsers.map(u => u[userIdField]))
    const authUsersNotInDb = authUsers.users.filter(u => !dbUserIds.has(u.id))
    
    if (authUsersNotInDb.length > 0) {
      console.log(`⚠️  Found ${authUsersNotInDb.length} auth users not in database:`)
      authUsersNotInDb.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`)
      })
    }
    
    // Find database users not in auth
    const authUserIds = new Set(authUsers.users.map(u => u.id))
    const dbUsersNotInAuth = dbUsers.filter(u => !authUserIds.has(u[userIdField]))
    
    if (dbUsersNotInAuth.length > 0) {
      console.log(`⚠️  Found ${dbUsersNotInAuth.length} database users not in auth:`)
      dbUsersNotInAuth.forEach(user => {
        console.log(`  - ${user.email} (${user[userIdField]})`)
      })
    }
    
    if (authUsersNotInDb.length === 0 && dbUsersNotInAuth.length === 0) {
      console.log('✅ Auth and database users are in sync!')
    }
    
  } catch (error) {
    console.error('❌ Error syncing auth with database:', error.message)
  }
}

async function validateUserRoles() {
  console.log('\n🔐 Validating user roles...')
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('email, role')
    
    if (error) throw error
    
    const expectedRoles = ['super_admin', 'admin', 'customer']
    const actualRoles = [...new Set(users.map(u => u.role))]
    
    console.log('📊 Role distribution:')
    expectedRoles.forEach(role => {
      const count = users.filter(u => u.role === role).length
      console.log(`  ${role}: ${count}`)
    })
    
    // Check for unexpected roles
    const unexpectedRoles = actualRoles.filter(r => !expectedRoles.includes(r))
    if (unexpectedRoles.length > 0) {
      console.log(`⚠️  Unexpected roles found: ${unexpectedRoles.join(', ')}`)
    }
    
    // Check for missing roles
    const missingRoles = expectedRoles.filter(r => !actualRoles.includes(r))
    if (missingRoles.length > 0) {
      console.log(`⚠️  Missing roles: ${missingRoles.join(', ')}`)
    }
    
    return users
  } catch (error) {
    console.error('❌ Error validating user roles:', error.message)
    return []
  }
}

async function generateCleanupRecommendations() {
  console.log('\n💡 Cleanup Recommendations:')
  
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    // Recommendations
    const recommendations = []
    
    if (authUsers.users.length !== 3) {
      recommendations.push(`🔸 Expected 3 auth users, found ${authUsers.users.length}`)
    }
    
    if (dbUsers.length !== 3) {
      recommendations.push(`🔸 Expected 3 database users, found ${dbUsers.length}`)
    }
    
    const requiredEmails = ['paul@evans-studio.co.uk', 'admin@love4detailing.com', 'customer@example.com']
    const actualEmails = authUsers.users.map(u => u.email)
    
    const missingEmails = requiredEmails.filter(e => !actualEmails.includes(e))
    if (missingEmails.length > 0) {
      recommendations.push(`🔸 Missing required users: ${missingEmails.join(', ')}`)
    }
    
    if (recommendations.length === 0) {
      console.log('✅ No cleanup recommendations - database looks good!')
    } else {
      recommendations.forEach(rec => console.log(rec))
    }
    
  } catch (error) {
    console.error('❌ Error generating recommendations:', error.message)
  }
}

async function main() {
  console.log('🔍 Database Audit & Cleanup Script')
  console.log('====================================')
  
  // Step 1: Discover database structure
  const tables = await discoverDatabaseStructure()
  
  // Step 2: Audit users table
  await auditUsersTable()
  
  // Step 3: Audit auth users
  await auditAuthUsers()
  
  // Step 4: Audit data integrity
  await auditDataIntegrity(tables)
  
  // Step 5: Sync auth with database
  await syncAuthWithDatabase()
  
  // Step 6: Validate user roles
  await validateUserRoles()
  
  // Step 7: Generate cleanup recommendations
  await generateCleanupRecommendations()
  
  console.log('\n✅ Database audit completed!')
}

main().catch(console.error)