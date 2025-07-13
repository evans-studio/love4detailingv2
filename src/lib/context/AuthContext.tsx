'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (userId: string, data: { firstName?: string; lastName?: string; phone?: string; }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: { children: React.ReactNode; initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const mapSupabaseUser = (supabaseUser: User | null): User | null => {
    return supabaseUser;
  };

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        setError(null);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (mounted) {
          setUser(mapSupabaseUser(session?.user ?? null));
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to get auth session');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Only check session if we don't have an initial user
    if (!initialUser) {
      getInitialSession();
    }

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setUser(mapSupabaseUser(session?.user ?? null));
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialUser, supabase.auth]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign in');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign up');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign out');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app'}/auth/callback?type=recovery`,
      });

      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset password');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userId: string, data: { firstName?: string; lastName?: string; phone?: string; }) => {
    try {
      setError(null);
      setLoading(true);
      
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Profile updated in database - user state stays as is since Supabase User type is readonly

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 