#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function manualPasswordReset() {
  console.log('🔧 Manual password reset tool...\n');

  const email = 'paul@evans-studio.co.uk';
  const tempPassword = 'TempPass123!'; // User can change this after signing in

  console.log('👤 Resetting password for:', email);
  console.log('🔑 Temporary password:', tempPassword);

  try {
    // Get the user's auth ID
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ Auth user not found');
      return;
    }

    console.log('✅ Found auth user:', authUser.id);

    // Update user password directly
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: tempPassword,
      email_confirm: true
    });

    if (error) {
      console.log('❌ Failed to update password:', error.message);
    } else {
      console.log('✅ Password updated successfully!');
      console.log('\n📋 Instructions:');
      console.log('1. Go to the sign-in page');
      console.log('2. Sign in with:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${tempPassword}`);
      console.log('3. Immediately change your password in the dashboard');
      console.log('\n🔗 Sign-in URL: https://love4detailingv2.vercel.app/auth/sign-in');
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }
}

manualPasswordReset().catch(console.error);