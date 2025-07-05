import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

// For server-side operations with admin privileges
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// For client-side operations with session persistence
export const supabase = createClientComponentClient<Database>();

// For server-side operations (non-admin)
export const createServerClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

// Helper to check if we're connected to production
export async function validateConnection() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client is not initialized');
    }

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

// Helper to clear local session
export async function clearLocalSession() {
  try {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
    }
    return true;
  } catch (error) {
    console.error('Failed to clear local session:', error);
    return false;
  }
} 