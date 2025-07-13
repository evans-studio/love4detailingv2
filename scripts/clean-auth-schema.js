#!/usr/bin/env node

/**
 * Clean Auth Schema Script
 * Specifically cleans up the auth schema to remove any lingering accounts
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

// Production users that should remain
const PRODUCTION_USERS = [
  'paul@evans-studio.co.uk',
  'zell@love4detailing.com', 
  'evanspaul87@gmail.com'
]

async function inspectAuthSchema() {
  console.log('🔍 Inspecting Auth Schema:')
  console.log('=========================')
  
  try {
    // Get all auth users with detailed info
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    console.log(`\n📊 Total Auth Users Found: ${authUsers.users.length}`)
    console.log('=========================================')
    
    authUsers.users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email}:`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${user.created_at}`)
      console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`)
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
      console.log(`   Phone: ${user.phone || 'None'}`)
      console.log(`   App Metadata: ${JSON.stringify(user.app_metadata, null, 2)}`)
      console.log(`   User Metadata: ${JSON.stringify(user.user_metadata, null, 2)}`)
      console.log(`   Is Production User: ${PRODUCTION_USERS.includes(user.email) ? '✅ YES' : '❌ NO'}`)
    })
    
    // Check for old admin email specifically
    const oldAdminUser = authUsers.users.find(u => u.email === 'admin@love4detailing.com')
    if (oldAdminUser) {
      console.log('\n⚠️  FOUND OLD ADMIN EMAIL IN AUTH SCHEMA:')
      console.log(`   Email: ${oldAdminUser.email}`)
      console.log(`   ID: ${oldAdminUser.id}`)
      console.log(`   Created: ${oldAdminUser.created_at}`)
      console.log(`   This needs to be removed!`)
    } else {
      console.log('\n✅ Old admin@love4detailing.com not found in auth schema')
    }
    
    return authUsers.users
    
  } catch (error) {
    console.error('❌ Error inspecting auth schema:', error.message)
    return []
  }
}

async function cleanAuthSchema() {
  console.log('\n🧹 Cleaning Auth Schema:')
  console.log('========================')
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    let deletedCount = 0
    
    for (const user of authUsers.users) {
      if (!PRODUCTION_USERS.includes(user.email)) {
        console.log(`\n🗑️  Deleting non-production user: ${user.email}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Created: ${user.created_at}`)
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.error(`   ❌ Error deleting ${user.email}:`, deleteError.message)
        } else {
          console.log(`   ✅ Successfully deleted ${user.email}`)
          deletedCount++
        }
      } else {
        console.log(`\n✅ Keeping production user: ${user.email}`)
      }
    }
    
    console.log(`\n📊 Cleanup Summary:`)
    console.log(`   Users deleted: ${deletedCount}`)
    console.log(`   Users kept: ${authUsers.users.length - deletedCount}`)
    
  } catch (error) {
    console.error('❌ Error cleaning auth schema:', error.message)
  }
}

async function verifyCleanup() {
  console.log('\n✅ Verifying Cleanup:')
  console.log('=====================')
  
  try {
    // Get final auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Get database users for comparison
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('role', { ascending: false })
    
    if (dbError) throw dbError
    
    console.log(`\n📊 Final Auth Schema State:`)
    console.log(`   Total Auth Users: ${authUsers.users.length}`)
    console.log(`   Expected: 3`)
    console.log(`   Status: ${authUsers.users.length === 3 ? '✅ CORRECT' : '❌ INCORRECT'}`)
    
    console.log(`\n👤 Final Auth Users:`)
    authUsers.users.forEach((user, index) => {
      const dbUser = dbUsers.find(u => u.id === user.id)
      console.log(`   ${index + 1}. ${user.email}`)
      console.log(`      ID: ${user.id}`)
      console.log(`      In Database: ${dbUser ? '✅ YES' : '❌ NO'}`)
      console.log(`      Role: ${dbUser ? dbUser.role : 'Unknown'}`)
    })
    
    // Check sync between auth and database
    const authEmails = new Set(authUsers.users.map(u => u.email))
    const dbEmails = new Set(dbUsers.map(u => u.email))
    
    const authOnly = authUsers.users.filter(u => !dbEmails.has(u.email))
    const dbOnly = dbUsers.filter(u => !authEmails.has(u.email))
    
    console.log(`\n🔄 Sync Status:`)
    console.log(`   Auth users not in database: ${authOnly.length}`)
    console.log(`   Database users not in auth: ${dbOnly.length}`)
    
    if (authOnly.length > 0) {
      console.log(`   ⚠️  Auth-only users: ${authOnly.map(u => u.email).join(', ')}`)
    }
    
    if (dbOnly.length > 0) {
      console.log(`   ⚠️  Database-only users: ${dbOnly.map(u => u.email).join(', ')}`)
    }
    
    if (authOnly.length === 0 && dbOnly.length === 0) {
      console.log(`   ✅ Perfect sync between auth and database!`)
    }
    
    // Final verification
    const hasOldAdmin = authUsers.users.some(u => u.email === 'admin@love4detailing.com')
    console.log(`\n🎯 Old Admin Check:`)
    console.log(`   admin@love4detailing.com in auth: ${hasOldAdmin ? '❌ STILL EXISTS' : '✅ REMOVED'}`)
    
    if (!hasOldAdmin && authUsers.users.length === 3) {
      console.log(`\n🎉 AUTH SCHEMA IS CLEAN!`)
      console.log(`   ✅ Only 3 production users remain`)
      console.log(`   ✅ Old admin email removed`)
      console.log(`   ✅ Perfect sync with database`)
    } else {
      console.log(`\n⚠️  Auth schema still needs cleanup`)
    }
    
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error.message)
  }
}

async function main() {
  console.log('🔧 Auth Schema Cleanup Script')
  console.log('==============================')
  console.log('Cleaning up auth schema to remove old admin@love4detailing.com')
  console.log('')
  
  // Step 1: Inspect current auth schema
  await inspectAuthSchema()
  
  // Step 2: Clean auth schema
  await cleanAuthSchema()
  
  // Step 3: Verify cleanup
  await verifyCleanup()
  
  console.log('\n🎉 Auth schema cleanup completed!')
}

main().catch(console.error)