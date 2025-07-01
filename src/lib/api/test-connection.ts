import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    // Test multiple tables to ensure comprehensive connectivity
    const tables = ['vehicle_sizes', 'rewards', 'reward_transactions'];
    const results = await Promise.all(
      tables.map(table => 
        supabase.from(table).select('count').single()
      )
    );

    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('❌ Some table connections failed:', errors);
      return false;
    }

    console.log('✅ Supabase connection successful for all tables!');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
} 