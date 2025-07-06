#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminLogin() {
  const testEmail = 'zell@love4detailing.com';
  const testPassword = 'Love4Detailing2025!';

  console.log('🔐 Testing admin login credentials...');
  console.log(`📧 Email: ${testEmail}`);
  console.log('🔑 Password: [REDACTED]');

  try {
    // Test the login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('🔍 Error details:', error);
      return false;
    }

    if (data.user) {
      console.log('✅ Login successful!');
      console.log('👤 User ID:', data.user.id);
      console.log('📧 User email:', data.user.email);
      console.log('📋 User metadata:', data.user.user_metadata);
      
      // Check the user's role in the database
      console.log('\n🔍 Checking user role...');
      
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('❌ Failed to get user profile:', profileError.message);
      } else {
        console.log('✅ User profile found:');
        console.log('📝 Role:', userProfile.role);
        console.log('👤 Name:', userProfile.first_name, userProfile.last_name);
        console.log('📧 Email:', userProfile.email);
      }

      // Sign out
      await supabase.auth.signOut();
      console.log('\n✅ Test completed successfully');
      return true;
    } else {
      console.error('❌ No user data returned');
      return false;
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

// Run the test
testAdminLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 Admin login test PASSED');
      process.exit(0);
    } else {
      console.error('\n💥 Admin login test FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test script error:', error);
    process.exit(1);
  });