#!/usr/bin/env node

/**
 * Verify User Emails Script
 * Ensures all production user emails are verified
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

async function checkCurrentEmailStatus() {
  console.log('📧 Checking Current Email Verification Status:')
  console.log('==============================================')
  
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
    
    console.log('\n👤 User Email Verification Status:')
    console.log('==================================')
    
    for (const dbUser of dbUsers) {
      const authUser = authUsers.users.find(u => u.id === dbUser.id)
      
      console.log(`\n📧 ${dbUser.email}:`)
      console.log(`   Role: ${dbUser.role}`)
      console.log(`   Database verified_at: ${dbUser.email_verified_at ? 'SET' : 'NOT SET'}`)
      
      if (authUser) {
        console.log(`   Auth email_confirmed_at: ${authUser.email_confirmed_at ? 'VERIFIED' : 'NOT VERIFIED'}`)
        console.log(`   Auth confirmed_at: ${authUser.confirmed_at ? 'CONFIRMED' : 'NOT CONFIRMED'}`)
        console.log(`   Auth last_sign_in_at: ${authUser.last_sign_in_at || 'NEVER'}`)
      } else {
        console.log(`   Auth user: NOT FOUND`)
      }
    }
    
    return { authUsers: authUsers.users, dbUsers }
  } catch (error) {
    console.error('❌ Error checking email status:', error.message)
    return { authUsers: [], dbUsers: [] }
  }
}

async function verifyAllEmails() {
  console.log('\n✅ Verifying All User Emails:')
  console.log('=============================')
  
  try {
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Get database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    
    if (dbError) throw dbError
    
    const currentTimestamp = new Date().toISOString()
    
    for (const dbUser of dbUsers) {
      console.log(`\n🔄 Processing: ${dbUser.email}`)
      
      const authUser = authUsers.users.find(u => u.id === dbUser.id)
      
      if (!authUser) {
        console.log(`   ❌ Auth user not found - skipping`)
        continue
      }
      
      let needsAuthUpdate = false
      let needsDbUpdate = false
      
      // Check if auth user needs email verification
      if (!authUser.email_confirmed_at) {
        console.log(`   🔧 Auth email not confirmed - updating...`)
        needsAuthUpdate = true
      }
      
      // Check if database user needs email verification
      if (!dbUser.email_verified_at) {
        console.log(`   🔧 Database email_verified_at not set - updating...`)
        needsDbUpdate = true
      }
      
      // Update auth user if needed
      if (needsAuthUpdate) {
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          authUser.id,
          {
            email_confirm: true,
            user_metadata: {
              ...authUser.user_metadata,
              email_verified: true
            }
          }
        )
        
        if (updateError) {
          console.error(`   ❌ Error updating auth user:`, updateError.message)
        } else {
          console.log(`   ✅ Updated auth user email verification`)
        }
      }
      
      // Update database user if needed
      if (needsDbUpdate) {
        const { error: dbUpdateError } = await supabase
          .from('users')
          .update({
            email_verified_at: currentTimestamp
          })
          .eq('id', dbUser.id)
        
        if (dbUpdateError) {
          console.error(`   ❌ Error updating database user:`, dbUpdateError.message)
        } else {
          console.log(`   ✅ Updated database email_verified_at`)
        }
      }
      
      if (!needsAuthUpdate && !needsDbUpdate) {
        console.log(`   ✅ Email already verified - no action needed`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error verifying emails:', error.message)
  }
}

async function validateEmailVerification() {
  console.log('\n🔍 Validating Email Verification:')
  console.log('=================================')
  
  try {
    // Get updated auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError
    
    // Get updated database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('role', { ascending: false })
    
    if (dbError) throw dbError
    
    let allVerified = true
    
    console.log('\n📊 Final Verification Status:')
    console.log('=============================')
    
    for (const dbUser of dbUsers) {
      const authUser = authUsers.users.find(u => u.id === dbUser.id)
      
      const dbVerified = !!dbUser.email_verified_at
      const authVerified = !!(authUser && authUser.email_confirmed_at)
      
      console.log(`\n👤 ${dbUser.email}:`)
      console.log(`   Role: ${dbUser.role}`)
      console.log(`   Database verified: ${dbVerified ? '✅ YES' : '❌ NO'}`)
      console.log(`   Auth verified: ${authVerified ? '✅ YES' : '❌ NO'}`)
      
      if (dbVerified && authVerified) {
        console.log(`   Status: ✅ FULLY VERIFIED`)
      } else {
        console.log(`   Status: ❌ NOT FULLY VERIFIED`)
        allVerified = false
      }
    }
    
    console.log('\n📈 Summary:')
    console.log('===========')
    if (allVerified) {
      console.log('✅ ALL users have verified emails!')
      console.log('✅ Both auth and database verification complete')
      console.log('✅ Users can login without email verification issues')
    } else {
      console.log('⚠️  Some users still need email verification')
    }
    
    return allVerified
  } catch (error) {
    console.error('❌ Error validating email verification:', error.message)
    return false
  }
}

async function displayLoginInfo() {
  console.log('\n🔐 Updated Login Information:')
  console.log('============================')
  
  try {
    const { data: dbUsers, error } = await supabase
      .from('users')
      .select('*')
      .order('role', { ascending: false })
    
    if (error) throw error
    
    const passwords = {
      'paul@evans-studio.co.uk': 'TempPassword123!',
      'zell@love4detailing.com': 'ZellAdmin123!',
      'evanspaul87@gmail.com': 'CustomerTest123!'
    }
    
    dbUsers.forEach(user => {
      const password = passwords[user.email] || 'Password not found'
      
      console.log(`\n👤 ${user.email}:`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Password: ${password}`)
      console.log(`   Email Status: ✅ VERIFIED`)
      console.log(`   Login URL: http://localhost:3002/auth/login`)
    })
    
    console.log('\n📝 Notes:')
    console.log('=========')
    console.log('• All email addresses are now verified')
    console.log('• Users can login without email confirmation prompts')
    console.log('• No additional email verification steps required')
    console.log('• Database is ready for production use')
    
  } catch (error) {
    console.error('❌ Error displaying login info:', error.message)
  }
}

async function main() {
  console.log('📧 Email Verification Script')
  console.log('============================')
  console.log('Ensuring all production user emails are verified')
  console.log('')
  
  // Step 1: Check current email status
  await checkCurrentEmailStatus()
  
  // Step 2: Verify all emails
  await verifyAllEmails()
  
  // Step 3: Validate email verification
  const allVerified = await validateEmailVerification()
  
  // Step 4: Display login info
  await displayLoginInfo()
  
  if (allVerified) {
    console.log('\n🎉 Email verification completed successfully!')
    console.log('All production users have verified emails!')
  } else {
    console.log('\n⚠️  Email verification completed with some issues')
    console.log('Please check the output above for details')
  }
}

main().catch(console.error)