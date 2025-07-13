#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRoleAssignments() {
  console.log('🧪 Testing role assignments for new users...');
  
  try {
    // Test cases for different email types
    const testCases = [
      { email: 'paul@evans-studio.co.uk', expectedRole: 'super_admin', description: 'Super Admin' },
      { email: 'zell@love4detailing.com', expectedRole: 'admin', description: 'Admin' },
      { email: 'test-customer@example.com', expectedRole: 'customer', description: 'Regular Customer' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📝 Testing ${testCase.description}: ${testCase.email}`);
      
      // Create test user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: testCase.email,
        password: 'password123',
        email_confirm: true
      });
      
      if (createError) {
        console.log(`❌ Failed to create test user:`, createError.message);
        continue;
      }
      
      console.log(`✅ Auth user created: ${newUser.user.id}`);
      
      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user profile was created with correct role
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('email, role, full_name')
        .eq('id', newUser.user.id)
        .single();
      
      if (profileError) {
        console.log(`❌ Profile not found:`, profileError.message);
      } else if (profile.role === testCase.expectedRole) {
        console.log(`✅ Correct role assigned: ${profile.role}`);
        console.log(`   Profile: ${profile.full_name} (${profile.email})`);
      } else {
        console.log(`❌ Wrong role: expected ${testCase.expectedRole}, got ${profile.role}`);
      }
      
      // Check customer rewards
      const { data: rewards, error: rewardsError } = await supabaseAdmin
        .from('customer_rewards')
        .select('current_tier, total_points')
        .eq('user_id', newUser.user.id)
        .single();
      
      if (rewardsError) {
        console.log(`❌ Rewards not created:`, rewardsError.message);
      } else {
        console.log(`✅ Rewards created: ${rewards.current_tier} tier, ${rewards.total_points} points`);
      }
      
      // Clean up test user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      console.log(`🧹 Test user cleaned up`);
    }
    
    // Final verification of existing users
    console.log('\n🔍 Current user roles in database:');
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from('users')
      .select('email, role')
      .order('email');
    
    if (allUsersError) {
      console.log('❌ Error getting all users:', allUsersError);
    } else {
      allUsers.forEach(user => {
        const roleIcon = user.role === 'super_admin' ? '👑' : 
                        user.role === 'admin' ? '🔧' : '👤';
        console.log(`  ${roleIcon} ${user.email}: ${user.role}`);
      });
    }
    
    console.log('\n✅ Role assignment testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testRoleAssignments();