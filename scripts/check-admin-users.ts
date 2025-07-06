#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAdminUsers() {
  console.log('🔍 Checking admin users...');

  try {
    // Check auth users
    console.log('\n📋 Checking auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Failed to list auth users:', authError.message);
      return;
    }

    console.log(`Found ${authUsers.users.length} auth users:`);
    authUsers.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Metadata: ${JSON.stringify(user.user_metadata)}`);
    });

    // Check database users
    console.log('\n🗄️ Checking database users...');
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (dbError) {
      console.error('❌ Failed to get database users:', dbError.message);
      return;
    }

    console.log(`Found ${dbUsers.length} database users:`);
    dbUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (Role: ${user.role})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Created: ${user.created_at}`);
    });

    // Check specifically for admin email
    const adminEmail = 'zell@love4detailing.com';
    console.log(`\n🔍 Checking specifically for ${adminEmail}...`);
    
    const adminAuthUser = authUsers.users.find(u => u.email === adminEmail);
    const adminDbUser = dbUsers.find(u => u.email === adminEmail);
    
    if (adminAuthUser) {
      console.log('✅ Admin auth user found:');
      console.log(`   ID: ${adminAuthUser.id}`);
      console.log(`   Confirmed: ${adminAuthUser.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Last sign in: ${adminAuthUser.last_sign_in_at || 'Never'}`);
    } else {
      console.log('❌ Admin auth user NOT found');
    }
    
    if (adminDbUser) {
      console.log('✅ Admin database user found:');
      console.log(`   Role: ${adminDbUser.role}`);
      console.log(`   Name: ${adminDbUser.first_name} ${adminDbUser.last_name}`);
    } else {
      console.log('❌ Admin database user NOT found');
    }

    // If admin auth user exists, try to update password
    if (adminAuthUser) {
      console.log('\n🔑 Updating admin password...');
      const newPassword = 'Love4Detailing2025!';
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        adminAuthUser.id,
        { 
          password: newPassword,
          email_confirm: true 
        }
      );
      
      if (updateError) {
        console.error('❌ Failed to update password:', updateError.message);
      } else {
        console.log('✅ Admin password updated successfully');
        console.log(`🔑 New password: ${newPassword}`);
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the check
checkAdminUsers()
  .then(() => {
    console.log('\n✅ Admin user check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });