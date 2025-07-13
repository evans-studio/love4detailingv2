#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createRoleColumn() {
  console.log('🔧 Manually creating role column...');
  
  try {
    console.log('1. Creating user_role enum type...');
    
    // Create enum type
    const { error: enumError } = await supabaseAdmin.rpc('sql', {
      query: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('customer', 'admin', 'staff', 'super_admin');
          END IF;
        END $$;
      `
    });
    
    if (enumError) {
      console.log('❌ Error creating enum:', enumError);
    } else {
      console.log('✅ Enum type created/verified');
    }
    
    console.log('\n2. Adding role column to users table...');
    
    // Add role column
    const { error: columnError } = await supabaseAdmin.rpc('sql', {
      query: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
          ) THEN
            ALTER TABLE users ADD COLUMN role user_role DEFAULT 'customer';
          END IF;
        END $$;
      `
    });
    
    if (columnError) {
      console.log('❌ Error adding role column:', columnError);
    } else {
      console.log('✅ Role column added/verified');
    }
    
    console.log('\n3. Setting default roles for existing users...');
    
    // Update existing users
    const { error: updateError } = await supabaseAdmin.rpc('sql', {
      query: `
        UPDATE users 
        SET role = CASE 
          WHEN email IN ('admin@love4detailing.com', 'zell@love4detailing.com') THEN 'super_admin'::user_role
          ELSE 'customer'::user_role
        END
        WHERE role IS NULL;
      `
    });
    
    if (updateError) {
      console.log('❌ Error updating roles:', updateError);
    } else {
      console.log('✅ Default roles set');
    }
    
    console.log('\n4. Verifying role column...');
    
    // Test the role column
    const { data: testUsers, error: testError } = await supabaseAdmin
      .from('users')
      .select('email, role')
      .limit(3);
    
    if (testError) {
      console.log('❌ Error testing role column:', testError);
    } else {
      console.log('✅ Role column working! Sample users:');
      testUsers.forEach(user => {
        console.log(`  - ${user.email}: ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Manual fix failed with error:', error);
  }
}

// Run the manual fix
createRoleColumn();