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

async function testEmailSignup() {
  console.log('🧪 Testing email signup...');
  
  // Test with a temporary email
  const testEmail = `test+${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('📧 Testing signup with:', testEmail);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'https://love4detailingv2.vercel.app/auth/callback?next=/dashboard',
      },
    });
    
    console.log('✅ Signup response:', {
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        confirmation_sent_at: data.user.confirmation_sent_at,
      } : null,
      session: data.session ? 'Session exists' : 'No session',
      error: error?.message || 'No error'
    });
    
    if (error) {
      console.error('❌ Signup error:', error);
    } else if (data.user && !data.user.email_confirmed_at) {
      console.log('📬 User created, confirmation email should be sent');
      console.log('📍 Email confirmation status:', {
        confirmation_sent_at: data.user.confirmation_sent_at,
        email_confirmed_at: data.user.email_confirmed_at,
      });
    } else if (data.user && data.user.email_confirmed_at) {
      console.log('✅ User created and email already confirmed');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

async function checkAuthSettings() {
  console.log('🔍 Checking auth settings...');
  
  try {
    // Try to get current session to verify connection
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection error:', error);
    } else {
      console.log('✅ Supabase connection working');
      console.log('📊 Current session:', session ? 'Active session' : 'No session');
    }
    
  } catch (error) {
    console.error('💥 Connection test failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting email signup test...');
  
  await checkAuthSettings();
  await testEmailSignup();
  
  console.log('✅ Test completed');
}

main().catch(console.error);