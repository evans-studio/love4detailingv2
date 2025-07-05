import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const ADMIN_EMAIL = 'zell@love4detailing.com';
const ADMIN_PASSWORD = 'Love4Detailing2025!'; // Default password - admin should change this

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupAdminAccount() {
  console.log('🔧 Setting up admin account...');

  try {
    // Check if admin user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (existingUser) {
      console.log('✅ Admin user already exists:', ADMIN_EMAIL);
      
      // Ensure they have admin role
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('email', ADMIN_EMAIL);

      if (updateError) {
        console.error('❌ Failed to update admin role:', updateError);
        return false;
      }

      console.log('✅ Admin role confirmed for:', ADMIN_EMAIL);
      return true;
    }

    // Check if auth user exists, if not create it
    console.log('📧 Checking/creating admin auth account...');
    let authUserId: string;

    // Try to get existing auth user first
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers.users?.find(u => u.email === ADMIN_EMAIL);

    if (existingAuthUser) {
      console.log('✅ Admin auth account already exists:', existingAuthUser.id);
      authUserId = existingAuthUser.id;
    } else {
      // Create new admin user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Zell Admin',
          role: 'admin'
        }
      });

      if (authError) {
        console.error('❌ Failed to create admin auth user:', authError);
        return false;
      }

      if (!authUser.user) {
        console.error('❌ No user returned from auth creation');
        return false;
      }

      console.log('✅ Admin auth account created:', authUser.user.id);
      authUserId = authUser.user.id;
    }

    // Create admin user profile
    console.log('👤 Creating admin user profile...');
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        email: ADMIN_EMAIL,
        full_name: 'Zell Admin',
        phone: '+44 0000 000000',
        role: 'admin'
      });

    if (profileError) {
      console.error('❌ Failed to create admin profile:', profileError);
      return false;
    }

    console.log('✅ Admin user profile created');

    // Initialize admin rewards (optional)
    try {
      const { error: rewardsError } = await supabase
        .from('rewards')
        .insert({
          user_id: authUserId,
          points: 0,
          lifetime_points: 0,
          tier: 'bronze'
        });

      if (rewardsError) {
        console.log('⚠️  Could not create admin rewards (may already exist)');
      } else {
        console.log('✅ Admin rewards initialized');
      }
    } catch (rewardsErr) {
      console.log('⚠️  Rewards initialization skipped');
    }

    console.log('\n🎉 Admin account setup complete!');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Password:', ADMIN_PASSWORD);
    console.log('🚨 IMPORTANT: Change the default password after first login!');
    console.log('🔗 Admin Dashboard: http://localhost:3000/admin');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error setting up admin:', error);
    return false;
  }
}

// Run the setup
setupAdminAccount()
  .then(success => {
    if (success) {
      console.log('\n✅ Admin setup completed successfully');
      process.exit(0);
    } else {
      console.error('\n❌ Admin setup failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Setup script error:', error);
    process.exit(1);
  });