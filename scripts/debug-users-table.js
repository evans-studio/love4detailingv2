#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role for debugging
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUsersTable() {
  console.log('🔍 Debugging users table structure...');
  
  try {
    // Check table structure
    console.log('\n1. Checking users table columns...');
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .eq('table_schema', 'public');
    
    if (columnsError) {
      console.log('❌ Error getting table structure:', columnsError);
    } else {
      console.log('✅ Users table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Check if any users exist
    console.log('\n2. Checking existing users...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error getting users:', usersError);
    } else {
      console.log(`✅ Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`  - ${user.email} (role: ${user.role || 'undefined'}) (id: ${user.id})`);
      });
    }
    
    // Check auth.users
    console.log('\n3. Checking auth.users...');
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at')
      .limit(5);
    
    if (authError) {
      console.log('❌ Error getting auth users:', authError);
    } else {
      console.log(`✅ Found ${authUsers.length} auth users:`);
      authUsers.forEach(user => {
        console.log(`  - ${user.email} (id: ${user.id})`);
      });
    }
    
    // Check if triggers exist
    console.log('\n4. Checking triggers...');
    const { data: triggers, error: triggersError } = await supabaseAdmin
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_timing, event_manipulation')
      .eq('trigger_schema', 'auth')
      .eq('event_object_table', 'users');
    
    if (triggersError) {
      console.log('❌ Error getting triggers:', triggersError);
    } else {
      console.log(`✅ Found ${triggers.length} triggers on auth.users:`);
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed with error:', error);
  }
}

// Run the debug
debugUsersTable();