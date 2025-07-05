'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User as UserType } from '@/types';

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (userId: string, data: { firstName?: string; lastName?: string; phone?: string; }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: { children: React.ReactNode; initialUser?: UserType | null }) {
  const [user, setUser] = useState<UserType | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const mapSupabaseUser = (supabaseUser: User | null): UserType | null => {
    if (!supabaseUser) return null;
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      firstName: supabaseUser.user_metadata?.first_name || '',
      lastName: supabaseUser.user_metadata?.last_name || '',
      phone: supabaseUser.user_metadata?.phone || null,
      createdAt: supabaseUser.created_at,
      updatedAt: supabaseUser.updated_at || supabaseUser.created_at
    };
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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://love4detailingv2.vercel.app'}/auth/callback`,
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

      if (error) {
        // Handle specific error types with better messages
        if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
          throw new Error('Email rate limit exceeded. Please wait a few minutes before requesting another password reset.');
        } else if (error.message?.includes('Error sending') || error.message?.includes('email')) {
          throw new Error('Email service temporarily unavailable. Please try again later or contact support.');
        }
        throw error;
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to reset password';
      setError(errorMessage);
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

      // Update local user state
      setUser(prev => prev ? {
        ...prev,
        firstName: data.firstName || prev.firstName,
        lastName: data.lastName || prev.lastName,
        phone: data.phone || prev.phone,
        updatedAt: new Date().toISOString()
      } : null);

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