import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  console.log('URL:', supabaseUrl ? 'Present' : 'Missing');
  console.log('Service Role Key:', supabaseServiceRoleKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testUserCreation() {
  console.log('🧪 Testing user creation...');
  
  const testEmail = `test-booking-${Date.now()}@example.com`;
  const testName = 'Test User';
  
  console.log('📧 Creating user with email:', testEmail);
  
  try {
    // Test the exact same call as in the booking API
    const { data: authUser, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        phone: '07123456789',
      }
    });

    console.log('✅ Auth user creation result:', {
      success: !authError,
      userId: authUser?.user?.id,
      email: authUser?.user?.email,
      error: authError?.message || 'No error'
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return;
    }

    // Test user profile creation
    console.log('👤 Creating user profile...');
    
    const { data: profileData, error: profileError } = await supabaseServiceRole
      .from('users')
      .insert({
        id: authUser.user.id,
        email: testEmail,
        full_name: testName,
        phone: '07123456789',
        role: 'customer',
      })
      .select()
      .single();

    console.log('✅ Profile creation result:', {
      success: !profileError,
      profileId: profileData?.id,
      error: profileError?.message || 'No error'
    });

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError);
      
      // Clean up auth user if profile creation failed
      console.log('🧹 Cleaning up auth user...');
      await supabaseServiceRole.auth.admin.deleteUser(authUser.user.id);
      return;
    }

    console.log('✅ User creation successful!');
    
    // Clean up test user
    console.log('🧹 Cleaning up test user...');
    await supabaseServiceRole.from('users').delete().eq('id', authUser.user.id);
    await supabaseServiceRole.auth.admin.deleteUser(authUser.user.id);
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

async function checkServiceRolePermissions() {
  console.log('🔍 Checking service role permissions...');
  
  try {
    // Test basic auth access
    const { data: { users }, error: usersError } = await supabaseServiceRole.auth.admin.listUsers();
    
    console.log('📊 Service role auth access:', {
      canListUsers: !usersError,
      userCount: users?.length || 0,
      error: usersError?.message || 'No error'
    });

    // Test database access
    const { data: dbTest, error: dbError } = await supabaseServiceRole
      .from('users')
      .select('count(*)')
      .limit(1);

    console.log('📊 Service role database access:', {
      canQueryUsers: !dbError,
      error: dbError?.message || 'No error'
    });

  } catch (error) {
    console.error('💥 Permission check error:', error);
  }
}

async function main() {
  console.log('🚀 Starting user creation test...');
  console.log('🌍 Environment:', {
    url: supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
  });
  
  await checkServiceRolePermissions();
  await testUserCreation();
  
  console.log('✅ Test completed');
}

main().catch(console.error);