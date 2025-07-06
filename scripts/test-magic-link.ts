import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMagicLink() {
  console.log('🪄 Testing magic link...');
  
  const testEmail = 'zell@love4detailing.com';
  
  console.log('📧 Sending magic link to:', testEmail);
  
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: 'https://love4detailingv2.vercel.app/auth/callback?next=/admin',
      }
    });
    
    console.log('✅ Magic link response:', {
      data,
      error: error?.message || 'No error'
    });
    
    if (error) {
      console.error('❌ Magic link error:', error);
    } else {
      console.log('📬 Magic link sent successfully!');
      console.log('📍 Check your email inbox for the magic link');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

async function main() {
  console.log('🚀 Starting magic link test...');
  
  await testMagicLink();
  
  console.log('✅ Test completed');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Check your email inbox for the magic link');
  console.log('2. Click the magic link to authenticate');
  console.log('3. Should redirect to admin dashboard');
}

main().catch(console.error);