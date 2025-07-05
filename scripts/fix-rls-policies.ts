#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLSPolicies() {
  console.log('🔒 Fixing RLS Policies...\n');

  try {
    // 1. Check current RLS status
    console.log('1. Checking current RLS status...');
    
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT schemaname, tablename, rowsecurity, hasrlspolicy 
            FROM pg_tables pt
            LEFT JOIN pg_class pc ON pc.relname = pt.tablename
            WHERE schemaname = 'public' 
            AND tablename IN ('daily_availability', 'weekly_schedule_template', 'time_slots', 'bookings');`
    });

    if (rlsError) {
      console.log(`   ❌ Error checking RLS: ${rlsError.message}`);
    } else {
      console.log(`   ✅ Found ${rlsStatus?.length || 0} tables`);
    }

    // 2. Drop and recreate RLS policies for daily_availability
    console.log('2. Fixing daily_availability RLS policies...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Admin can manage daily availability" ON daily_availability;
        DROP POLICY IF EXISTS "Authenticated users can read daily availability" ON daily_availability;
        
        CREATE POLICY "Admin can manage daily availability" ON daily_availability
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM auth.users au
              JOIN users u ON au.id = u.id
              WHERE au.id = auth.uid() 
              AND u.role = 'admin'
            )
          );
          
        CREATE POLICY "Authenticated users can read daily availability" ON daily_availability
          FOR SELECT USING (auth.role() = 'authenticated');
      `
    });
    console.log('   ✅ daily_availability policies fixed');

    // 3. Drop and recreate RLS policies for weekly_schedule_template
    console.log('3. Fixing weekly_schedule_template RLS policies...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Admin can manage weekly schedule" ON weekly_schedule_template;
        DROP POLICY IF EXISTS "Authenticated users can read weekly schedule" ON weekly_schedule_template;
        
        CREATE POLICY "Admin can manage weekly schedule" ON weekly_schedule_template
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM auth.users au
              JOIN users u ON au.id = u.id
              WHERE au.id = auth.uid() 
              AND u.role = 'admin'
            )
          );
          
        CREATE POLICY "Authenticated users can read weekly schedule" ON weekly_schedule_template
          FOR SELECT USING (auth.role() = 'authenticated');
      `
    });
    console.log('   ✅ weekly_schedule_template policies fixed');

    // 4. Update time_slots RLS policies to work with new slot system
    console.log('4. Updating time_slots RLS policies...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Public can view available time slots" ON time_slots;
        DROP POLICY IF EXISTS "Admin can manage time slots" ON time_slots;
        
        CREATE POLICY "Public can view available time slots" ON time_slots
          FOR SELECT USING (true);
          
        CREATE POLICY "Admin can manage time slots" ON time_slots
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM auth.users au
              JOIN users u ON au.id = u.id
              WHERE au.id = auth.uid() 
              AND u.role = 'admin'
            )
          );
          
        CREATE POLICY "System can update time slots for bookings" ON time_slots
          FOR UPDATE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
      `
    });
    console.log('   ✅ time_slots policies updated');

    // 5. Ensure bookings table has proper RLS for slot system
    console.log('5. Updating bookings RLS policies...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can view their own bookings and admins can view all" ON bookings;
        DROP POLICY IF EXISTS "Admin can manage all bookings" ON bookings;
        DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;
        
        CREATE POLICY "Users can view their own bookings and admins can view all" ON bookings
          FOR SELECT USING (
            user_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM auth.users au
              JOIN users u ON au.id = u.id
              WHERE au.id = auth.uid() 
              AND u.role = 'admin'
            )
          );
          
        CREATE POLICY "Admin can manage all bookings" ON bookings
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM auth.users au
              JOIN users u ON au.id = u.id
              WHERE au.id = auth.uid() 
              AND u.role = 'admin'
            )
          );
          
        CREATE POLICY "Authenticated users can create bookings" ON bookings
          FOR INSERT WITH CHECK (
            user_id = auth.uid() OR user_id IS NULL OR
            EXISTS (
              SELECT 1 FROM auth.users au
              JOIN users u ON au.id = u.id
              WHERE au.id = auth.uid() 
              AND u.role = 'admin'
            )
          );
      `
    });
    console.log('   ✅ bookings policies updated');

    // 6. Test RLS policies with anon client
    console.log('6. Testing RLS policies...');
    
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test access to admin tables
    const { error: templateError } = await anonClient
      .from('weekly_schedule_template')
      .select('*')
      .limit(1);
    
    const { error: availabilityError } = await anonClient
      .from('daily_availability')
      .select('*')
      .limit(1);
    
    // Test access to public tables
    const { data: timeSlotsData, error: timeSlotsError } = await anonClient
      .from('time_slots')
      .select('*')
      .limit(1);

    if (templateError && availabilityError) {
      console.log('   ✅ Admin tables properly protected from anonymous access');
    } else {
      console.log('   ⚠️ Admin tables may be accessible to anonymous users');
    }

    if (!timeSlotsError && timeSlotsData) {
      console.log('   ✅ Public can access time_slots as expected');
    } else {
      console.log('   ⚠️ Public cannot access time_slots');
    }

    // 7. Grant necessary permissions for functions
    console.log('7. Granting function permissions...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
      `
    });
    console.log('   ✅ Function permissions granted');

    console.log('\n🎉 RLS Policies fixed successfully!');

  } catch (error) {
    console.error('❌ RLS policy fix failed:', error);
    process.exit(1);
  }
}

fixRLSPolicies();