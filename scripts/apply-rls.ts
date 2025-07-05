import { config } from 'dotenv';
import path from 'path';
import { supabaseAdmin } from '../src/lib/api/supabase';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function applyRLSPolicies() {
  console.log('Applying RLS policies...');

  if (!supabaseAdmin) {
    console.error('❌ Failed to initialize supabaseAdmin client');
    process.exit(1);
  }

  try {
    // Enable RLS on vehicles table
    await supabaseAdmin.rpc('enable_rls', { table_name: 'vehicles' });
    console.log('✅ Enabled RLS on vehicles table');

    // Drop existing policies
    await supabaseAdmin.rpc('drop_policy', { 
      table_name: 'vehicles',
      policy_name: 'Allow anonymous vehicle creation'
    });
    await supabaseAdmin.rpc('drop_policy', {
      table_name: 'vehicles',
      policy_name: 'Allow public read access to vehicles'
    });
    await supabaseAdmin.rpc('drop_policy', {
      table_name: 'vehicles',
      policy_name: 'Allow authenticated users to manage their vehicles'
    });
    console.log('✅ Dropped existing policies');

    // Create new policies
    const policies = [
      {
        name: 'Allow anonymous vehicle creation',
        definition: 'FOR INSERT TO public WITH CHECK (true)'
      },
      {
        name: 'Allow public read access to vehicles',
        definition: 'FOR SELECT TO public USING (true)'
      },
      {
        name: 'Allow authenticated users to manage their vehicles',
        definition: 'FOR ALL TO authenticated USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid() OR user_id IS NULL)'
      }
    ];

    for (const policy of policies) {
      await supabaseAdmin.rpc('create_policy', {
        table_name: 'vehicles',
        policy_name: policy.name,
        policy_definition: policy.definition
      });
      console.log(`✅ Created policy: ${policy.name}`);
    }

    console.log('\n✅ Successfully applied all RLS policies!\n');
  } catch (error) {
    console.error('❌ Failed to apply RLS policies:', error);
    process.exit(1);
  }
}

applyRLSPolicies(); 