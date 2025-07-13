#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testCompleteAuthFlow() {
  console.log('🧪 Testing complete authentication flow...');
  
  try {
    // 1. Test admin user login (should exist from seed data)
    console.log('\n1. Testing admin user authentication...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@love4detailing.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.log('❌ Admin user login failed:', authError.message);
      console.log('This might be expected if admin user doesn\'t exist. Let\'s test the trigger instead.');
    } else {
      console.log('✅ Admin user login successful!');
      
      // Test if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) {
        console.log('❌ User profile not found:', profileError.message);
      } else {
        console.log('✅ User profile exists!');
        console.log('Profile:', profile);
      }
      
      await supabase.auth.signOut();
    }
    
    // 2. Test the trigger by creating a new test user
    console.log('\n2. Testing user profile auto-creation trigger...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    
    // Create user directly in auth.users using admin client to trigger our function
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (createError) {
      console.log('❌ Failed to create test user:', createError.message);
      return;
    }
    
    console.log('✅ Test user created in auth.users');
    
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if user profile was automatically created
    const { data: autoProfile, error: autoProfileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', newUser.user.id)
      .single();
    
    if (autoProfileError) {
      console.log('❌ Auto-created user profile not found:', autoProfileError.message);
    } else {
      console.log('✅ User profile auto-created by trigger!');
      console.log('Auto-created profile:', autoProfile);
    }
    
    // Check if customer rewards was also created
    const { data: rewards, error: rewardsError } = await supabaseAdmin
      .from('customer_rewards')
      .select('*')
      .eq('user_id', newUser.user.id)
      .single();
    
    if (rewardsError) {
      console.log('❌ Customer rewards not auto-created:', rewardsError.message);
    } else {
      console.log('✅ Customer rewards auto-created!');
      console.log('Rewards:', rewards);
    }
    
    // 3. Test login with the new user
    console.log('\n3. Testing login with auto-created user...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.log('❌ Login with test user failed:', loginError.message);
    } else {
      console.log('✅ Login with test user successful!');
      
      // Check if middleware queries will work
      const { data: middlewareCheck, error: middlewareError } = await supabase
        .from('users')
        .select('role')
        .eq('id', loginData.user.id)
        .single();
      
      if (middlewareError) {
        console.log('❌ Middleware user check would fail:', middlewareError.message);
      } else {
        console.log('✅ Middleware user check would succeed!');
        console.log('User role:', middlewareCheck.role);
      }
      
      await supabase.auth.signOut();
    }
    
    // Clean up test user
    console.log('\n4. Cleaning up test user...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    
    if (deleteError) {
      console.log('⚠️  Warning: Failed to delete test user:', deleteError.message);
    } else {
      console.log('✅ Test user cleaned up');
    }
    
    console.log('\n🎉 Authentication flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCompleteAuthFlow();