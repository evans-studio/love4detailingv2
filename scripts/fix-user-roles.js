#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserRoles() {
  console.log('🔧 Fixing user roles...');
  
  try {
    // Get all users without roles
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .is('role', null);
    
    if (usersError) {
      console.log('❌ Error getting users:', usersError);
      return;
    }
    
    console.log(`Found ${users.length} users without roles`);
    
    for (const user of users) {
      let role = 'customer'; // Default role
      
      // Set admin role for admin emails
      if (user.email === 'admin@love4detailing.com' || 
          user.email === 'zell@love4detailing.com') {
        role = 'super_admin';
      }
      
      console.log(`Setting role '${role}' for user: ${user.email}`);
      
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: role })
        .eq('id', user.id);
      
      if (updateError) {
        console.log(`❌ Error updating role for ${user.email}:`, updateError);
      } else {
        console.log(`✅ Updated role for ${user.email}`);
      }
    }
    
    // Verify the updates
    console.log('\n🔍 Verifying role updates...');
    const { data: updatedUsers, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('email, role')
      .order('email');
    
    if (verifyError) {
      console.log('❌ Error verifying updates:', verifyError);
    } else {
      console.log('✅ All users now have roles:');
      updatedUsers.forEach(user => {
        console.log(`  - ${user.email}: ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fix failed with error:', error);
  }
}

// Run the fix
fixUserRoles();