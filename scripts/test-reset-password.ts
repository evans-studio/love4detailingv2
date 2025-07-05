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

async function testResetPassword() {
  console.log('🧪 Testing reset password functionality...\n');

  const email = 'paul@evans-studio.co.uk';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app';
  const redirectTo = `${siteUrl}/auth/callback?type=recovery`;

  console.log('📧 Testing reset password for:', email);
  console.log('🔗 Redirect URL:', redirectTo);

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      console.log('❌ Reset password failed:', error.message);
      
      // Check for specific error types
      if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
        console.log('⏰ Rate limit detected');
      } else if (error.message?.includes('Error sending') || error.message?.includes('email')) {
        console.log('📧 Email sending error detected');
      }
    } else {
      console.log('✅ Reset password email sent successfully');
      console.log('📧 Data:', data);
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }

  console.log('\n✅ Reset password test complete');
}

testResetPassword().catch(console.error);