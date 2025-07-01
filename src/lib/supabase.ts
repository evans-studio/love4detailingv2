import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Regular client for authenticated and anonymous users
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client with full access (for seeding, testing, and admin operations)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Helper to check if we're connected to production
export async function validateConnection() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    if (error) throw error;

    console.log(`✅ Connected to Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`Total users in DB: ${data?.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }
} 