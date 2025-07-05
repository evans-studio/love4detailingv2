#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSlotSystem() {
  console.log('🚀 Setting up Slot Formula System...\n');

  try {
    // 1. Add columns to time_slots if they don't exist
    console.log('1. Updating time_slots table...');
    
    // Check if columns exist first
    const { data: columns } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'time_slots' AND column_name IN ('slot_number', 'buffer_minutes', 'is_available');`
    });

    // Add columns if they don't exist
    if (!columns || columns.length < 3) {
      await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE time_slots 
              ADD COLUMN IF NOT EXISTS slot_number INTEGER,
              ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 30,
              ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;`
      });
      console.log('   ✅ Added columns to time_slots');
    } else {
      console.log('   ✅ time_slots columns already exist');
    }

    // 2. Create weekly_schedule_template table
    console.log('2. Creating weekly_schedule_template table...');
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS weekly_schedule_template (
              id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
              day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
              max_slots INTEGER DEFAULT 5 CHECK (max_slots >= 0 AND max_slots <= 5),
              working_day BOOLEAN DEFAULT true,
              start_time TIME DEFAULT '10:00:00',
              end_time TIME DEFAULT '18:00:00',
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(day_of_week)
            );`
    });
    console.log('   ✅ weekly_schedule_template table created');

    // 3. Create daily_availability table
    console.log('3. Creating daily_availability table...');
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS daily_availability (
              id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
              date DATE NOT NULL,
              available_slots INTEGER DEFAULT 5 CHECK (available_slots >= 0 AND available_slots <= 5),
              working_day BOOLEAN DEFAULT true,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(date)
            );`
    });
    console.log('   ✅ daily_availability table created');

    // 4. Enable RLS
    console.log('4. Enabling Row Level Security...');
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE daily_availability ENABLE ROW LEVEL SECURITY;
            ALTER TABLE weekly_schedule_template ENABLE ROW LEVEL SECURITY;`
    });
    console.log('   ✅ RLS enabled');

    // 5. Create RLS policies
    console.log('5. Creating RLS policies...');
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY IF NOT EXISTS "Admin can manage daily availability" ON daily_availability
              FOR ALL USING (
                  EXISTS (
                      SELECT 1 FROM users 
                      WHERE users.id = auth.uid() 
                      AND users.role = 'admin'
                  )
              );`
    });

    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY IF NOT EXISTS "Admin can manage weekly schedule" ON weekly_schedule_template
              FOR ALL USING (
                  EXISTS (
                      SELECT 1 FROM users 
                      WHERE users.id = auth.uid() 
                      AND users.role = 'admin'
                  )
              );`
    });
    console.log('   ✅ RLS policies created');

    // 6. Insert default schedule template
    console.log('6. Inserting default schedule template...');
    const { error: insertError } = await supabase
      .from('weekly_schedule_template')
      .upsert([
        { day_of_week: 1, working_day: true, max_slots: 5, start_time: '10:00:00', end_time: '18:00:00' },
        { day_of_week: 2, working_day: true, max_slots: 5, start_time: '10:00:00', end_time: '18:00:00' },
        { day_of_week: 3, working_day: true, max_slots: 5, start_time: '10:00:00', end_time: '18:00:00' },
        { day_of_week: 4, working_day: true, max_slots: 5, start_time: '10:00:00', end_time: '18:00:00' },
        { day_of_week: 5, working_day: true, max_slots: 5, start_time: '10:00:00', end_time: '18:00:00' },
        { day_of_week: 6, working_day: false, max_slots: 0, start_time: '10:00:00', end_time: '18:00:00' },
        { day_of_week: 0, working_day: false, max_slots: 0, start_time: '10:00:00', end_time: '18:00:00' }
      ], { onConflict: 'day_of_week' });

    if (insertError) throw insertError;
    console.log('   ✅ Default schedule template inserted');

    // 7. Update existing time_slots with slot numbers
    console.log('7. Updating existing time_slots with slot numbers...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE time_slots 
            SET slot_number = CASE 
                WHEN slot_time = '10:00:00' THEN 1
                WHEN slot_time = '11:30:00' THEN 2
                WHEN slot_time = '13:00:00' THEN 3
                WHEN slot_time = '14:30:00' THEN 4
                WHEN slot_time = '16:00:00' THEN 5
                ELSE slot_number
            END
            WHERE slot_number IS NULL;`
    });
    
    if (updateError) throw updateError;
    console.log('   ✅ Existing time_slots updated');

    console.log('\n🎉 Slot Formula System setup completed successfully!');

    // Verify setup
    console.log('\n🔍 Verifying setup...');
    
    const { data: templates } = await supabase
      .from('weekly_schedule_template')
      .select('day_of_week, working_day, max_slots');

    console.log(`   ✅ Weekly templates: ${templates?.length || 0} days configured`);

    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('slot_number')
      .not('slot_number', 'is', null)
      .limit(5);

    console.log(`   ✅ Time slots with numbers: ${timeSlots?.length || 0} found`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupSlotSystem();