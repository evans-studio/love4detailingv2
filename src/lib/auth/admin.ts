import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Client-side admin check
export async function checkAdminAccess(): Promise<boolean> {
  try {
    const supabase = createClientComponentClient<Database>();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return false;
    }

    // Check if user has admin role in database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return false;
    }

    return userProfile.role === 'admin';
  } catch (error) {
    console.error('Admin access check error:', error);
    return false;
  }
}

// Server-side admin check
export async function checkServerAdminAccess(userId: string): Promise<boolean> {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      return false;
    }

    return userProfile.role === 'admin';
  } catch (error) {
    console.error('Server admin access check error:', error);
    return false;
  }
}

// Get user role
export async function getUserRole(userId: string): Promise<'customer' | 'admin' | null> {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      return null;
    }

    return userProfile.role as 'customer' | 'admin';
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
}

// Update user role (admin only action)
export async function updateUserRole(adminUserId: string, targetUserId: string, newRole: 'customer' | 'admin'): Promise<boolean> {
  try {
    // First check if the admin user has permission
    const isAdmin = await checkServerAdminAccess(adminUserId);
    if (!isAdmin) {
      return false;
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', targetUserId);

    return !error;
  } catch (error) {
    console.error('Update user role error:', error);
    return false;
  }
}