#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying slot formula system migration...\n');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250705000003_slot_formula_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;
      
      try {
        console.log(`${i + 1}. Executing: ${statement.substring(0, 60)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // Some errors are expected (like table already exists)
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key value violates unique constraint')) {
            console.log(`   ⚠️  Warning (expected): ${error.message}`);
          } else {
            console.log(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ Exception: ${err}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Results:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Verify the migration by checking if tables exist
    console.log(`\n🔍 Verifying migration...`);
    
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('slot_number')
      .limit(1);

    const { data: templates, error: templatesError } = await supabase
      .from('weekly_schedule_template')
      .select('id')
      .limit(1);

    const { data: availability, error: availabilityError } = await supabase
      .from('daily_availability')
      .select('id')
      .limit(1);

    if (!timeSlotsError && !templatesError && !availabilityError) {
      console.log('✅ All tables accessible - migration successful!');
    } else {
      console.log('❌ Some tables still inaccessible:');
      if (timeSlotsError) console.log(`   - time_slots: ${timeSlotsError.message}`);
      if (templatesError) console.log(`   - weekly_schedule_template: ${templatesError.message}`);
      if (availabilityError) console.log(`   - daily_availability: ${availabilityError.message}`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();