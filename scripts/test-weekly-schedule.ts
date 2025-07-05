import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function testWeeklyScheduleTable() {
  console.log('Testing weekly_schedule_template table...');
  
  try {
    // Test 1: Check if table exists by querying it
    console.log('\n1. Testing table existence...');
    const { data: tableData, error: tableError } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table query failed:', tableError);
      return;
    }
    
    console.log('✅ Table exists and is queryable');
    console.log('Sample data:', tableData);
    
    // Test 2: Check full table structure
    console.log('\n2. Testing full table query...');
    const { data: allData, error: allError } = await supabase
      .from('weekly_schedule_template')
      .select('*')
      .order('day_of_week');
    
    if (allError) {
      console.error('❌ Full table query failed:', allError);
      return;
    }
    
    console.log('✅ Full table query successful');
    console.log('Records found:', allData?.length || 0);
    console.log('Data:', allData);
    
    // Test 3: Test RLS policies by trying to read without auth
    console.log('\n3. Testing RLS policies...');
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.log('⚠️  No anon key available - skipping RLS test');
      return;
    }
    const anonClient = createClient(supabaseUrl!, anonKey);
    
    const { data: anonData, error: anonError } = await anonClient
      .from('weekly_schedule_template')
      .select('*')
      .limit(1);
    
    if (anonError) {
      console.log('✅ RLS is working - anonymous access denied:', anonError.message);
    } else {
      console.log('⚠️  RLS might not be working - anonymous access allowed:', anonData);
    }
    
    // Test 4: Try to insert a test record
    console.log('\n4. Testing insert operation...');
    const { data: insertData, error: insertError } = await supabase
      .from('weekly_schedule_template')
      .upsert({
        day_of_week: 7, // Test value
        max_slots: 3,
        working_day: false,
        start_time: '10:00:00',
        end_time: '18:00:00'
      })
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Clean up test record
      await supabase
        .from('weekly_schedule_template')
        .delete()
        .eq('day_of_week', 7);
      console.log('✅ Test record cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Test the API endpoint
async function testAPIEndpoint() {
  console.log('\n\nTesting API endpoint...');
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/admin/schedule-template`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint successful:', data);
    } else {
      const errorText = await response.text();
      console.error('❌ API endpoint failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ API endpoint test failed:', error);
  }
}

async function main() {
  await testWeeklyScheduleTable();
  await testAPIEndpoint();
}

main().catch(console.error);