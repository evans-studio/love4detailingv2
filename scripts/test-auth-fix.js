#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

// Debug environment variables
console.log('Environment check:');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Environment variables not loaded. Please check .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuthentication() {
  console.log('🧪 Testing authentication fix...');
  
  try {
    // Test existing admin user login
    console.log('\n1. Testing admin login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@love4detailing.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.error('❌ Admin login failed:', authError.message);
      return;
    }
    
    if (authData.user) {
      console.log('✅ Admin login successful!');
      console.log('User ID:', authData.user.id);
      console.log('Email:', authData.user.email);
      
      // Test the handleUserLogin procedure
      console.log('\n2. Testing handleUserLogin procedure...');
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        },
        body: JSON.stringify({
          userId: authData.user.id,
          email: authData.user.email
        })
      });
      
      const loginResult = await response.json();
      
      if (response.ok) {
        console.log('✅ handleUserLogin procedure working!');
        console.log('Login result:', loginResult);
      } else {
        console.error('❌ handleUserLogin procedure failed:', loginResult);
      }
      
      // Test session validation
      console.log('\n3. Testing session validation...');
      const sessionResponse = await fetch('http://localhost:3000/api/auth/session', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`
        }
      });
      
      const sessionResult = await sessionResponse.json();
      
      if (sessionResponse.ok) {
        console.log('✅ Session validation working!');
        console.log('Session result:', sessionResult);
      } else {
        console.error('❌ Session validation failed:', sessionResult);
      }
      
      // Sign out
      await supabase.auth.signOut();
      console.log('\n✅ Test completed and signed out');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAuthentication();