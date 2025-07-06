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

async function testEmailSignupWithReal() {
  console.log('🧪 Testing email signup with real email...');
  
  // Test with the actual admin email
  const testEmail = 'zell@love4detailing.com';
  const testPassword = 'TestPassword123!';
  
  console.log('📧 Testing signup with:', testEmail);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'https://love4detailingv2.vercel.app/auth/callback?next=/dashboard',
        data: {
          first_name: 'Zell',
          last_name: 'Love4Detailing',
        }
      },
    });
    
    console.log('✅ Signup response:', {
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        confirmation_sent_at: data.user.confirmation_sent_at,
        created_at: data.user.created_at,
        user_metadata: data.user.user_metadata,
      } : null,
      session: data.session ? 'Session exists' : 'No session',
      error: error?.message || 'No error'
    });
    
    if (error) {
      console.error('❌ Signup error:', error);
      
      // Check if user already exists
      if (error.message.includes('User already registered')) {
        console.log('🔄 User already exists, trying to resend confirmation...');
        
        const { data: resendData, error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: testEmail,
          options: {
            emailRedirectTo: 'https://love4detailingv2.vercel.app/auth/callback?next=/dashboard',
          }
        });
        
        if (resendError) {
          console.error('❌ Resend error:', resendError);
        } else {
          console.log('✅ Resend successful:', resendData);
        }
      }
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

async function checkExistingUser() {
  console.log('🔍 Checking existing user...');
  
  try {
    // Check if user exists in auth.users
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('ℹ️  No current session:', error.message);
    } else {
      console.log('✅ Current user:', user ? {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        confirmation_sent_at: user.confirmation_sent_at,
      } : 'No user');
    }
    
  } catch (error) {
    console.error('💥 Error checking user:', error);
  }
}

async function main() {
  console.log('🚀 Starting detailed email test...');
  console.log('🌍 Environment:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
  
  await checkExistingUser();
  await testEmailSignupWithReal();
  
  console.log('✅ Test completed');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Check your email inbox and spam folder');
  console.log('2. Verify Supabase dashboard > Authentication > Settings');
  console.log('3. Check Authentication > URL Configuration');
  console.log('4. Verify email templates are configured');
}

main().catch(console.error);