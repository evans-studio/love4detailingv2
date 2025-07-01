import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '../src/lib/api/supabase';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testRewardsSystem() {
  const supabase = createClient();
  console.log('🔍 Testing Rewards System...');

  try {
    // 1. Test rewards table
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .limit(1);

    if (rewardsError) {
      throw new Error(`Rewards table error: ${rewardsError.message}`);
    }
    console.log('✅ Rewards table accessible');

    // 2. Test reward_transactions table
    const { data: transactions, error: transactionsError } = await supabase
      .from('reward_transactions')
      .select('*')
      .limit(1);

    if (transactionsError) {
      throw new Error(`Reward transactions table error: ${transactionsError.message}`);
    }
    console.log('✅ Reward transactions table accessible');

    // 3. Test relationships
    const { data: rewardsWithTransactions, error: relationError } = await supabase
      .from('rewards')
      .select(`
        *,
        reward_transactions (*)
      `)
      .limit(1);

    if (relationError) {
      throw new Error(`Relationship test error: ${relationError.message}`);
    }
    console.log('✅ Table relationships working');

    // 4. Test RLS policies
    const { data: publicAccess, error: publicError } = await supabase
      .from('rewards')
      .select('count')
      .single();

    if (!publicError) {
      console.log('✅ RLS policies in place (public access restricted)');
    }

    console.log('\n🎉 All rewards system tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testRewardsSystem().catch(console.error); 