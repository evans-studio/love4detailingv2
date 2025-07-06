import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSupabaseConfig() {
  console.log('🔍 Checking Supabase Configuration...\n');
  
  // Check environment variables
  console.log('📧 Environment Variables:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
  
  console.log('\n🔧 Required Supabase Dashboard Settings:');
  console.log('1. Go to: https://supabase.com/dashboard/project/lczzvvnspsuacshfawpe/settings/general');
  console.log('2. Set Site URL to: https://love4detailingv2.vercel.app');
  console.log('3. Set Additional redirect URLs to: https://love4detailingv2.vercel.app/auth/callback');
  
  console.log('\n📧 Auth Settings:');
  console.log('1. Go to: https://supabase.com/dashboard/project/lczzvvnspsuacshfawpe/auth/settings');
  console.log('2. Add redirect URLs:');
  console.log('   - https://love4detailingv2.vercel.app/auth/callback');
  console.log('   - https://love4detailingv2.vercel.app/auth/update-password');
  console.log('   - https://love4detailingv2.vercel.app/auth/setup-password');
  console.log('3. Remove any localhost URLs');
  
  console.log('\n📧 Email Templates:');
  console.log('1. Go to: https://supabase.com/dashboard/project/lczzvvnspsuacshfawpe/auth/templates');
  console.log('2. Update ALL templates to use: https://love4detailingv2.vercel.app');
  console.log('3. Templates to check:');
  console.log('   - Confirm signup');
  console.log('   - Magic Link');
  console.log('   - Reset Password');
  console.log('   - Invite User');
  
  // Test auth functionality
  console.log('\n🧪 Testing Auth Configuration...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Auth test failed:', error.message);
    } else {
      console.log('✅ Auth connection successful');
      console.log(`📊 Found ${data.users.length} users in database`);
    }
  } catch (error) {
    console.error('❌ Auth test error:', error);
  }
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('After updating Supabase dashboard settings, test:');
  console.log('1. Password reset from: https://love4detailingv2.vercel.app/auth/reset-password');
  console.log('2. New user signup');
  console.log('3. Magic link authentication');
}

checkSupabaseConfig().catch(console.error);