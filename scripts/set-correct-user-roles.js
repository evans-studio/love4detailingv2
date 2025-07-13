#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setCorrectUserRoles() {
  console.log('🔧 Setting correct user roles...');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .order('email');
    
    if (usersError) {
      console.log('❌ Error getting users:', usersError);
      return;
    }
    
    console.log(`Found ${users.length} users to update:`);
    
    for (const user of users) {
      let newRole = 'customer'; // Default role
      
      // Set specific roles for admin users
      if (user.email === 'paul@evans-studio.co.uk') {
        newRole = 'super_admin';
      } else if (user.email === 'zell@love4detailing.com') {
        newRole = 'admin';
      }
      
      // Only update if role is different
      if (user.role !== newRole) {
        console.log(`Updating ${user.email}: ${user.role || 'null'} → ${newRole}`);
        
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ role: newRole })
          .eq('id', user.id);
        
        if (updateError) {
          console.log(`❌ Error updating role for ${user.email}:`, updateError);
        } else {
          console.log(`✅ Updated ${user.email} to ${newRole}`);
        }
      } else {
        console.log(`✓ ${user.email} already has correct role: ${newRole}`);
      }
    }
    
    // Verify the final roles
    console.log('\n🔍 Final user roles:');
    const { data: finalUsers, error: finalError } = await supabaseAdmin
      .from('users')
      .select('email, role')
      .order('email');
    
    if (finalError) {
      console.log('❌ Error getting final roles:', finalError);
    } else {
      finalUsers.forEach(user => {
        const roleIcon = user.role === 'super_admin' ? '👑' : 
                        user.role === 'admin' ? '🔧' : '👤';
        console.log(`  ${roleIcon} ${user.email}: ${user.role}`);
      });
    }
    
    console.log('\n✅ User roles updated successfully!');
    
  } catch (error) {
    console.error('❌ Role update failed with error:', error);
  }
}

// Run the role update
setCorrectUserRoles();